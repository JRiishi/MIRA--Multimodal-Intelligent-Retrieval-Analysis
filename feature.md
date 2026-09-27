# 🪐 MIRA — Platform Features & Capabilities Reference

> **MIRA (Multimodal Intelligent Retrieval & Analysis)** is a comprehensive field media intelligence, automated spatial-semantic routing, and Cloudinary-powered transformation platform built for infrastructure, renewable energy, and environmental impact projects.

---

## 📋 Table of Contents
1. [Core AI & Multimodal Intelligence Pipeline](#1-core-ai--multimodal-intelligence-pipeline)
2. [Cloudinary Media Intelligence Backbone](#2-cloudinary-media-intelligence-backbone)
3. [Dual-Engine Hybrid Search](#3-dual-engine-hybrid-search)
4. [Visual Progression & Structural Change Analytics](#4-visual-progression--structural-change-analytics)
5. [Project Intelligence & Local LLM RAG Chatbot](#5-project-intelligence--local-llm-rag-chatbot)
6. [Automated Audit & Impact Report Generation](#6-automated-audit--impact-report-generation)
7. [Workspace & Human-in-the-Loop Media Triage](#7-workspace--human-in-the-loop-media-triage)
8. [Developer & Architecture Highlights](#8-developer--architecture-highlights)

---

## 1. Core AI & Multimodal Intelligence Pipeline

* **Local Vision-Language Processing (`vikhyatk/moondream2`)**:
  * Runs a 1.86B parameter VLM locally on CPU/GPU.
  * Automatically extracts granular scene descriptions, observed field activities, identified objects/machinery (e.g., excavators, solar panels, steam rollers), and domain signals in a single pass.
* **Non-Autoregressive Decision Routing (`convaiinnovations/laya`)**:
  * Evaluates extracted visual context against dynamic project criteria in a single forward pass (~33ms) using ModernBERT.
  * Calibrated decision thresholds:
    * $\ge 40\%$ confidence $\rightarrow$ **Auto-Assigned** to Project Workspace.
    * $28\% - 40\%$ confidence $\rightarrow$ Triaged to **Needs Review** queue.
    * $< 28\%$ confidence $\rightarrow$ Tagged as **Unassigned**.
* **Spatial Radius Geofencing (Haversine Distance Filter)**:
  * Automatically filters candidate projects within a geographic radius (default $\le 15\text{ km}$) using GPS coordinates before decision routing.
  * Prevents cross-region routing errors (e.g., distinguishing a road project in Delhi from one in Mumbai).
* **Automated EXIF & Manual GPS Geotagging**:
  * Extracts camera metadata (latitude, longitude, timestamp) directly from image EXIF headers upon upload.
  * Supports manual GPS coordinate overrides for legacy equipment or stripped metadata.
* **384-Dimensional Dense Vector Embedding (`all-MiniLM-L6-v2`)**:
  * Generates high-density semantic embeddings combining project name, visual description, detected objects, and location.
* **Vector Indexing (`Qdrant Vector DB`)**:
  * Sub-millisecond vector indexing with metadata payloads for instant semantic similarity lookup.

---

## 2. Cloudinary Media Intelligence Backbone

MIRA elevates Cloudinary from a standard media bucket into an **active Media Intelligence Layer**:

* **Bi-Directional Metadata Synchronization (`explicit()`)**:
  * Automatically syncs Moondream descriptions, detected activities, Laya routing confidence scores, project IDs, and GPS coordinates back into Cloudinary asset `context` and `tags`.
  * Makes raw assets discoverable and queryable directly within the Cloudinary Media Library without touching external databases.
* **Dynamic Verified Impact Provenance Badging (`l_text`)**:
  * Generates tamper-evident provenance overlays on-the-fly via delivery URLs.
  * Dynamically burns `MIRA VERIFIED IMPACT` badges, project attribution, and GPS coordinates (e.g., `GPS 28.61N 77.20E`) into CDN URLs with **zero server-side rendering**.
* **URL-Based Before / After Composite Generator**:
  * Merges baseline and latest milestone photos into a single side-by-side composite comparison (`w_1200,h_600/l_{after_id}/c_fill...`) directly in the Cloudinary delivery layer.
* **AI Focal-Point Smart Cropping (`g_auto, c_fill`)**:
  * Employs Cloudinary's AI gravity detection to center thumbnails and cards on key machinery, workers, and infrastructure subjects.
* **One-Click Multi-Aspect Campaign Exporter**:
  * Generates instant social and reporting media exports:
    * **1:1 Square** (`1080x1080`) — Instagram / LinkedIn impact posts.
    * **16:9 Landscape** (`1920x1080`) — Web hero & presentation slides.
    * **9:16 Vertical Story** (`1080x1920`) — Mobile stories & status updates.
* **Adaptive Bandwidth & Quality Optimization (`f_auto, q_auto`)**:
  * Automatically delivers Next-Gen formats (AVIF / WebP) with perceptual compression to minimize bandwidth.
* **Direct Authenticated Signed Uploads (`/api/media/upload/signature`)**:
  * Issues secure HMAC SHA-1 signed upload signatures, allowing client applications to upload directly to Cloudinary and bypassing server bandwidth bottlenecks.
* **Event-Driven Webhook Ingestion (`/api/media/webhook`)**:
  * Listens for Cloudinary upload notification webhooks to trigger downstream AI analysis automatically.
* **Automated Upload Presets (`/api/media/setup-preset`)**:
  * Configures field ingestion presets with auto-tagging (`mira_field`) and limit transformations.

---

## 3. Dual-Engine Hybrid Search

* **Merged Semantic & Expression Search**:
  * Combines the **Cloudinary Search API** (Boolean tag, folder, and contextual metadata expressions) with **Qdrant Vector DB** (MiniLM text embeddings).
* **Multi-Parameter Search Filters**:
  * Natural language query (e.g., *"excavator digging roadside trenches"*).
  * Project workspace filter.
  * Observed activity filter.
  * Geographic location filter.
  * Minimum similarity confidence threshold slider.
  * Custom Cloudinary Search expressions (e.g., `folder:cc_hack AND tags:solar*`).
* **Interactive Media Inspector Modal**:
  * Tabbed modal for deep asset inspection:
    * **Original & Optimized Delivery** preview.
    * **AI Visual Analysis Data** (activity, scene, objects, confidence).
    * **Verified Provenance Watermark** delivery URL.
    * **Multi-Aspect Export URLs** with one-click copy.

---

## 4. Visual Progression & Structural Change Analytics

* **Interactive Progression Split Slider**:
  * Dual-layer draggable slider in the Project Workspace revealing physical site transformations across milestones.
* **Three Comparison Viewing Modes**:
  1. **Interactive Slider**: Smooth split-screen drag interface.
  2. **Side-by-Side**: Dual milestone visual comparison.
  3. **Cloudinary Composite**: Pure multi-layer CDN composite image.
* **SSIM Structural Variation Analytics (`scikit-image`)**:
  * Computes Structural Similarity Index (SSIM) between baseline and latest observations.
  * Quantifies visual progression as a percentage variation score (e.g., *77% structural variation observed*).
* **Automated Chronological Milestones**:
  * Automatically orders field visual evidence chronologically to track site progression over time.

---

## 5. Project Intelligence & Local LLM RAG Chatbot

* **Local GPU-Accelerated LLM (`TinyLlama-1.1B-Chat-v1.0`)**:
  * Loaded locally in half-precision (`torch.float16`) on CUDA — runs completely offline with **zero external API costs**.
* **Strict Project-Isolated RAG (Retrieval-Augmented Generation)**:
  * Injects only verified visual observations, activities, dates, and locations belonging to the active project workspace into the LLM context.
  * Prevents cross-project information leakage and hallucinations.
* **Specialized Intelligence Directives**:
  * `STATUS`: Synthesizes current operational stage from latest verified visual evidence.
  * `RECENT_ACTIVITY`: Generates bulleted activity timelines of recent field operations.
  * `CHANGE`: Formulates structured before/after progression diffs.
  * `TIMELINE`: Chronological milestone breakdown.
  * `EVIDENCE_SEARCH`: Direct semantic lookup for machinery, equipment, or conditions.
  * `GREETING`: Natural, friendly conversational assistant responses.
* **Negative Query Verification**:
  * When asked about unrecorded operations (e.g., community development or educational programs on a road site), explicitly clarifies that no such records exist and summarizes actual recorded activities.
* **Context-Aware Visual Evidence Cards**:
  * Automatically attaches matching photographic evidence cards (with thumbnails, dates, and tags) below answers when media is searched or referenced.

---

## 6. Automated Audit & Impact Report Generation

* **One-Click Comprehensive Audit Reports (`/projects/{id}/report`)**:
  * Instant generation of structured impact reports containing:
    * Executive project summary & location metadata.
    * Verified operational status & recent activities.
    * Chronological milestone timeline.
    * Before & after structural progression summary with change metrics.
    * Traceable key photographic evidence attachments.
* **Rich Markdown Formatting**:
  * Clean, human-readable report formatting ready for executive review or stakeholder export.

---

## 7. Workspace & Human-in-the-Loop Media Triage

* **Dedicated Project Workspaces**:
  * Centralized management of project details, GPS coordinates, location names, and tagged field media.
* **Needs Review Triage Queue (`/media/needs-review`)**:
  * Catches ambiguous or low-confidence uploads for human inspection.
  * Interactive assignment modal allows manual routing to projects with single-click auto-sync to Cloudinary.
* **Intelligent Asynchronous Polling Engine (`useMediaLibrary`)**:
  * React Query polling engine monitors active processing transitions (`QUEUED` $\rightarrow$ `ANALYZING` $\rightarrow$ `ROUTING` $\rightarrow$ `INDEXING` $\rightarrow$ `READY`) every 3 seconds.
  * Automatically sleeps when all media processing completes, preserving client and network resources.
* **Media Management**:
  * Delete media assets with cascade cleanup across SQLite, Qdrant vector index, and local cache.

---

## 8. Developer & Architecture Highlights

| Layer | Technologies Used | Key Features |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4, TanStack Query v5, Lucide Icons | Responsive SaaS UI, dynamic polling, tabbed project detail views, rich markdown renderers |
| **Backend** | FastAPI, Python 3.11+, SQLAlchemy, BackgroundTasks, Uvicorn | Async background tasks, thread-safe database sessions, modular API routers |
| **AI / ML** | PyTorch, Transformers, Moondream2 (1.86B), Laya (421M), MiniLM-L6-v2, TinyLlama (1.1B), Scikit-Image | 100% local inference, CUDA FP16 GPU acceleration, singleton model memory management |
| **Data & Cloud** | Cloudinary Python SDK, Qdrant Vector DB, SQLite | `explicit()` metadata write-back, URL transformations, dual-engine hybrid search, spatial indexing |

---

## 📄 Summary for Pitch & Presentation

> *"MIRA does not treat Cloudinary as a simple image hosting bucket — Cloudinary is our active **Media Intelligence Backbone**. Every AI observation, GPS coordinate, and verification tag is synchronized back to Cloudinary, enabling dynamic URL-only watermark badging, multi-layer before/after composites, AI smart crops, and Boolean search without server rendering overhead."*
