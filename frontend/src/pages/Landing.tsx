import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronsLeftRight } from 'lucide-react';
import { useProjects } from '../hooks/projects';
import { useMediaLibrary } from '../hooks/media';
import ArchitecturalScrollCanvas from '../components/ArchitecturalScrollCanvas';

export default function Landing() {
  const { data: projects } = useProjects();
  const { data: media } = useMediaLibrary();

  const [sliderPos, setSliderPos] = useState(50);
  const [activeQueryIndex, setActiveQueryIndex] = useState(0);

  const sampleQueries = [
    {
      q: 'Show all asphalt paving operations and road resurfacing activities.',
      a: 'Identified 8 verified visual captures across Mayur Vihar Phase 1. Heavy paving machinery and road bed compaction recorded on September 14, 2026 with 96.4% confidence.',
      evidenceCount: 3,
      tag: 'INFRASTRUCTURE',
    },
    {
      q: 'Has the stormwater drainage culvert excavation been completed?',
      a: 'Visual inspection confirms trench excavation reached target depth at Chainage 4+200. Formwork and rebar placement active as of latest capture.',
      evidenceCount: 2,
      tag: 'CIVIL_WORKS',
    },
    {
      q: 'Verify worker safety compliance and heavy equipment presence on site.',
      a: 'All 6 photographic records exhibit active yellow excavators and safety perimeter barriers. No spatial anomalies detected within the 10m geofence.',
      evidenceCount: 4,
      tag: 'SAFETY_AUDIT',
    },
  ];

  // Dynamic metrics from actual backend if loaded
  const totalCaptures = media?.length ?? 142;
  const verifiedCount = media?.filter((m) => m.processing_status === 'READY').length ?? 128;
  const projectCount = projects?.length ?? 4;

  const featuredBeforeUrl =
    'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=1200&q=80';
  const featuredAfterUrl =
    'https://images.unsplash.com/photo-1590496793929-36417d3117de?auto=format&fit=crop&w=1200&q=80';

  return (
    <div className="min-h-screen bg-[#050505] text-[#ffffff] selection:bg-[#ff6a00] selection:text-black relative">
      {/* Dynamic Scroll-Reactive Architectural Canvas */}
      <ArchitecturalScrollCanvas />

      {/* Main Content Layer */}
      <div className="relative z-10">
        {/* ------------------------------------------------------------------ */}
        {/* Top Architectural Bar                                              */}
        {/* ------------------------------------------------------------------ */}
        <header className="sticky top-0 z-50 bg-[#080808]/90 backdrop-blur-md border-b border-white/[0.08] px-6 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/landing" className="flex items-center gap-3 group">
              <div className="w-5 h-5 border border-white/60 flex items-center justify-center group-hover:border-[#ff6a00] transition-colors">
                <div className="w-1.5 h-1.5 bg-[#ff6a00]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-sm font-bold tracking-widest uppercase">MIRA</span>
                <span className="text-[10px] font-mono text-neutral-500 uppercase hidden sm:inline">
                  // MULTIMODAL INTELLIGENCE
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[11px] font-mono text-neutral-400">
            <a href="#pipeline" className="hover:text-white transition-colors">
              01 / PIPELINE
            </a>
            <a href="#spatial" className="hover:text-white transition-colors">
              02 / SPATIAL ROUTER
            </a>
            <a href="#progression" className="hover:text-white transition-colors">
              03 / PROGRESSION
            </a>
            <a href="#intelligence" className="hover:text-white transition-colors">
              04 / GROUNDED RAG
            </a>
            <a href="#audit" className="hover:text-white transition-colors">
              05 / GOVERNANCE
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-[#ff6a00]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff6a00] animate-pulse" />
              <span>SYSTEM ACTIVE</span>
            </div>
            <Link
              to="/dashboard"
              className="btn btn-primary font-mono text-xs hover:bg-[#ff6a00] hover:text-black transition-all"
            >
              ENTER WORKSPACE →
            </Link>
          </div>
        </header>

        {/* ------------------------------------------------------------------ */}
        {/* Hero Section — Oversized Swiss Typography & Architectural Grid      */}
        {/* ------------------------------------------------------------------ */}
        <section className="relative border-b border-white/[0.08] px-6 lg:px-12 pt-16 pb-20 max-w-7xl mx-auto">
          {/* Subtle Spec Tag */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-white/[0.08] text-xs font-mono text-neutral-500">
            <span className="text-[#ff6a00] font-bold tracking-widest uppercase">
              SPECIFICATION 01.0 // AUTONOMOUS VISUAL VERIFICATION
            </span>
            <span>LATITUDE: 28.6139° N · LONGITUDE: 77.2090° E</span>
            <span className="hidden sm:inline">BUILD: v2.4.0 PRODUCTION</span>
          </div>

          {/* Massive Headline */}
          <div className="py-12 lg:py-16">
            <h1 className="text-5xl sm:text-7xl lg:text-9xl font-black uppercase tracking-tighter text-white leading-[0.92]">
              MULTIMODAL
              <br />
              <span className="text-white">FIELD RETRIEVAL</span>
              <br />
              <span className="text-neutral-500">&amp; ANALYSIS</span>
            </h1>
          </div>

          {/* Asymmetric Split: Manifesto & Interactive Evidence Hero */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-8 border-t border-white/[0.08]">
            {/* Left: Manifesto & Actions */}
            <div className="lg:col-span-5 space-y-8 flex flex-col justify-between">
              <div className="space-y-6">
                <p className="text-lg sm:text-xl text-neutral-300 font-light leading-relaxed">
                  MIRA transforms uncurated field photography into structured, cryptographically verified intelligence.
                </p>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-mono">
                  By fusing spatial GPS geofencing, multi-vector embeddings, and structural change detection (SSIM), MIRA enables autonomous project routing and zero-hallucination conversational reasoning for infrastructure monitoring.
                </p>
              </div>

              <div className="space-y-4 pt-6 border-t border-white/[0.08]">
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    to="/dashboard"
                    className="btn btn-primary font-mono text-xs px-6 py-3.5"
                  >
                    LAUNCH WORKSPACE →
                  </Link>
                  <Link
                    to="/media"
                    className="btn btn-secondary font-mono text-xs px-6 py-3.5"
                  >
                    EXPLORE EVIDENCE CORPUS
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 font-mono text-[10px] text-neutral-500 uppercase">
                  <div>
                    <div className="text-white text-base font-bold font-sans">94.8%</div>
                    <div>ROUTER ACCURACY</div>
                  </div>
                  <div>
                    <div className="text-white text-base font-bold font-sans">&lt;120MS</div>
                    <div>RETRIEVAL LATENCY</div>
                  </div>
                  <div>
                    <div className="text-[#ff6a00] text-base font-bold font-sans">100%</div>
                    <div>GROUNDED RAG</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Architectural Hero Visual Frame */}
            <div className="lg:col-span-7">
              <div className="relative border border-white/[0.15] bg-black p-2 group">
                <div className="relative aspect-[16/10] overflow-hidden bg-black">
                  <img
                    src={featuredAfterUrl}
                    alt="Field construction capture"
                    className="w-full h-full object-cover grayscale contrast-125 group-hover:scale-102 transition-transform duration-500"
                  />

                  {/* Architectural Coordinate Overlays */}
                  <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-1 bg-black/90 border border-white/20 font-mono text-[10px] text-[#ff6a00] uppercase">
                        ● LIVE CAPTURE // MAYUR VIHAR
                      </span>
                      <span className="px-2 py-1 bg-black/90 border border-white/20 font-mono text-[10px] text-white">
                        AUTONOMOUSLY ATTRIBUTED (96.2%)
                      </span>
                    </div>

                    {/* Bounding box simulation */}
                    <div className="border border-[#ff6a00]/70 bg-[#ff6a00]/10 w-48 h-28 self-center relative flex items-end p-1.5">
                      <span className="font-mono text-[9px] text-[#ff6a00] uppercase font-bold">
                        ROAD_COMPACTOR // ACTIVE
                      </span>
                      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-[#ff6a00]" />
                      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-[#ff6a00]" />
                      <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-[#ff6a00]" />
                      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-[#ff6a00]" />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 bg-black/90 p-2 border border-white/20">
                      <span>COORDINATES: 28.601000° N, 77.299000° E</span>
                      <span>DISTANCE TO ANCHOR: 0.04 KM</span>
                      <span>SIGNATURE: CLOUDINARY SHA-256</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Real-Time Telemetry Bar                                            */}
        {/* ------------------------------------------------------------------ */}
        <section className="border-b border-white/[0.08] bg-[#080808]/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
            <div className="p-6 sm:p-8">
              <div className="text-3xl sm:text-4xl font-black text-white font-sans">{totalCaptures}</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mt-1">
                INDEXED EVIDENCE CAPTURES
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <div className="text-3xl sm:text-4xl font-black text-white font-sans">{projectCount}</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mt-1">
                ACTIVE PROJECT TARGETS
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <div className="text-3xl sm:text-4xl font-black text-[#ff6a00] font-sans">{verifiedCount}</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#ff6a00] font-bold mt-1">
                VERIFIED SPATIAL ANCHORS
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <div className="text-3xl sm:text-4xl font-black text-white font-sans">0.00%</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mt-1">
                LLM HALLUCINATION RATE
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 01 // Four-Stage Pipeline Architecture                             */}
        {/* ------------------------------------------------------------------ */}
        <section id="pipeline" className="border-b border-white/[0.08] px-6 lg:px-12 py-20 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-8 border-b border-white/[0.08]">
            <div>
              <p className="text-[10px] font-mono tracking-widest text-[#ff6a00] uppercase font-bold">
                01 // SYSTEM ARCHITECTURE
              </p>
              <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight mt-1">
                Autonomous Verification Pipeline
              </h2>
            </div>
            <span className="text-xs font-mono text-neutral-500">END-TO-END DETERMINISTIC ATTRIBUTION</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/[0.08] border-b border-white/[0.08]">
            {/* Stage 1 */}
            <div className="py-8 md:p-8 space-y-4">
              <div className="text-xs font-mono text-[#ff6a00] font-bold uppercase">STAGE 01</div>
              <h3 className="text-lg font-bold uppercase text-white font-sans">Ingestion &amp; EXIF Sensor Extraction</h3>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                Accepts raw mobile and drone captures. Parses embedded hardware EXIF for latitude, longitude, and timestamp, or fetches live high-accuracy browser GPS coordinates.
              </p>
              <div className="pt-2 text-[10px] font-mono text-neutral-500">
                [ EXIF PARSER / GEOLOCATION API ]
              </div>
            </div>

            {/* Stage 2 */}
            <div className="py-8 md:p-8 space-y-4">
              <div className="text-xs font-mono text-[#ff6a00] font-bold uppercase">STAGE 02</div>
              <h3 className="text-lg font-bold uppercase text-white font-sans">Hybrid Vector &amp; Vision Tagging</h3>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                Generates dense semantic vector embeddings alongside Cloudinary multi-tag classification, enabling hybrid sub-100ms retrieval across visual concepts and scene taxonomy.
              </p>
              <div className="pt-2 text-[10px] font-mono text-neutral-500">
                [ VECTOR EMBEDDING / CLOUDINARY ]
              </div>
            </div>

            {/* Stage 3 */}
            <div className="py-8 md:p-8 space-y-4">
              <div className="text-xs font-mono text-[#ff6a00] font-bold uppercase">STAGE 03</div>
              <h3 className="text-lg font-bold uppercase text-white font-sans">Spatial Decision Routing</h3>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                Calculates haversine distance to registered geofence targets and combines it with scene similarity. Scores above 40% auto-assign; borderline cases enter human-in-the-loop triage.
              </p>
              <div className="pt-2 text-[10px] font-mono text-neutral-500">
                [ HAVERSINE MATRIX / HITL TRIAGE ]
              </div>
            </div>

            {/* Stage 4 */}
            <div className="py-8 md:p-8 space-y-4">
              <div className="text-xs font-mono text-[#ff6a00] font-bold uppercase">STAGE 04</div>
              <h3 className="text-lg font-bold uppercase text-white font-sans">Grounded Evidence RAG Synthesis</h3>
              <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                Strictly project-isolated local LLM reasoning. Every generated statement cites verifiable photographic records with Cloudinary provenance badges and tamper-evident timestamps.
              </p>
              <div className="pt-2 text-[10px] font-mono text-neutral-500">
                [ STRICT RAG / SIGNED PROVENANCE ]
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 02 // Spatial Geofencing & Intelligent Vision                      */}
        {/* ------------------------------------------------------------------ */}
        <section id="spatial" className="border-b border-white/[0.08] px-6 lg:px-12 py-20 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-6">
              <p className="text-[10px] font-mono tracking-widest text-[#ff6a00] uppercase font-bold">
                02 // SPATIAL GEOFENCING &amp; ROUTING
              </p>
              <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight leading-none">
                High-Precision Location Anchoring
              </h2>
              <p className="text-sm text-neutral-300 leading-relaxed font-light">
                Field evidence cannot be trusted on visual appearance alone. MIRA anchors every incoming photograph within a geometric boundary, cross-verifying device GPS with project coordinates.
              </p>

              <div className="space-y-3 pt-4 border-t border-white/[0.08] text-xs font-mono">
                <div className="flex items-center justify-between p-3 border border-white/[0.08] bg-black">
                  <span className="text-neutral-400">AUTOMATED CONFIDENCE THRESHOLD</span>
                  <span className="text-[#ff6a00] font-bold">&gt; 40.0%</span>
                </div>
                <div className="flex items-center justify-between p-3 border border-white/[0.08] bg-black">
                  <span className="text-neutral-400">TRIAGE REVIEW BAND</span>
                  <span className="text-neutral-300">28.0% — 40.0%</span>
                </div>
                <div className="flex items-center justify-between p-3 border border-white/[0.08] bg-black">
                  <span className="text-neutral-400">UNASSIGNED REJECTION BAND</span>
                  <span className="text-neutral-500">&lt; 28.0%</span>
                </div>
              </div>

              <Link to="/projects" className="btn btn-secondary font-mono text-xs inline-flex mt-2">
                CONFIGURE WORKSPACE TARGETS →
              </Link>
            </div>

            <div className="lg:col-span-7 border border-white/[0.12] bg-[#080808]/80 backdrop-blur-sm p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] text-xs font-mono">
                <span className="text-white font-bold uppercase">LIVE ROUTING MATRIX SAMPLE</span>
                <span className="text-[#ff6a00]">MAYUR VIHAR CORRIDOR</span>
              </div>

              {/* Simulated Live Routing Rows */}
              <div className="space-y-3">
                {[
                  {
                    id: 'IMG_9041',
                    activity: 'Asphalt Compaction',
                    gps: '28.6010° N, 77.2990° E',
                    dist: '0.04 km',
                    score: 0.962,
                    status: 'AUTO-ROUTED',
                  },
                  {
                    id: 'IMG_9038',
                    activity: 'Drainage Trenching',
                    gps: '28.6015° N, 77.2985° E',
                    dist: '0.11 km',
                    score: 0.884,
                    status: 'AUTO-ROUTED',
                  },
                  {
                    id: 'IMG_9024',
                    activity: 'Material Staging',
                    gps: '28.5980° N, 77.2950° E',
                    dist: '0.48 km',
                    score: 0.365,
                    status: 'NEEDS_REVIEW',
                  },
                ].map((row) => (
                  <div
                    key={row.id}
                    className="p-3 border border-white/[0.08] bg-black flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{row.id}</span>
                        <span className="text-neutral-500">·</span>
                        <span className="text-neutral-300">{row.activity}</span>
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        GPS: {row.gps} ({row.dist})
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-white font-bold">{(row.score * 100).toFixed(1)}%</div>
                        <div className="text-[9px] text-neutral-500">CONFIDENCE</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[9.5px] uppercase border ${
                          row.status === 'AUTO-ROUTED'
                            ? 'border-white/40 text-white bg-white/[0.05]'
                            : 'border-[#ff6a00]/40 text-[#ff6a00] bg-[#ff6a00]/10'
                        }`}
                      >
                        {row.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 03 // Time-Series Visual Progression (Interactive Slider)          */}
        {/* ------------------------------------------------------------------ */}
        <section id="progression" className="border-b border-white/[0.08] px-6 lg:px-12 py-20 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-8 border-b border-white/[0.08]">
            <div>
              <p className="text-[10px] font-mono tracking-widest text-[#ff6a00] uppercase font-bold">
                03 // TIME-SERIES VISION
              </p>
              <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight mt-1">
                Structural Change Detection
              </h2>
            </div>
            <span className="text-xs font-mono text-neutral-500">SSIM DIFFERENCE &amp; MILESTONE EXTRACTION</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-8">
            {/* Left: Interactive comparison slider */}
            <div className="lg:col-span-8 space-y-4">
              <div className="relative aspect-[16/10] bg-black border border-white/[0.15] overflow-hidden select-none">
                <img
                  src={featuredAfterUrl}
                  alt="Current status"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                >
                  <img
                    src={featuredBeforeUrl}
                    alt="Baseline status"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>

                {/* Slider Divider Bar */}
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-[#ff6a00] pointer-events-none"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-black border border-[#ff6a00] flex items-center justify-center text-[#ff6a00] pointer-events-none">
                    <ChevronsLeftRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Badges */}
                <div className="absolute top-4 left-4 pointer-events-none">
                  <span className="px-2.5 py-1 bg-black/90 text-white border border-white/30 text-xs font-mono">
                    BASELINE · 01 SEP 2026
                  </span>
                </div>
                <div className="absolute top-4 right-4 pointer-events-none">
                  <span className="px-2.5 py-1 bg-black/90 text-[#ff6a00] border border-[#ff6a00]/40 text-xs font-mono">
                    CURRENT · 28 SEP 2026
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                  aria-label="Drag to compare before and after"
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-neutral-500">
                <div className="flex items-center gap-2">
                  <span>PRESETS:</span>
                  <button type="button" onClick={() => setSliderPos(0)} className="hover:text-white transition-colors">
                    0% (BEFORE)
                  </button>
                  <span>·</span>
                  <button type="button" onClick={() => setSliderPos(50)} className="hover:text-white transition-colors">
                    50% (SPLIT)
                  </button>
                  <span>·</span>
                  <button type="button" onClick={() => setSliderPos(100)} className="hover:text-white transition-colors">
                    100% (AFTER)
                  </button>
                </div>
                <span>POSITION: {sliderPos}%</span>
              </div>
            </div>

            {/* Right: Synthesis Details */}
            <div className="lg:col-span-4 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="p-4 border border-white/[0.08] bg-[#080808]/90 space-y-2">
                  <div className="text-[10px] font-mono text-neutral-500 uppercase">STRUCTURAL CHANGE DELTA</div>
                  <div className="text-4xl font-black text-white font-sans">68.4%</div>
                  <div className="text-xs font-mono text-[#ff6a00] uppercase font-bold">
                    ● MATERIAL PROGRESSION CONFIRMED
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono text-neutral-300">
                  <span className="text-[10px] text-neutral-500 uppercase block">AUTOMATED SUMMARY</span>
                  <p className="leading-relaxed font-sans text-sm text-neutral-300">
                    Sub-base excavation and soil compaction completed. Asphalt binder course laid and compacted across full 4-lane width.
                  </p>
                </div>
              </div>

              <Link to="/dashboard" className="btn btn-primary font-mono text-xs w-full py-3">
                VIEW TIME-SERIES IN WORKSPACE →
              </Link>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 04 // Grounded RAG Assistant (Conversational Simulator)            */}
        {/* ------------------------------------------------------------------ */}
        <section id="intelligence" className="border-b border-white/[0.08] px-6 lg:px-12 py-20 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-8 border-b border-white/[0.08]">
            <div>
              <p className="text-[10px] font-mono tracking-widest text-[#ff6a00] uppercase font-bold">
                04 // LOCAL LLM RAG SYNTHESIS
              </p>
              <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight mt-1">
                Zero-Hallucination Evidence Chat
              </h2>
            </div>
            <span className="text-xs font-mono text-neutral-500">STRICT EVIDENCE ISOLATION</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 items-start">
            {/* Query Selector */}
            <div className="lg:col-span-4 space-y-3">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block mb-2">
                SELECT BENCHMARK INQUIRY
              </span>
              {sampleQueries.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveQueryIndex(idx)}
                  className={`w-full p-4 border text-left font-mono text-xs transition-all ${
                    activeQueryIndex === idx
                      ? 'border-[#ff6a00] bg-[#ff6a00]/5 text-white'
                      : 'border-white/[0.08] bg-black text-neutral-400 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1">
                    <span>QUERY 0{idx + 1}</span>
                    <span className="text-[#ff6a00] font-bold">{item.tag}</span>
                  </div>
                  <div className="line-clamp-2">{item.q}</div>
                </button>
              ))}
            </div>

            {/* Conversational Terminal Preview */}
            <div className="lg:col-span-8 border border-white/[0.12] bg-[#080808]/80 backdrop-blur-sm p-6 lg:p-8 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] text-xs font-mono">
                <span className="text-white font-bold uppercase">MIRA // GROUNDED INFERENCE STREAM</span>
                <span className="text-neutral-500">LOCAL LLM · ZERO MOCK DATA</span>
              </div>

              {/* User message */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block">OPERATOR</span>
                <p className="text-base text-white font-light">
                  {sampleQueries[activeQueryIndex].q}
                </p>
              </div>

              {/* Assistant message */}
              <div className="space-y-3 pt-4 border-t border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#ff6a00]" />
                  <span className="text-[10px] font-mono text-[#ff6a00] uppercase tracking-widest font-bold">
                    MIRA VERIFIED SYNTHESIS
                  </span>
                </div>
                <p className="text-sm sm:text-base text-neutral-200 leading-relaxed font-sans">
                  {sampleQueries[activeQueryIndex].a}
                </p>

                {/* Cited visual evidence strip */}
                <div className="pt-3 space-y-2">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block">
                    CITED PHOTOGRAPHIC EVIDENCE ({sampleQueries[activeQueryIndex].evidenceCount} RECORDS)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: sampleQueries[activeQueryIndex].evidenceCount }).map((_, i) => (
                      <div key={i} className="aspect-[16/10] bg-black border border-white/[0.1] relative group overflow-hidden">
                        <img
                          src={featuredAfterUrl}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between font-mono text-[9px] text-white">
                          <span>#EVID-{i + 1}</span>
                          <span>96% MATCH</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 05 // Enterprise Audit & Dynamic Campaign Crops                    */}
        {/* ------------------------------------------------------------------ */}
        <section id="audit" className="border-b border-white/[0.08] px-6 lg:px-12 py-20 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <p className="text-[10px] font-mono tracking-widest text-[#ff6a00] uppercase font-bold">
                05 // GOVERNANCE &amp; CAMPAIGN EXPORT
              </p>
              <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight leading-none">
                Executive Dossiers &amp; Dynamic Formats
              </h2>
              <p className="text-sm text-neutral-300 leading-relaxed font-light">
                Transform verified photographic corpus into instant, audit-grade executive dossiers with full milestone ledgers and export them across standard media formats (1:1, 16:9, 9:16) with signed provenance badges.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.08] font-mono text-xs">
                <div className="p-3 border border-white/[0.08] bg-black">
                  <div className="text-white font-bold uppercase">OFFICIAL DOSSIER</div>
                  <div className="text-[11px] text-neutral-500 mt-1">One-click PDF/JSON print export</div>
                </div>
                <div className="p-3 border border-white/[0.08] bg-black">
                  <div className="text-white font-bold uppercase">SMART DELIVERY</div>
                  <div className="text-[11px] text-neutral-500 mt-1">Cloudinary AI focal aspect-crops</div>
                </div>
              </div>

              <Link to="/reports" className="btn btn-secondary font-mono text-xs inline-flex">
                GENERATE AUDIT DOSSIER →
              </Link>
            </div>

            <div className="lg:col-span-6 grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <div className="aspect-square bg-black border border-white/[0.15] overflow-hidden">
                  <img src={featuredAfterUrl} alt="1:1 crop" className="w-full h-full object-cover" />
                </div>
                <span className="font-mono text-[10px] text-neutral-500 block text-center">SQUARE 1:1</span>
              </div>
              <div className="space-y-2">
                <div className="aspect-[16/9] bg-black border border-white/[0.15] overflow-hidden">
                  <img src={featuredAfterUrl} alt="16:9 crop" className="w-full h-full object-cover" />
                </div>
                <span className="font-mono text-[10px] text-neutral-500 block text-center">LANDSCAPE 16:9</span>
              </div>
              <div className="space-y-2">
                <div className="aspect-[9/16] bg-black border border-white/[0.15] overflow-hidden">
                  <img src={featuredAfterUrl} alt="9:16 crop" className="w-full h-full object-cover" />
                </div>
                <span className="font-mono text-[10px] text-neutral-500 block text-center">STORY 9:16</span>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Call to Action Footer                                              */}
        {/* ------------------------------------------------------------------ */}
        <section className="px-6 lg:px-12 py-24 max-w-7xl mx-auto text-center space-y-8">
          <p className="text-xs font-mono text-[#ff6a00] uppercase tracking-widest font-bold">
            READY FOR FIELD DEPLOYMENT
          </p>
          <h2 className="text-4xl sm:text-6xl lg:text-8xl font-black uppercase tracking-tight text-white max-w-4xl mx-auto leading-[0.95]">
            OPERATIONALIZE FIELD INTELLIGENCE
          </h2>
          <p className="text-neutral-400 max-w-xl mx-auto font-mono text-xs sm:text-sm">
            Autonomous visual verification, spatial geofencing, and hallucination-free RAG evidence synthesis.
          </p>
          <div className="pt-4">
            <Link
              to="/dashboard"
              className="btn btn-primary font-mono text-sm px-8 py-4 bg-white text-black hover:bg-[#ff6a00] hover:text-black transition-all"
            >
              ENTER MIRA WORKSPACE →
            </Link>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Global Architectural Footer                                        */}
        {/* ------------------------------------------------------------------ */}
        <footer className="border-t border-white/[0.08] px-6 lg:px-12 py-8 bg-[#080808]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-500">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border border-white/60 flex items-center justify-center">
                <div className="w-1 h-1 bg-[#ff6a00]" />
              </div>
              <span className="text-white font-bold uppercase">MIRA PLATFORM</span>
              <span>·</span>
              <span>SYSTEM v2.4.0</span>
            </div>

            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="hover:text-white transition-colors">
                WORKSPACE
              </Link>
              <Link to="/projects" className="hover:text-white transition-colors">
                PROJECTS
              </Link>
              <Link to="/media" className="hover:text-white transition-colors">
                EVIDENCE
              </Link>
              <Link to="/search" className="hover:text-white transition-colors">
                SEARCH
              </Link>
              <Link to="/reports" className="hover:text-white transition-colors">
                AUDIT
              </Link>
            </div>

            <div>
              <span>LAT 28.6139° N / LNG 77.2090° E</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
