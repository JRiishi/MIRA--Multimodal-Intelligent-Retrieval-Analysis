/**
 * DEV-ONLY FIXTURE DATA - DELETED ENTIRELY WHEN THE MOCK LAYER IS TORN DOWN.
 *
 * Every shape here is transcribed from the real FastAPI Pydantic schemas in
 * `backend/app/schemas/*` so the UI is built against the true wire contract:
 *
 *   GET  /projects/                     -> List[Project]              (schemas/project.py)
 *   GET  /projects/{id}                 -> Project
 *   GET  /media/                        -> list[dict]                 (api/media.py:258)
 *   GET  /media/{id}                    -> dict + evidence            (api/media.py:287)
 *   GET  /media/{id}/transformations    -> dict                       (api/media.py:423)
 *   POST /search/                       -> SearchResponse             (schemas/search.py)
 *   POST /projects/{id}/chat            -> ChatMessageResponse        (schemas/chat.py)
 *   GET  /projects/{id}/chat/history    -> List[ChatHistoryItem]
 *   GET  /projects/{id}/timeline        -> List[ProjectTimelineItem]
 *   POST /projects/{id}/report          -> ProjectReportResponse
 *   POST /projects/{id}/change          -> ChangeAnalysisResult
 *
 * Images point at the public Cloudinary `demo` cloud so the grid renders real
 * photography during UI work.
 */
import type {
  MediaAsset,
  MediaDetail,
  Project,
  ProjectReportResponse,
  ProjectTimelineItem,
  SearchResultItem,
  ChatEvidenceItem,
  ChatHistoryItem,
  AssetTransformations,
  ProcessingStatus,
} from '../types';

const CLOUD = 'https://res.cloudinary.com/demo/image/upload';

/** Real, publicly resolvable sample assets in the Cloudinary demo cloud. */
const SAMPLE = {
  mountains: 'samples/landscapes/nature-mountains',
  panorama: 'samples/landscapes/landscape-panorama',
  signs: 'samples/landscapes/architecture-signs',
  cld2: 'cld-sample-2',
  cld3: 'cld-sample-3',
  cld4: 'cld-sample-4',
  cld5: 'cld-sample-5',
  sample: 'sample',
} as const;

const delivered = (publicId: string) => `${CLOUD}/${publicId}/f_auto,q_auto`;
const thumb = (publicId: string) =>
  `${CLOUD}/${publicId}/c_fill,g_auto,w_400,h_300,q_auto,f_auto`;
const card = (publicId: string) =>
  `${CLOUD}/${publicId}/c_fill,g_auto,w_800,h_500,q_auto,f_auto`;

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

export const projects: Project[] = [
  {
    id: 'prj-solar-01',
    name: 'Bhadla Solar Park Expansion',
    description:
      'Phase 2 ground-mount photovoltaic array across 1,200 hectares of degraded semi-arid land. Tracking of inverter, module and civil works progress.',
    tags: ['solar', 'renewable', 'civil', 'maharashtra'],
    latitude: 27.5412,
    longitude: 72.2913,
    location_name: 'Bhadla, Rajasthan',
    created_at: '2026-06-02T09:15:00Z',
  },
  {
    id: 'prj-road-02',
    name: 'NH-48 Bypass Widening - Section 4',
    description:
      'Four-lane grade separation and access-road reconstruction. Monitoring embankment fill, culvert installation and safety signage.',
    tags: ['road', 'highway', 'civil', 'gujarat'],
    latitude: 22.8396,
    longitude: 72.8014,
    location_name: 'Anand, Gujarat',
    created_at: '2026-07-19T11:40:00Z',
  },
  {
    id: 'prj-water-03',
    name: 'Mullaperiyar Dam Desilting',
    description:
      'Reservoir sediment desilting and intake channel restoration for the Periyar irrigation network.',
    tags: ['water', 'dam', 'restoration', 'kerala'],
    latitude: 9.5297,
    longitude: 77.2685,
    location_name: 'Idukki, Kerala',
    created_at: '2026-08-04T06:05:00Z',
  },
  {
    id: 'prj-wind-04',
    name: 'Kayalapuram Onshore Wind Farm',
    description:
      '84-turbine onshore wind farm. Commissioning, blade inspection and substation civil works.',
    tags: ['wind', 'renewable', 'commissioning', 'tamil-nadu'],
    latitude: 8.1641,
    longitude: 77.3187,
    location_name: 'Thoothukudi, Tamil Nadu',
    created_at: '2026-08-27T13:22:00Z',
  },
];

