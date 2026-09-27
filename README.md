# 🪐 MIRA — Multimodal Intelligent Retrieval & Analysis

> **AI-Powered Field Media Intelligence, Semantic Routing & Retrieval Platform**  
> *Built for Code Cubicle 6.0 — PS02*

---

## 🚀 Overview

Field teams across sustainability, infrastructure, and renewable energy capture hundreds of photos and videos daily. Manually reviewing, tagging, organizing, and linking media to projects is slow, error-prone, and unscalable.

This platform automates the entire lifecycle:
1. **Field Ingestion**: Upload raw images from field sites with automatic EXIF GPS extraction.
2. **Geographic Radius Candidate Filter**: Uses Haversine distance calculations to narrow down candidate projects within radius (default 15 km) before decision routing.
3. **Visual Intelligence (Moondream2)**: Extracts descriptions, activities, scenes, detected objects, and domain signals locally.
4. **Automated Project Routing (Laya)**: Uses a fast, non-autoregressive System 1 decision engine to categorize media into geographically-filtered projects in a single forward pass (~33ms) with zero hallucination.
5. **Vector Search (Qdrant + Sentence-Transformers)**: Embeds visual intelligence into 384-dimensional vectors for natural language search.
6. **Modern Dashboard**: High-performance React UI with live status polling, project workspaces, geo-location badges, before/after comparisons, and media management.

---

## 🛠️ Architecture & Pipeline

```mermaid
graph TD
    A[Field Media Upload] -->|POST /media/process| B(FastAPI Server)
    B -->|Async Task| C[Cloudinary CDN]
    B -->|Extract EXIF GPS| D[Location Service]
    D -->|Haversine Filter (<= 15km)| E[Geo-Filtered Project Candidates]
    B -->|Visual Analysis| F[Moondream2 VLM]
    F -->|Extracted Visual Signals| G[Laya Decision Engine]
    E -->|Filtered Project Criteria| G
    G -->|Route & Score| H{Confidence Check}
    H -->|>= 40%| I[ASSIGNED to Project]
    H -->|28% - 40%| J[NEEDS_REVIEW]
    H -->|< 28%| K[UNASSIGNED]
    I & J -->|Generate Vector| L[all-MiniLM-L6-v2]
    L -->|Upsert Point with GPS| M[(Qdrant Vector DB)]
    B -->|Persist Metadata & Location| N[(SQLite DB)]
    N -->|Live Polling & UI| O[React + Vite Frontend]
```

### 🧠 AI / ML Stack (100% Local Inference)

| Component | Model / Engine | Purpose | Speed / Footprint |
| :--- | :--- | :--- | :--- |
| **Visual Analysis** | `vikhyatk/moondream2` | Extracts descriptions, activities, scenes, objects, and signals | 1.86B VLM (~1.5GB) |
| **Decision Routing** | `convaiinnovations/laya` | Non-autoregressive System 1 classifier against dynamic project criteria | 421M ModernBERT (~33ms) |
| **Semantic Embeddings**| `all-MiniLM-L6-v2` | Computes 384-d dense embeddings for semantic search & similarity | ~10ms, 80MB |
| **Vector Store** | `Qdrant` | Vector similarity search with metadata filtering (in-memory or remote) | Cosine Distance |

---

## 📂 Repository Structure

```text
├── backend/
│   ├── app/
│   │   ├── api/               # API routes (media, projects, search)
│   │   ├── core/              # Config & settings
│   │   ├── models/            # SQLAlchemy database models
│   │   ├── schemas/           # Pydantic validation schemas
│   │   └── services/          # AI services (Moondream, Laya, Qdrant, Cloudinary)
│   ├── requirements.txt       # Python backend dependencies
│   ├── .env.example           # Environment template
│   └── test_e2e.py            # End-to-end pipeline test script
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components & layouts
│   │   ├── hooks/             # TanStack Query data hooks
│   │   ├── pages/             # Project, Media, Search, and Detail views
│   │   └── types/             # TypeScript type definitions
│   ├── package.json           # Frontend dependencies (React, Vite, Tailwind v4)
│   └── vite.config.ts         # Vite bundler configuration
├── images/                    # Sample test field images (solar, water, road)
├── architecture.md            # In-depth architectural documentation
└── README.md                  # Project overview and setup guide
```

---

## ⚡ Quickstart Guide

### 1. Prerequisites
- **Python 3.10+** (Python 3.11/3.12 recommended)
- **Node.js 18+** & `npm`
- **Cloudinary Account** (Free tier for media hosting)

---

### 2. Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. (Optional) Create and activate virtual environment
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

The backend will be live at `http://localhost:8000`.  
Swagger API Docs available at: `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
# 1. Open a new terminal and navigate to frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Start development server
npm run dev
```

The frontend will be live at `http://localhost:5173`.

---

## 🧪 Testing the Pipeline

You can run the automated end-to-end test script from the `backend/` directory:

```bash
cd backend
python test_e2e.py
```

This will:
1. Upload a sample test image (`../images/solar_01.jpg`) to the API.
2. Track background status transitions (`QUEUED` $\rightarrow$ `ANALYZING` $\rightarrow$ `ROUTING` $\rightarrow$ `INDEXING` $\rightarrow$ `READY`).
3. Display the extracted visual evidence, Laya classification confidence, and assigned project ID.

---

## 📡 API Reference Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/media/process` | Upload field media and trigger asynchronous AI pipeline |
| `GET` | `/media/` | List all media assets (supports `?project_id=...` filter) |
| `GET` | `/media/{asset_id}` | Get status and extracted visual evidence for an asset |
| `DELETE` | `/media/{asset_id}` | Delete media asset and associated evidence |
| `GET` | `/projects/` | List all active projects |
| `POST` | `/projects/` | Create a new project workspace |
| `GET` | `/projects/{project_id}` | Get project details and metadata |
| `DELETE` | `/projects/{project_id}` | Delete project |
| `GET` | `/search/evidence` | Semantic vector search across indexed visual evidence |

---

## 📄 License
Apache-2.0 License. Built for Code Cubicle 6.0.
