export interface Project {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  created_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  tags?: string[];
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
}

export type ProcessingStatus = 'QUEUED' | 'UPLOADING' | 'ANALYZING' | 'ROUTING' | 'INDEXING' | 'READY' | 'NEEDS_REVIEW' | 'FAILED' | 'UNASSIGNED';

export interface MediaAsset {
  id: string;
  cloudinary_url: string | null;
  project_id: string | null;
  processing_status: ProcessingStatus;
  uploaded_at: string;
  mime_type: string | null;
  image_latitude?: number | null;
  image_longitude?: number | null;
  location_source?: string | null;
  location_match_distance?: number | null;
}

export interface VisualEvidence {
  description: string;
  activity: string;
  scene: string;
  objects: string;
  latitude?: number | null;
  longitude?: number | null;
  location_source?: string | null;
  location_match_distance?: number | null;
  routing_confidence: number;
}

export interface MediaDetail extends MediaAsset {
  evidence: VisualEvidence | null;
}

export interface SearchResultItem {
  asset_id: string;
  project_id?: string | null;
  project_name?: string | null;
  cloudinary_url: string;
  description: string;
  activity?: string | null;
  scene?: string | null;
  objects?: string[] | null;
  project_signals?: string[] | null;
  timestamp?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  count: number;
}