/* ------------------------------------------------------------------ */
/* Media assets                                                        */
/* ------------------------------------------------------------------ */

type AssetSeed = {
  id: string;
  publicId: string;
  projectId: string | null;
  status: ProcessingStatus;
  uploadedAt: string;
  lat: number | null;
  lng: number | null;
  locationSource: 'EXIF' | 'MANUAL' | 'NONE';
  matchDistance: number | null;
  location: string | null;
  description: string;
  activity: string;
  scene: string;
  objects: string[];
  signals: string[];
  confidence: number | null;
  mime?: string;
};

const assetSeeds: AssetSeed[] = [
  /* ---- Bhadla Solar Park: READY, confident ---- */
  {
    id: 'ast-0001',
    publicId: SAMPLE.mountains,
    projectId: 'prj-solar-01',
    status: 'READY',
    uploadedAt: '2026-09-04T06:12:00Z',
    lat: 27.5408,
    lng: 72.2909,
    locationSource: 'EXIF',
    matchDistance: 0.06,
    location: 'Bhadla Solar Park - Block A',
    description:
      'Wide view of completed photovoltaic rows stretching to the horizon under clear sky, with inverter row visible mid-field.',
    activity: 'array_commissioning',
    scene: 'open_utility_scale_solar_farm',
    objects: ['solar_panels', 'inverter_row', 'gravel_access_road', 'perimeter_fence'],
    signals: ['solar', 'renewable', 'pv_array'],
    confidence: 0.91,
  },
  {
    id: 'ast-0002',
    publicId: SAMPLE.cld4,
    projectId: 'prj-solar-01',
    status: 'READY',
    uploadedAt: '2026-09-06T09:48:00Z',
    lat: 27.5421,
    lng: 72.2925,
    locationSource: 'EXIF',
    matchDistance: 0.11,
    location: 'Bhadla Solar Park - Block A',
    description:
      'Close inspection of a module table showing crystalline cells, mounting torque markings and a clean, undamaged glass surface.',
    activity: 'module_inspection',
    scene: 'solar_module_closeup',
    objects: ['solar_module', 'aluminium_clamp', 'torque_marking'],
    signals: ['solar', 'quality_assurance', 'pv_module'],
    confidence: 0.88,
  },
  {
    id: 'ast-0003',
    publicId: SAMPLE.cld2,
    projectId: 'prj-solar-01',
    status: 'READY',
    uploadedAt: '2026-09-11T07:31:00Z',
    lat: 27.5396,
    lng: 72.2888,
    locationSource: 'EXIF',
    matchDistance: 0.19,
    location: 'Bhadla Solar Park - Block C',
    description:
      'Trenching operation for DC cable routes with cable drums staged alongside the excavated trench.',
    activity: 'cable_trenching',
    scene: 'construction_earthmoving',
    objects: ['cable_drum', 'excavated_trench', 'excavator', 'safety_barrier'],
    signals: ['civil', 'cabling', 'solar'],
    confidence: 0.72,
  },
  {
    id: 'ast-0004',
    publicId: SAMPLE.panorama,
    projectId: 'prj-solar-01',
    status: 'NEEDS_REVIEW',
    uploadedAt: '2026-09-14T16:02:00Z',
    lat: 27.5512,
    lng: 72.3011,
    locationSource: 'EXIF',
    matchDistance: 2.4,
    location: 'Unverified - near Bhadla',
    description:
      'Partially erected array with a large open excavation and no completed access track; project attribution is ambiguous.',
    activity: 'foundation_works',
    scene: 'partially_built_solar_array',
    objects: ['pile_driver', 'concrete_foundation', 'partially_erected_panels'],
    signals: ['solar', 'civil', 'foundation'],
    confidence: 0.34,
  },
  /* ---- NH-48 Bypass: READY + needs review ---- */
  {
    id: 'ast-0005',
    publicId: SAMPLE.signs,
    projectId: 'prj-road-02',
    status: 'READY',
    uploadedAt: '2026-09-07T11:20:00Z',
    lat: 22.8401,
    lng: 72.8022,
    locationSource: 'EXIF',
    matchDistance: 0.08,
    location: 'NH-48 Bypass - Section 4',
    description:
      'Completed four-lane carriageway with painted lane markings, kerbs and a newly installed overhead sign gantry.',
    activity: 'pavement_marking',
    scene: 'highway_carriageway',
    objects: ['lane_markings', 'sign_gantry', 'kerb', 'street_light'],
    signals: ['road', 'highway', 'asphalt'],
    confidence: 0.94,
  },
  {
    id: 'ast-0006',
    publicId: SAMPLE.cld3,
    projectId: 'prj-road-02',
    status: 'READY',
    uploadedAt: '2026-09-09T08:14:00Z',
    lat: 22.8388,
    lng: 72.7995,
    locationSource: 'MANUAL',
    matchDistance: 0.31,
    location: 'NH-48 Bypass - Section 4',
    description:
      'Box culvert under construction with shuttering in place and staged reinforcement cage awaiting placement.',
    activity: 'culvert_construction',
    scene: 'drainage_infrastructure',
    objects: ['box_culvert', 'formwork', 'rebar_cage', 'scaffolding'],
    signals: ['road', 'culvert', 'civil'],
    confidence: 0.83,
  },
  {
    id: 'ast-0007',
    publicId: SAMPLE.cld5,
    projectId: 'prj-road-02',
    status: 'NEEDS_REVIEW',
    uploadedAt: '2026-09-16T10:55:00Z',
    lat: 22.8602,
    lng: 72.8155,
    locationSource: 'EXIF',
    matchDistance: 4.9,
    location: 'Unverified - km 41 marker',
    description:
      'A generic rural embankment with no project signage. Could belong to the bypass or an adjacent local road contract.',
    activity: 'embankment_works',
    scene: 'rural_road_corridor',
    objects: ['embankment', 'earthmoving', 'compactor'],
    signals: ['road', 'earthworks'],
    confidence: 0.29,
  },
  /* ---- Dam desilting: READY ---- */
  {
    id: 'ast-0008',
    publicId: SAMPLE.mountains,
    projectId: 'prj-water-03',
    status: 'READY',
    uploadedAt: '2026-09-01T05:44:00Z',
    lat: 9.5302,
    lng: 77.2691,
    locationSource: 'EXIF',
    matchDistance: 0.07,
    location: 'Mullaperiyar - Intake Channel',
    description:
      'Desilted intake channel running between excavated banks with the radial gate structure visible at the far end.',
    activity: 'desilting',
    scene: 'reservoir_intake_structure',
    objects: ['intake_channel', 'radial_gate', 'spillway', 'excavated_bank'],
    signals: ['water', 'dam', 'desilting'],
    confidence: 0.9,
  },
  {
    id: 'ast-0009',
    publicId: SAMPLE.cld4,
    projectId: 'prj-water-03',
    status: 'READY',
    uploadedAt: '2026-09-12T13:09:00Z',
    lat: 9.5288,
    lng: 77.2672,
    locationSource: 'EXIF',
    matchDistance: 0.14,
    location: 'Mullaperiyar - Intake Channel',
    description:
      'Sluice gates lowered on the intake with turbulent, sediment-laden water discharging into the bypass channel.',
    activity: 'sluice_operation',
    scene: 'water_control_structure',
    objects: ['sluice_gate', 'discharge_flow', 'concrete_apron'],
    signals: ['water', 'flow_control', 'dam'],
    confidence: 0.86,
  },
  {
    id: 'ast-0010',
    publicId: SAMPLE.signs,
    projectId: null,
    status: 'UNASSIGNED',
    uploadedAt: '2026-09-25T14:02:00Z',
    lat: 9.5411,
    lng: 77.2804,
    locationSource: 'EXIF',
    matchDistance: 1.9,
    location: 'Unverified - forest access track',
    description:
      'A forested access track with no visible project infrastructure. The routing engine could not match any candidate project.',
    activity: 'site_access',
    scene: 'forested_track',
    objects: ['dirt_track', 'vegetation'],
    signals: ['access', 'forest'],
    confidence: null,
  },
  /* ---- Wind farm: mixed pipeline states ---- */
  {
    id: 'ast-0011',
    publicId: SAMPLE.cld2,
    projectId: 'prj-wind-04',
    status: 'READY',
    uploadedAt: '2026-09-08T07:03:00Z',
    lat: 8.1648,
    lng: 77.3194,
    locationSource: 'EXIF',
    matchDistance: 0.09,
    location: 'Kayalapuram - Turbine Row 12',
    description:
      'Erected turbine row with blades set and nacelle yaw locked toward the prevailing wind direction.',
    activity: 'turbine_erection',
    scene: 'onshore_wind_farm',
    objects: ['wind_turbine', 'nacelle', 'blade', 'crane'],
    signals: ['wind', 'renewable', 'erection'],
    confidence: 0.92,
  },
  {
    id: 'ast-0012',
    publicId: SAMPLE.cld3,
    projectId: 'prj-wind-04',
    status: 'INDEXING',
    uploadedAt: '2026-09-22T15:41:00Z',
    lat: 8.1633,
    lng: 77.3201,
    locationSource: 'EXIF',
    matchDistance: 0.12,
    location: 'Kayalapuram - Substation',
    description:
      'Substation civil works with transformer plinths cast and busbar gantries being assembled.',
    activity: 'substation_civil_works',
    scene: 'electrical_substation',
    objects: ['transformer_plinth', 'gantry', 'busbar', 'concrete_works'],
    signals: ['wind', 'substation', 'civil'],
    confidence: 0.81,
  },
  {
    id: 'ast-0013',
    publicId: SAMPLE.cld5,
    projectId: 'prj-wind-04',
    status: 'ROUTING',
    uploadedAt: '2026-09-26T08:26:00Z',
    lat: 8.1659,
    lng: 77.3178,
    locationSource: 'EXIF',
    matchDistance: 0.1,
    location: 'Kayalapuram - Turbine Row 19',
    description:
      'Blade section laid on the laydown area ahead of a pick-and-carry lift, awaiting lift scheduling.',
    activity: 'blade_erection_prep',
    scene: 'wind_farm_laydown_yard',
    objects: ['blade_section', 'crane', 'laydown_yard'],
    signals: ['wind', 'erection', 'logistics'],
    confidence: 0.68,
  },
  {
    id: 'ast-0014',
    publicId: SAMPLE.panorama,
    projectId: 'prj-wind-04',
    status: 'ANALYZING',
    uploadedAt: '2026-09-27T06:58:00Z',
    lat: 8.1672,
    lng: 77.3159,
    locationSource: 'EXIF',
    matchDistance: 0.16,
    location: 'Kayalapuram - Access Road',
    description:
      'Newly graded access road climbing toward the ridge with a water tanker parked at the bend.',
    activity: 'access_road_grading',
    scene: 'graded_access_road',
    objects: ['graded_road', 'water_tanker', 'hillside'],
    signals: ['wind', 'roads', 'civil'],
    confidence: null,
  },
  {
    id: 'ast-0015',
    publicId: SAMPLE.sample,
    projectId: null,
    status: 'FAILED',
    uploadedAt: '2026-09-23T19:33:00Z',
    lat: null,
    lng: null,
    locationSource: 'NONE',
    matchDistance: null,
    location: null,
    description: '',
    activity: '',
    scene: '',
    objects: [],
    signals: [],
    confidence: null,
  },
];

