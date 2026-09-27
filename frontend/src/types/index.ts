export interface Project {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  created_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  tags?: string[];
}

export type ProcessingStatus = 'QUEUED' | 'UPLOADING' | 'ANALYZING' | 'ROUTING' | 'INDEXING' | 'READY' | 'NEEDS_REVIEW' | 'FAILED';

export interface MediaAsset {
  id: string;
  cloudinary_url: string | null;
  project_id: string | null;
  processing_status: ProcessingStatus;
  uploaded_at: string;
  mime_type: string | null;
}

export interface VisualEvidence {
  description: string;
  activity: string;
  scene: string;
  objects: string;
  routing_confidence: number;
}

export interface MediaDetail extends MediaAsset {
  evidence: VisualEvidence | null;
}
