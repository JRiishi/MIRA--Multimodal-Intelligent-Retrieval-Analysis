"""
diagnose_routing.py

Runs Moondream + the new semantic router against test images and prints
full score distributions for every project candidate.

Usage:
    python diagnose_routing.py

Add more test images to ../images/ to get a richer score distribution.
"""
import sys, json
sys.path.insert(0, '.')

from PIL import Image
from app.services.moondream_service import MoondreamService
from app.services.embedding_service import EmbeddingService
from app.services.project_router import ProjectRouter, build_evidence_text, build_project_text
from app.database import SessionLocal
from app.models.project import ProjectDB

import os
import numpy as np

# ── Load services once ────────────────────────────────────────────────
print("Loading Moondream...")
md = MoondreamService.get_instance()
print("Loading EmbeddingService...")
embed = EmbeddingService.get_instance()

# ── Load projects ─────────────────────────────────────────────────────
db = SessionLocal()
projects = db.query(ProjectDB).all()
db.close()

print(f"\n{'='*60}")
print(f"PROJECTS ({len(projects)} found):")
for p in projects:
    import json as _j
    tags = _j.loads(p.tags) if p.tags else []
    print(f"  [{p.id[:8]}...] {p.name}")
    print(f"    Description: {p.description}")
    print(f"    Tags: {tags}")
    print(f"    Router text: {build_project_text(p)[:120]}")
print(f"{'='*60}\n")

# Pre-compute project embeddings
proj_vectors = {}
for p in projects:
    proj_vectors[p.id] = np.array(embed.get_embedding(build_project_text(p)))

# ── Image directory ───────────────────────────────────────────────────
IMG_DIR = os.path.join(os.path.dirname(__file__), '..', 'images')
image_files = [
    os.path.join(IMG_DIR, f)
    for f in sorted(os.listdir(IMG_DIR))
    if f.lower().endswith(('.jpg', '.jpeg', '.png'))
]

if not image_files:
    print("No images found in ../images/. Add test images and re-run.")
    sys.exit(1)

print(f"Found {len(image_files)} test images.\n")

# ── Score tracking ────────────────────────────────────────────────────
all_scores = []  # list of (image_file, best_project_name, best_score, status)

for img_path in image_files:
    img_name = os.path.basename(img_path)
    print(f"\n{'-'*60}")
    print(f"IMAGE: {img_name}")

    try:
        image = Image.open(img_path).convert('RGB')
        md_out = md.analyze_image(image)
    except Exception as e:
        print(f"  ERROR processing image: {e}")
        continue

    print(f"  MOONDREAM OUTPUT:")
    print(f"    description:     {md_out.get('description', '')}")
    print(f"    activity:        {md_out.get('activity', '')}")
    print(f"    scene:           {md_out.get('scene', '')}")
    print(f"    objects:         {md_out.get('objects', [])}")
    print(f"    project_signals: {md_out.get('project_signals', [])}")

    ev_text = build_evidence_text(md_out)
    print(f"  EVIDENCE TEXT: {ev_text[:200]}")

    ev_vec = np.array(embed.get_embedding(ev_text))

    print(f"  SCORES:")
    best_score = -1.0
    best_name = None
    scores_row = {}
    for p in projects:
        pv = proj_vectors[p.id]
        n_ev = np.linalg.norm(ev_vec)
        n_pv = np.linalg.norm(pv)
        score = float(np.dot(ev_vec, pv) / (n_ev * n_pv)) if n_ev > 0 and n_pv > 0 else 0.0
        scores_row[p.name] = round(score, 4)
        print(f"    {p.name:<35} → {score:.4f}")
        if score > best_score:
            best_score = score
            best_name = p.name

    # Simulate routing result using current thresholds
    result = ProjectRouter.route_evidence("diag", md_out, projects, embed_service=embed)
    print(f"  ROUTING RESULT: status={result.status.value}  project={best_name}  confidence={result.confidence}")

    all_scores.append({
        "image": img_name,
        "best_project": best_name,
        "best_score": best_score,
        "status": result.status.value,
        "scores": scores_row
    })

# ── Summary ───────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print("SCORE DISTRIBUTION SUMMARY")
print(f"{'='*60}")
print(f"{'Image':<30} {'Best Project':<25} {'Score':>7}  Status")
print(f"{'-'*75}")
for row in all_scores:
    print(f"{row['image']:<30} {row['best_project']:<25} {row['best_score']:>7.4f}  {row['status']}")

scores_only = [r['best_score'] for r in all_scores]
if scores_only:
    print(f"\nBest-score statistics across {len(scores_only)} images:")
    print(f"  Min:    {min(scores_only):.4f}")
    print(f"  Max:    {max(scores_only):.4f}")
    print(f"  Mean:   {np.mean(scores_only):.4f}")
    print(f"  Median: {np.median(scores_only):.4f}")

print(f"\nCurrent thresholds: ASSIGN={ProjectRouter.ASSIGN_THRESHOLD}, REVIEW={ProjectRouter.REVIEW_THRESHOLD}")
print("Adjust ProjectRouter.ASSIGN_THRESHOLD and REVIEW_THRESHOLD after reviewing the distribution above.")