/** GET /media/ - the exact dict built at backend/app/api/media.py:269. */
export const mediaAssets: MediaAsset[] = assetSeeds.map((seed) => ({
  id: seed.id,
  cloudinary_url: delivered(seed.publicId),
  project_id: seed.projectId,
  processing_status: seed.status,
  uploaded_at: seed.uploadedAt,
  mime_type: seed.mime ?? 'image/jpeg',
  image_latitude: seed.lat,
  image_longitude: seed.lng,
  location_source: seed.locationSource,
  location_match_distance: seed.matchDistance,
  description: seed.description || null,
  activity: seed.activity || null,
  scene: seed.scene || null,
  routing_confidence: seed.confidence,
}));

/** GET /media/{id} - evidence sub-object from backend/app/api/media.py:307. */
export const mediaDetails: Record<string, MediaDetail> = Object.fromEntries(
  assetSeeds.map((seed) => [
    seed.id,
    {
      id: seed.id,
      cloudinary_url: delivered(seed.publicId),
      project_id: seed.projectId,
      processing_status: seed.status,
      uploaded_at: seed.uploadedAt,
      mime_type: seed.mime ?? 'image/jpeg',
      image_latitude: seed.lat,
      image_longitude: seed.lng,
      location_source: seed.locationSource,
      location_match_distance: seed.matchDistance,
      evidence: seed.description
        ? {
            description: seed.description,
            activity: seed.activity,
            scene: seed.scene,
            objects: seed.objects.join(', '),
            latitude: seed.lat,
            longitude: seed.lng,
            location_source: seed.locationSource,
            location_match_distance: seed.matchDistance,
            routing_confidence: seed.confidence ?? 0,
          }
        : null,
    },
  ]),
);

