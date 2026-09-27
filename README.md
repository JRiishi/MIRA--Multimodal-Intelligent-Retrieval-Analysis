# 🪐 MIRA — Multimodal Intelligent Retrieval & Analysis

> **AI-Powered Field Media Intelligence, Semantic Routing & Cloudinary Transformation Platform**  
> *Built for Code Cubicle 6.0 — PS02 & Cloudinary Track*

---

## 🚀 Overview

Field teams across sustainability, infrastructure, and renewable energy capture hundreds of photos and videos daily. Manually reviewing, tagging, organizing, and linking media to projects is slow, error-prone, and unscalable.

**MIRA** transforms Cloudinary from a standard media bucket into an **active Media Intelligence Backbone**, automating the entire field asset lifecycle with zero cloud-compute overhead:

1. **Field Ingestion & Webhooks**: Ingest raw field captures directly via authenticated signed upload presets or event-driven Cloudinary webhooks with automatic EXIF GPS extraction.
2. **Geographic Radius Candidate Filter**: Uses Haversine distance calculations to narrow down candidate projects within radius (default 15 km) before routing decisions.
3. **Visual Intelligence (Moondream2 VLM)**: Extracts natural language descriptions, site activities, scenes, detected machinery, and domain signals locally.
4. **Automated Project Routing (Laya Engine)**: Non-autoregressive System 1 decision engine categorizes media into geographically-filtered projects in a single forward pass (~33ms) with zero hallucination.
5. **Cloudinary Intelligence Write-Back (`explicit()`)**: Synchronizes AI descriptions, activity tags, GPS data, and verification statuses directly into Cloudinary asset `context` and `tags`.
6. **Dual-Engine Hybrid Search**: Merges **Cloudinary Search API** Boolean tag/expression filters with **Qdrant Vector DB** semantic similarity.
7. **Visual Progression & Before/After Slider**: Dynamic side-by-side progression slider with SSIM visual variation scores and pure Cloudinary composite URLs.
8. **Dynamic Verified Provenance Badging**: Bakes verified status, project attribution, and GPS metadata into delivery URLs with zero backend image rendering.
9. **Project Intelligence Assistant (Local LLM RAG)**: Powered by a local GPU-accelerated LLM (`TinyLlama-1.1B`), delivering evidence-grounded Q&A, milestone timelines, and structured audit reports.

---

## 🛠️ Architecture & Pipeline

```mermaid
graph TD
    A["Field Media Upload"] -->|"POST /media/process or Webhook"| B["FastAPI Server"]
    B -->|"Upload & Extract EXIF"| C["Cloudinary CDN & GPS"]
    C -->|"Radius Filter (<= 15km)"| D["Geo-Filtered Project Candidates"]
    B -->|"Visual Analysis"| E["Moondream2 VLM"]
    E -->|"Visual Context & Signals"| F["Laya Decision Engine"]
    D -->|"Candidate Project Criteria"| F
    F -->|"Confidence >= 40%"| G["ASSIGNED to Project"]
    F -->|"Confidence 28% - 40%"| H["NEEDS_REVIEW Queue"]
    F -->|"Confidence < 28%"| I["UNASSIGNED"]
    G -->|"Metadata Write-Back explicit()"| C
    G -->|"MiniLM Embeddings"| J["Qdrant Vector DB"]
    G -->|"Store DB Records"| K[("SQLite DB")]
    K -->|"RAG Grounding"| L["TinyLlama 1.1B Local LLM"]
    K -->|"Live Polling & UI"| M["React + Vite Frontend"]
    L -->|"Project Chat & Audit Reports"| M
```

---

## 🧠 AI / ML Stack (100% Local Inference & Offline Capable)

| Component | Model / Engine | Purpose | Speed / Footprint |
| :--- | :--- | :--- | :--- |
| **Visual Analysis** | `vikhyatk/moondream2` | Extracts descriptions, activities, scenes, objects, and signals | 1.86B VLM (~1.5GB) |
| **Decision Routing** | `convaiinnovations/laya` | Non-autoregressive System 1 classifier against dynamic project criteria | 421M ModernBERT (~33ms) |
| **Semantic Embeddings**| `all-MiniLM-L6-v2` | Computes 384-d dense embeddings for semantic search & similarity | ~10ms, 80MB |
| **Vector Database** | `Qdrant` | Vector similarity search with metadata filtering (in-memory or remote) | Cosine Distance |
| **Project Intelligence LLM** | `TinyLlama-1.1B-Chat` | Generates evidence-grounded answers, status summaries, and audit reports | FP16 CUDA (~1.2s) |
| **Structural Change (SSIM)** | `scikit-image` | Computes visual variation between baseline and current stage | ~50ms |

---

## ☁️ Cloudinary Media Intelligence Features

MIRA utilizes Cloudinary's media layer for computational intelligence and delivery optimization:

