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

/**
 * Every value the backend actually writes to `media_assets.processing_status`.
 *
 * NOTE: this is deliberately wider than the `ProcessingStatus` Pydantic enum in
 * `backend/app/schemas/media.py`, which is out of sync with the pipeline code.
 * The real writers are:
 *   models/media.py:15   UPLOADED   (column default)
 *   api/media.py:234,624 QUEUED
 *   api/media.py:35     UPLOADING
 *   api/media.py:61     ANALYZING
 *   api/media.py:69     ROUTING
 *   api/media.py:89     INDEXING
 *   api/media.py:203,340 READY
 *   api/media.py:91     NEEDS_REVIEW
 *   api/media.py:93     UNASSIGNED
 *   api/projects.py:79  UNASSIGNED
 *   api/media.py:55,213 FAILED
 *
 * `GET /media/` returns the raw DB string, not the Pydantic enum, so all of
 * these can reach the UI. Terminal states (no further pipeline progress):
 * READY, FAILED, NEEDS_REVIEW, UNASSIGNED.
 */
export type ProcessingStatus =
  | 'UPLOADED'
  | 'QUEUED'
  | 'UPLOADING'
  | 'ANALYZING'
  | 'ROUTING'
  | 'INDEXING'
  | 'READY'
  | 'NEEDS_REVIEW'
  | 'UNASSIGNED'
  | 'FAILED';

/** Statuses after which the pipeline makes no further progress. */
export const TERMINAL_STATUSES: readonly ProcessingStatus[] = [
  'READY',
  'FAILED',
  'NEEDS_REVIEW',
  'UNASSIGNED',
];

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
  description?: string | null;
  activity?: string | null;
  scene?: string | null;
  routing_confidence?: number | null;
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
  cloudinary_public_id?: string | null;
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
  search_source?: string | null;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  count: number;
  hybrid_mode?: boolean;
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
  composite_url?: string;
  change_detected: boolean;
  change_score: number;
  summary: string;
}

export interface AssetTransformations {
  asset_id: string;
  public_id: string;
  original_url: string;
  optimized_url: string;
  thumbnail_url: string;
  verified_badge_url: string;
  campaign_aspects: {
    square_1_1: string;
    landscape_16_9: string;
    story_9_16: string;
  };
}