/* ------------------------------------------------------------------ */
/* Cloudinary transformations - mirrors CloudinaryService URL shapes     */
/* ------------------------------------------------------------------ */

export const transformations: Record<string, AssetTransformations> = Object.fromEntries(
  assetSeeds.map((seed) => {
    const project = projects.find((p) => p.id === seed.projectId);
    const badge = encodeURIComponent(
      `MIRA VERIFIED | ${project?.name ?? 'UNVERIFIED'} | GPS ${
        seed.lat != null && seed.lng != null
          ? `${seed.lat.toFixed(4)}N ${seed.lng.toFixed(4)}E`
          : 'NO GPS'
      }`,
    );
    return [
      seed.id,
      {
        asset_id: seed.id,
        public_id: seed.publicId,
        original_url: delivered(seed.publicId),
        optimized_url: delivered(seed.publicId),
        thumbnail_url: thumb(seed.publicId),
        verified_badge_url: `${CLOUD}/${seed.publicId}/l_text:$(start)Make_UpBold_22:$(end)/l_text:$(start)Arial_14:$(end)/l_${badge}/overlay,g_south_east,x_20,y_20/fl_layer_apply,q_auto,f_auto`,
        campaign_aspects: {
          square_1_1: `${CLOUD}/${seed.publicId}/c_fill,g_auto,w_1080,h_1080,q_auto,f_auto`,
          landscape_16_9: `${CLOUD}/${seed.publicId}/c_fill,g_auto,w_1920,h_1080,q_auto,f_auto`,
          story_9_16: `${CLOUD}/${seed.publicId}/c_fill,g_auto,w_1080,h_1920,q_auto,f_auto`,
        },
      },
    ];
  }),
);

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

