# Code Cubicle 6.0 — PS02: AI-Powered Media Platform Architecture

This document provides a comprehensive, deep-dive architectural overview of the entire system, detailing the end-to-end media pipeline, backend services, frontend application structure, and data flows.

## 1. System Overview & Core Technologies

The platform is designed as an intelligent media routing and semantic search engine. When a user uploads field media (images from construction sites, nature reserves, public infrastructure, etc.), the AI automatically analyzes the visual context, routes it to the correct project workspace, extracts searchable semantic evidence, and makes it available via a lightning-fast React frontend.

### Tech Stack
*   **Frontend**: React 18, TypeScript, Vite, Tailwind CSS V4, TanStack React Query v5, Lucide Icons.
*   **Backend**: Python, FastAPI, SQLAlchemy (SQLite), BackgroundTasks.
*   **AI / ML**: HuggingFace `transformers` (v5.17.0), `vikhyatk/moondream2` (Vision-Language Model), `laya` (System 1 Non-Autoregressive Decision Engine), `sentence-transformers` (`all-MiniLM-L6-v2`).
*   **Infrastructure / Data**: Cloudinary (Image Hosting), Qdrant (Vector Database).

---

## 2. The Media Processing Pipeline (End-to-End)

The core innovation of this platform is the **Asynchronous AI Media Pipeline**. 

When a user uploads an image via the frontend `MediaLibrary`, the following automated sequence occurs:

1.  **Frontend Dispatch (`POST /media/process`)**
    *   The frontend uploads the file using `multipart/form-data`.
    *   The backend immediately creates a pending `MediaAssetDB` record with a status of `QUEUED`.
    *   FastAPI dispatches the heavy-lifting logic to a `fastapi.BackgroundTasks` worker thread.
    *   The backend immediately returns `200 OK` with the `asset_id` so the frontend can begin polling.
2.  **Asset Hosting (Cloudinary)**
    *   Status shifts to `UPLOADING`.
    *   The image binary is securely streamed to Cloudinary via `CloudinaryService.upload_image()`.
    *   A permanent `cloudinary_url` is obtained and saved to the database.
3.  **Vision-Language Analysis (Moondream2)**
    *   Status shifts to `ANALYZING`.
    *   The `MoondreamService` (running as an in-memory Singleton to prevent reloading the 1.5GB model on every request) encodes the image.
    *   The VLM is prompted to extract a strict JSON structure containing: `description`, `activity`, `scene`, `objects`, and `project_signals`.
4.  **Semantic Routing Engine (Laya Decision Engine)**
    *   Status shifts to `ROUTING`.
    *   The `ProjectRouter` delegates to `LayaService` using the `laya` non-autoregressive decision model (`convaiinnovations/laya` ModernBERT).
    *   The model evaluates the visual description and visible context against all candidate project criteria in a single forward pass (~33ms), outputting calibrated probabilities without LLM hallucinations.
    *   Categorization mapping: $\ge 40\%$ probability $\rightarrow$ `ASSIGNED`, $28\% - 40\%$ $\rightarrow$ `NEEDS_REVIEW`, $< 28\%$ $\rightarrow$ `UNASSIGNED`.
    *   Seamless fallback to `sentence-transformers` embedding cosine similarity is available if toggled (`USE_LAYA = False`).
5.  **Vector Indexing (Qdrant)**
    *   Status shifts to `INDEXING`.
    *   The `EvidenceService` builds a final comprehensive JSON object.
    *   The `EmbeddingService` generates a 384-dimensional dense vector representing the visual evidence.
    *   The vector and its metadata payload are pushed into the local Qdrant instance for immediate semantic search availability.
6.  **Finalization**
    *   Status shifts to `READY`.
    *   The frontend polling hook catches the `READY` state, stops polling, and instantly renders the fully contextualized image with its newly assigned Project tag.

---

## 3. Backend Architecture (FastAPI)

The backend is modularized to strictly separate API transport, database modeling, and heavy ML service execution.