- ✅ **Contextual & Tag Metadata Sync (`explicit()`)**: Writes AI visual descriptions, detected activities, GPS coordinates, and Laya confidence scores directly to Cloudinary.
- ✅ **Dynamic Provenance Badge (`l_text`)**: Generates verifiable badge overlays (`MIRA VERIFIED IMPACT | GPS 28.61N 77.20E`) on-the-fly via URL transformations.
- ✅ **Dynamic Before/After Composites**: Generates multi-layer split comparison images (`w_1200,h_600/l_...`) directly from CDN delivery URLs without server-side image processing.
- ✅ **AI Focal-Point Smart Cropping (`g_auto, c_fill`)**: Automatically detects subject matter to generate thumbnails and cards.
- ✅ **Multi-Aspect Campaign Exporter**: Instant social and report exports in 1:1 Square, 16:9 Landscape, and 9:16 Vertical Story formats.
- ✅ **Adaptive Format & Quality (`f_auto, q_auto`)**: Delivers AVIF/WebP formats with perceptual compression.
- ✅ **Direct Signed Uploads & Presets**: Authenticated HMAC signatures and presets (`mira_field_upload`) allow direct client-to-Cloudinary uploads.
- ✅ **Event-Driven Webhook (`/media/webhook`)**: Automated asynchronous pipeline triggers upon asset upload completion.

---

## 📂 Repository Structure

```text
├── backend/
│   ├── app/
│   │   ├── api/               # API routes (media, projects, search, chat)
│   │   ├── core/              # Config & settings
│   │   ├── models/            # SQLAlchemy database models
│   │   ├── schemas/           # Pydantic validation schemas
│   │   └── services/          # Core services (Moondream, Laya, Qdrant, Cloudinary, Chat, SSIM)
│   ├── requirements.txt       # Python backend dependencies
│   ├── .env.example           # Environment template
│   └── test_project_intelligence.py # Intelligence & Chat test suite
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components & layouts
│   │   ├── hooks/             # TanStack Query data hooks
│   │   ├── pages/             # Dashboard, Projects, MediaLibrary, Search, ProjectDetail
│   │   └── types/             # Strict TypeScript interfaces
│   ├── package.json           # Frontend dependencies (React, Vite, Tailwind v4)
│   └── vite.config.ts         # Vite bundler configuration
├── images/                    # Sample test field images (solar, road, water)
├── architecture.md            # Comprehensive architectural documentation
└── README.md                  # Project overview and guide
```

---

## ⚡ Quickstart Guide

### 1. Prerequisites
- **Python 3.10+** (Python 3.11/3.12 recommended, CUDA optional for GPU acceleration)
- **Node.js 18+** & `npm`
- **Cloudinary Account** (Free tier credentials)

---

### 2. Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate virtual environment
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
# Edit .env with your Cloudinary credentials:
# CLOUDINARY_CLOUD_NAME=your_cloud_name
# CLOUDINARY_API_KEY=your_api_key
# CLOUDINARY_API_SECRET=your_api_secret

# 5. Start the backend server
uvicorn app.main:app --reload --port 8000
```

* Backend API: `http://localhost:8000`
* Interactive API Documentation: `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
# 1. In a new terminal, navigate to frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Start development server
npm run dev
```

* Frontend Dashboard: `http://localhost:5173`

---

## 🧪 Testing

Run the automated test suites from the `backend/` directory:

```bash
# 1. Test Project Intelligence, RAG Chat & Isolation
python test_project_intelligence.py

# 2. Test Cloudinary Dynamic Transformations & Metadata Sync
python test_cloudinary_integration.py
```

---

## 📡 Key API Endpoints

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Media & Pipeline** | `POST` | `/media/process` | Upload field photo and trigger AI processing pipeline |
| | `GET` | `/media/` | List all assets (supports `?project_id=...` filter) |
| | `GET` | `/media/needs-review` | List unassigned / ambiguous assets requiring human review |
| | `POST` | `/media/{asset_id}/assign` | Manually assign an asset to a project workspace |
| | `GET` | `/media/{asset_id}/transformations` | Get optimized, thumbnail, badge, and campaign aspect URLs |
| | `GET` | `/media/upload/signature` | Generate authenticated signature for direct client uploads |
| | `POST` | `/media/webhook` | Event-driven Cloudinary upload webhook receiver |
| | `POST` | `/media/sync-all-metadata` | Sync AI descriptions and tags back to Cloudinary via `explicit()` |
| **Projects** | `GET` | `/projects/` | List all project workspaces |
| | `POST` | `/projects/` | Create a new project workspace |
| | `GET` | `/projects/{id}` | Get project workspace details, timeline & assets |
| **Search** | `GET` / `POST` | `/search/` | Hybrid search combining Cloudinary expressions + Qdrant vectors |
| **AI Intelligence** | `POST` | `/projects/{id}/chat` | Grounded local LLM project chat assistant |
| | `GET` | `/projects/{id}/chat/history` | Fetch project-isolated chat conversation history |
| | `GET` | `/projects/{id}/report` | Generate structured project impact & audit report |

---

## 📄 License
Apache-2.0 License. Built for Code Cubicle 6.0.