function evidenceFor(assetId: string, score: number): SearchResultItem {
  const seed = assetSeeds.find((a) => a.id === assetId)!;
  const project = projects.find((p) => p.id === seed.projectId);
  return {
    asset_id: seed.id,
    project_id: seed.projectId,
    project_name: project?.name ?? null,
    cloudinary_url: card(seed.publicId),
    cloudinary_public_id: seed.publicId,
    description: seed.description,
    activity: seed.activity || null,
    scene: seed.scene || null,
    objects: seed.objects,
    project_signals: seed.signals,
    timestamp: seed.uploadedAt,
    location: seed.location,
    latitude: seed.lat,
    longitude: seed.lng,
    score,
    search_source: 'QDRANT_VECTOR',
  };
}

/**
 * Deterministic pseudo-relevance so search results feel stable across
 * reloads without needing a real embedding model.
 */
const rankedAssets = [
  'ast-0001',
  'ast-0011',
  'ast-0005',
  'ast-0008',
  'ast-0002',
  'ast-0009',
  'ast-0006',
  'ast-0012',
  'ast-0003',
  'ast-0004',
  'ast-0007',
  'ast-0010',
];

export function searchFixtures(query: string, topK: number, minScore: number) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const scored = rankedAssets
    .map((assetId, index) => {
      const item = evidenceFor(assetId, 0);
      const haystack = [
        item.description,
        item.activity ?? '',
        item.scene ?? '',
        item.project_name ?? '',
        (item.objects ?? []).join(' '),
        (item.project_signals ?? []).join(' '),
        item.location ?? '',
      ]
        .join(' ')
        .toLowerCase();

      const hits = terms.filter((t) => haystack.includes(t)).length;
      const base = 0.92 - index * 0.055;
      return { item, score: terms.length === 0 ? base : base * (hits / terms.length) + hits * 0.05 };
    })
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map((r) => ({ ...r.item, score: Number(Math.min(r.score, 0.99).toFixed(3)) }));
}

