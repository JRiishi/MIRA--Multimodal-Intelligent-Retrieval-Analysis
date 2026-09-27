Good — I have the full picture: current state (~30%), the PS, the Cloudinary free tier, and the architecture. Here's the concise, winning hackathon strategy:

---

## MIRA — Winning Hackathon Blueprint

### Reality check on current state
Strong local AI core (Moondream2 → Laya → Qdrant → React polling). Cloudinary is a **dumb CDN** right now. The gap between 30% and a winning submission is exactly: **making Cloudinary the intelligence backbone**, not just storage. Judges and sponsors want to see deep Cloudinary integration — that's what wins.

---

### The 3 moves that win this

**1. Cloudinary becomes the media brain, not just a bucket**

Right now: `uploader.upload()` → get URL → done.

What you need to ship:

```python
# After Moondream analysis, one explicit() call writes everything back to Cloudinary
cloudinary.uploader.explicit(public_id, type="upload",
  context={
    "moondream_desc": evidence.description,
    "activity": evidence.activity,
    "laya_confidence": str(routing_confidence),
    "mira_status": "verified"
  },
  metadata={
    "project_id": project_id,
    "impact_category": "solar",       # enum field
    "gps_lat": str(lat),
    "gps_lon": str(lon),
    "verification_status": "approved"
  },
  tags=["verified", "solar", "2026_q3"]
)
```

This makes every asset **discoverable, searchable, and queryable** purely from Cloudinary — which is exactly what the sponsor wants to see.

---

**2. Ship the 3 flagship demo moments**

These are the scenes that win over judges in a 3-min demo:

**Scene A — Before/After slider (visual proof of impact)**

```python
# No image processing server needed — pure Cloudinary URL
composite_url = f"https://res.cloudinary.com/{cloud}/image/upload/w_1200,h_600,c_fill/l_{after_public_id},w_600,h_600,fl_layer_apply,x_600/{before_public_id}"
```

Wire this to `react-compare-slider` on ProjectDetail. Two Cloudinary URLs, zero backend work, instant wow factor.

**Scene B — Verified impact card with GPS/timestamp stamp**

```
/image/upload/l_text:Arial_18_bold:MIRA%20Verified,g_south_west,co_white,x_10,y_10/l_text:Arial_14:GPS%2028.6N%2077.2E,g_south_west,co_white,x_10,y_35/f_auto,q_auto/{public_id}
```

Show this on NeedsReview → Approve flow. The verification badge burns into the delivery URL — provenance baked into the CDN layer.

**Scene C — Hybrid search**

```python
# Cloudinary handles metadata/tag filter — Qdrant handles semantic depth
cld_ids = cloudinary_search(f"tags:{tag} AND metadata.project_id={pid} AND metadata.verification_status=approved")
qdrant_results = qdrant.search(embed(nl_query), filter={"project_id": pid})
merged = merge_by_asset_id(cld_ids, qdrant_results)
```

The current search page only has Qdrant. Adding the Cloudinary expression layer takes ~30 lines and makes it visually compelling to explain in the demo.

---

**3. Upload preset + webhook (bypass FastAPI bandwidth, unlock auto-tagging)**

```python
# One-time setup — call this in a seed script
cloudinary.api.create_upload_preset(
  name="mira_field_upload",
  folder="mira/{{project_id}}",
  unsigned=False,
  tags=["field", "raw"],
  transformation=[{"width": 4000, "height": 4000, "crop": "limit", "quality": "auto:good"}],
  metadata="project_id=unassigned|impact_category=pending",
  notification_url="https://your-backend.com/media/webhook"
)
```

Webhook hits `/media/register` with `public_id` — your pipeline picks up from there. This means: client uploads directly to Cloudinary (zero server bandwidth), EXIF extracted automatically, and the processing pipeline is decoupled.

---

### Minimal DB additions needed (don't over-engineer)

```sql
-- Add to existing MediaAssets
ALTER TABLE media_assets ADD COLUMN original_public_id TEXT;
ALTER TABLE media_assets ADD COLUMN cloudinary_metadata_synced BOOLEAN DEFAULT FALSE;

-- New table (critical for demo)
CREATE TABLE comparison_pairs (
  id TEXT PRIMARY KEY,
  before_asset_id TEXT REFERENCES media_assets(id),
  after_asset_id TEXT REFERENCES media_assets(id),
  project_id TEXT,
  composite_public_id TEXT,   -- Cloudinary URL for the composite
  change_score FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

That's it. Don't add ImpactReports or Transformations tables for the hackathon — keep scope tight.

---

### Exact priority order for the remaining build time

| Priority | Task | Time | Sponsor Impact |
|---|---|---|---|
| 🔴 P0 | `explicit()` metadata write-back after Moondream | 2h | Cloudinary = brain, not bucket |
| 🔴 P0 | Before/After composite URL + `react-compare-slider` | 3h | Biggest visual wow |
| 🔴 P0 | Cloudinary Search API hybrid layer in `/search/evidence` | 2h | Showcases Search API |
| 🟡 P1 | Upload preset + signed upload from frontend | 3h | Architecture best practice |
| 🟡 P1 | GPS/timestamp verification badge overlay URL | 1h | Provenance = PS requirement |
| 🟡 P1 | Campaign export: multi-aspect URLs (1:1, 16:9, 9:16) | 1h | Reports page, easy win |
| 🟢 P2 | Credit usage guard middleware | 1h | Shows free-tier awareness |
| 🟢 P2 | `f_auto,q_auto` on all delivery URLs | 0.5h | Bandwidth optimization |

**Total: ~14h of focused work = submission-ready.**

---

### Free tier Cloudinary features to explicitly call out in your README/demo

Check these off so judges see deliberate, comprehensive use:

- ✅ **Structured Metadata API** — typed fields on every asset
- ✅ **Contextual Metadata** — free-form Moondream/Laya output stored in Cloudinary
- ✅ **Search API** — Boolean expression queries over tags + metadata
- ✅ **Dynamic Transformations** — composites, overlays, aspect crops — all URL-only (zero storage credits)
- ✅ **`f_auto, q_auto`** — adaptive format/compression
- ✅ **`g_auto` smart crop** — AI focal point for thumbnails
- ✅ **Upload Presets** — automated ingestion pipeline
- ✅ **EXIF extraction** — GPS/timestamp parsed on upload
- ✅ **Asset versioning** — provenance via `v` parameter
- ✅ **Signed uploads** — authenticated field team ingestion
- ✅ **Webhook/notification_url** — event-driven pipeline trigger

The frame to use when presenting: *"Cloudinary isn't our CDN — it's our media intelligence layer. Every transformation, tag, and metadata field is queryable. The raw asset is immutable; everything derived from it is a URL."* That's exactly what Cloudinary's team wants to hear.

---

### One thing that kills hackathon entries: scope creep

Don't build: auth, multi-tenancy, Celery, Postgres migration, PDF export, or the full reports page. Focus all remaining time on the 3 demo scenes above — a polished 3-minute story beats a sprawling half-finished feature list every time.
