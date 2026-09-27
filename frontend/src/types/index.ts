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

export interface ChatEvidenceItem {
  asset_id: string;
  cloudinary_url: string;
  description: string;
  timestamp?: string | null;
  location?: string | null;
  activity?: string | null;
  scene?: string | null;
  score?: number | null;
}

export interface ChatMessageResponse {
  answer: string;
  project_id: string;
  intent?: string;
  evidence: ChatEvidenceItem[];
}

export interface ChatHistoryItem {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  intent?: string | null;
  evidence?: ChatEvidenceItem[] | null;
  created_at: string;
}

export interface ProjectTimelineItem {
  asset_id?: string | null;
  date: string;
  activity?: string | null;
  description?: string | null;
  scene?: string | null;
  location?: string | null;
  cloudinary_url: string;
}

export interface ProjectReportResponse {
  project_id: string;
  project_name: string;
  project_description?: string | null;
  location_name?: string | null;
  total_evidence_count: number;
  current_status: string;
  recent_activity: string;
  timeline_summary: ProjectTimelineItem[];
  key_evidence: ChatEvidenceItem[];
  before_after_summary?: string | null;
  before_asset_url?: string | null;
  after_asset_url?: string | null;
  change_score?: number | null;
  generated_at: string;
}

export interface ChangeAnalysisResult {
  project_id?: string;
  before_asset_id: string;
  after_asset_id: string;
  before_url: string;
  after_url: string;
  change_detected: boolean;
  change_score: number;
  summary: string;
}