/* ------------------------------------------------------------------ */
/* Chat / timeline / report                                             */
/* ------------------------------------------------------------------ */

export function chatEvidenceFor(projectId: string, limit = 4): ChatEvidenceItem[] {
  return mediaAssets
    .filter((a) => a.project_id === projectId && a.description)
    .slice(0, limit)
    .map((a) => {
      const seed = assetSeeds.find((s) => s.id === a.id)!;
      return {
        asset_id: a.id,
        cloudinary_url: thumb(seed.publicId),
        description: a.description!,
        timestamp: a.uploaded_at,
        location: a.location_source && seed.location ? seed.location : null,
        activity: a.activity,
        scene: a.scene,
        score: 0.78,
      };
    });
}

export const chatHistory: ChatHistoryItem[] = [
  {
    id: 'msg-001',
    role: 'user',
    message: 'What is the current construction status of this project?',
    intent: 'STATUS_SUMMARY',
    evidence: null,
    created_at: '2026-09-20T10:14:00Z',
  },
  {
    id: 'msg-002',
    role: 'assistant',
    message:
      'Across 5 verified captures, this project is in active construction. The most recent evidence shows substation civil works with transformer plinths cast, while the array rows themselves are complete. Confidence across routed evidence averages 0.87, which is above the 0.40 auto-assign threshold.',
    intent: 'STATUS_SUMMARY',
    evidence: chatEvidenceFor('prj-solar-01', 3),
    created_at: '2026-09-20T10:14:02Z',
  },
  {
    id: 'msg-003',
    role: 'user',
    message: 'Are there any safety concerns on site?',
    intent: 'SAFETY_CHECK',
    evidence: null,
    created_at: '2026-09-21T15:02:00Z',
  },
  {
    id: 'msg-004',
    role: 'assistant',
    message:
      'Two captures show safety infrastructure in place - trench-edge barriers during cable laying and a full perimeter fence around the array. No evidence in the record shows unguarded excavations or missing barriers, but visual coverage is limited to 5 assets.',
    intent: 'SAFETY_CHECK',
    evidence: chatEvidenceFor('prj-solar-01', 2),
    created_at: '2026-09-21T15:02:03Z',
  },
];