### Directory Structure
```text
backend/
├── app/
│   ├── api/                 # API Routers (media.py, projects.py, search.py)
│   ├── models/              # SQLAlchemy ORM Models (media.py, project.py)
│   ├── schemas/             # Pydantic validation schemas
│   ├── services/            # Core Business & ML Logic
│   │   ├── cloudinary_service.py
│   │   ├── embedding_service.py # sentence-transformers (Singleton)
│   │   ├── evidence_service.py
│   │   ├── moondream_service.py # Vision Language Model (Singleton)
│   │   ├── project_router.py    # Auto-routing logic
│   │   └── qdrant_service.py    # Vector DB interface
│   ├── database.py          # SQLite engine & SessionLocal
│   └── main.py              # FastAPI application & CORS config
```

### Key Design Decisions
*   **Singleton ML Models**: Both `moondream_service` and `embedding_service` use a Singleton pattern (`_instance`). This ensures the massive PyTorch models are loaded onto the CPU/GPU exactly once when the server boots, reducing per-request latency from ~10 seconds to under 2 seconds.
*   **Isolated Database Sessions**: Because background tasks run in separate threads from the primary HTTP requests, the `background_process_media` function manually instantiates its own `SessionLocal()`. This completely prevents `ObjectDeletedError` and SQLite thread-safety violations.
*   **Graceful AI Failure**: If Moondream fails to output valid JSON, the backend utilizes regex fallback parsing, ensuring the pipeline doesn't crash on bad LLM formatting.

---

## 4. Frontend Architecture (React + Vite)

The frontend acts as a pristine, highly-responsive state machine that reacts to the asynchronous AI pipeline.

### Directory Structure
```text
frontend/
├── src/
│   ├── components/
│   │   └── layout/          # AppLayout, Sidebar
│   ├── hooks/               # TanStack React Query Hooks
│   │   ├── media.ts         # Polling logic, mutations
│   │   ├── projects.ts      # Fetching project workspaces
│   │   └── search.ts        # Semantic search queries
│   ├── pages/               # Route Components
│   │   ├── Dashboard.tsx
│   │   ├── MediaLibrary.tsx # Polling grid UI
│   │   ├── ProjectDetail.tsx# Project-specific evidence
│   │   ├── Projects.tsx     # Project creation & listing
│   │   └── Search.tsx       # AI Semantic Search UI
│   ├── services/
│   │   └── api.ts           # Axios base client
│   ├── types/               # Strict TypeScript interfaces
│   ├── App.tsx              # React Router setup
│   └── index.css            # Tailwind V4 core imports
```

### Key Design Decisions
*   **Intelligent UI Polling**: The `useMediaLibrary` hook dynamically polls the backend *only* when necessary. It checks if any asset in the cache has a status other than `READY` or `FAILED`. If processing is occurring, it silently refetches every 3000ms. Once all assets are done, polling completely shuts down to save bandwidth.
*   **Tailwind CSS V4**: Utilizes the modern `@tailwindcss/postcss` architecture, eliminating massive config files in favor of native CSS variable design tokens.
*   **Optimistic UI Updates**: While the UI doesn't strictly fake data, it relies on instant React Query invalidation so that the moment a user hits "Upload" or "Create Project", the UI snaps into a loading state without waiting for full page re-renders.
*   **Design System**: Prioritizes an enterprise "SaaS" aesthetic (clean typography, subtle borders, `Lucide` iconography, and muted grays/blues) over flashy neon colors to establish trust in the AI's data.

---

## 5. Database & Vector Schemas

### Relational Schema (SQLite)
*   **ProjectDB**: `id`, `name`, `description`, `tags`, `created_at`
*   **MediaAssetDB**: `id`, `cloudinary_url`, `project_id` (Foreign Key), `processing_status` (Enum), `error_message`, `mime_type`
*   **VisualEvidenceDB**: Extracted Moondream attributes (`description`, `activity`, `scene`, `objects`) tied to the `asset_id`.

### Vector Schema (Qdrant)
*   **Collection Name**: `visual_evidence`
*   **Vector Size**: `384` (Using `all-MiniLM-L6-v2`)
*   **Distance Metric**: Cosine Similarity
*   **Payload**: The exact JSON metadata of the `VisualEvidenceDB`, allowing the search page to immediately render UI cards without requiring an expensive secondary SQL JOIN after retrieving vector matches.