export function timelineFor(projectId: string): ProjectTimelineItem[] {
  return mediaAssets
    .filter((a) => a.project_id === projectId)
    .slice()
    .sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at))
    .map((a) => {
      const seed = assetSeeds.find((s) => s.id === a.id)!;
      return {
        asset_id: a.id,
        date: a.uploaded_at,
        activity: a.activity,
        description: a.description,
        scene: a.scene,
        location: seed.location,
        cloudinary_url: card(seed.publicId),
      };
    });
}

export function reportFor(projectId: string): ProjectReportResponse {
  const project = projects.find((p) => p.id === projectId) ?? projects[0];
  const evidence = chatEvidenceFor(projectId, 5);
  const timeline = timelineFor(projectId);
  const assigned = mediaAssets.filter((a) => a.project_id === projectId && a.description);

  // Shapes below mirror chat_service.generate_project_report
  // (backend/app/services/chat_service.py:648-695):
  //   current_status  = "Active - observed '<activity>' on <date> (<description>)"
  //                      or "No evidence recorded yet."
  //   recent_activity = a single activity token, or "None"
  const newest = assigned[assigned.length - 1];

  const currentStatus = newest
    ? `Active - observed '${newest.activity ?? 'field work'}' on ${
        newest.uploaded_at.slice(0, 10)
      } (${newest.description ?? ''})`
    : 'No evidence recorded yet.';

  const before = assigned[0];
  const last = assigned[assigned.length - 1];
  const comparable = before && last && before.id !== last.id;

  return {
    project_id: project.id,
    project_name: project.name,
    project_description: project.description,
    location_name: project.location_name,
    total_evidence_count: assigned.length,
    current_status: currentStatus,
    recent_activity: newest?.activity || 'None',
    timeline_summary: timeline,
    key_evidence: evidence,
    before_after_summary: comparable
      ? `Structural progression computed between ${before.id} and ${last.id}.`
      : null,
    before_asset_url: before ? mediaDetails[before.id]?.cloudinary_url ?? null : null,
    after_asset_url: last ? mediaDetails[last.id]?.cloudinary_url ?? null : null,
    change_score: comparable ? 0.284 : null,
    generated_at: new Date().toISOString(),
  };
}

export function changeAnalysisFor(projectId: string) {
  const assigned = mediaAssets.filter((a) => a.project_id === projectId && a.description);
  const before = assigned[0];
  const after = assigned[assigned.length - 1];
  const beforePublic = assetSeeds.find((s) => s.id === before?.id)?.publicId ?? SAMPLE.sample;
  const afterPublic = assetSeeds.find((s) => s.id === after?.id)?.publicId ?? SAMPLE.sample;

  return {
    project_id: projectId,
    before_asset_id: before?.id ?? '',
    after_asset_id: after?.id ?? '',
    before_url: delivered(beforePublic),
    after_url: delivered(afterPublic),
    composite_url: `${CLOUD}/w_1200,h_600,l_${delivered(beforePublic)},o_50/w_1200,h_600,l_${delivered(afterPublic)},fl_relative,w_800,h_600/c_fill,g_auto/l_$text:$(start)BEFORE:$(end),fl_layer_apply,l_$text:$(start)AFTER:$(end),fl_layer_apply/q_auto,f_auto`,
    change_detected: true,
    change_score: 0.284,
    summary:
      'Moderate visual change detected. Later evidence shows a more advanced stage of works relative to the baseline capture.',
  };
}
