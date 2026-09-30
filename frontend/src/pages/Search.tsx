import { useState } from 'react';
import { useSearch, type SearchRequestParams } from '../hooks/search';
import { useProjects } from '../hooks/projects';
import { useAssetTransformations } from '../hooks/media';
import {
  EmptyState,
  ErrorState,
  Coordinate,
  Modal,
  SegmentedControl,
  Field,
  ScoreReadout,
} from '../components/ui';
import { SEARCH_SOURCE_LABEL, humanizeToken } from '../lib/presentation';
import type { SearchResultItem } from '../types';

const EXAMPLES = [
  'cable trenching along the array',
  'sluice gate discharge and culvert formwork',
  'turbine blade staged for lift',
  'yellow bulldozer working on prepared road bed',
  'asphalt paving machine resurfacing road',
];

type ResultTab = 'original' | 'provenance' | 'campaign';

function ResultDialog({ item, onClose }: { item: SearchResultItem | null; onClose: () => void }) {
  const [tab, setTab] = useState<ResultTab>('original');
  const { data } = useAssetTransformations(item?.asset_id ?? null);

  if (!item) return null;

  const aspects = data
    ? [
        { label: 'Square 1:1', url: data.campaign_aspects.square_1_1 },
        { label: 'Landscape 16:9', url: data.campaign_aspects.landscape_16_9 },
        { label: 'Story 9:16', url: data.campaign_aspects.story_9_16 },
      ]
    : [];

  const current =
    tab === 'original'
      ? (data?.optimized_url ?? item.cloudinary_url)
      : tab === 'provenance'
        ? (data?.verified_badge_url ?? item.cloudinary_url)
        : (aspects[0]?.url ?? item.cloudinary_url);

  return (
    <Modal
      open
      onClose={onClose}
      title="Evidence Inspector"
      width="max-w-3xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary font-mono text-xs">
            CLOSE
          </button>
          <a
            href={item.cloudinary_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary font-mono text-xs"
          >
            ORIGINAL PHOTOGRAPH →
          </a>
        </>
      }
    >
      <div className="space-y-4">
        <SegmentedControl<ResultTab>
          ariaLabel="Transformation view"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'original', label: 'Optimized CDN' },
            { value: 'provenance', label: 'Provenance Badge' },
            { value: 'campaign', label: 'Campaign Aspects' },
          ]}
        />

        <div className="aspect-[16/10] flex items-center justify-center overflow-hidden bg-black border border-white/[0.08]">
          <img
            src={current}
            alt={item.description}
            className="max-h-full max-w-full object-contain"
          />
        </div>

        <p className="text-[13.5px] text-neutral-300 leading-relaxed border-t border-white/[0.08] pt-3 font-sans">
          {item.description}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-white/[0.08] text-xs font-mono">
          <div>
            <span className="text-[10px] text-neutral-500 uppercase block tracking-wider">SEMANTIC MATCH</span>
            <div className="mt-1">
              <ScoreReadout score={item.score} />
            </div>
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 uppercase block tracking-wider">ACTIVITY</span>
            <span className="text-neutral-300 mt-1 block truncate">
              {humanizeToken(item.activity) || 'General'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 uppercase block tracking-wider">SCENE</span>
            <span className="text-neutral-300 mt-1 block truncate">
              {humanizeToken(item.scene) || 'Field Site'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 uppercase block tracking-wider">COORDINATES</span>
            <div className="mt-1">
              <Coordinate lat={item.latitude} lng={item.longitude} />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function Search() {
  const { data: projects } = useProjects();
  const mutation = useSearch();

  const [query, setQuery] = useState('');
  const [hybrid, setHybrid] = useState(true);
  const [projectId, setProjectId] = useState('');
  const [minScore, setMinScore] = useState('0.35');
  const [topK, setTopK] = useState('12');
  const [tag, setTag] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [detail, setDetail] = useState<SearchResultItem | null>(null);

  const results = mutation.data?.results ?? [];
  const filtersActive =
    projectId !== '' || minScore !== '0.35' || topK !== '12' || tag.trim() !== '';

  const run = (override?: Partial<SearchRequestParams>) => {
    const q = (override?.query ?? query).trim();
    if (!q) return;
    mutation.mutate({
      query: q,
      use_cloudinary_hybrid: override?.use_cloudinary_hybrid ?? hybrid,
      project_id: projectId || null,
      cloudinary_tag: tag.trim() || null,
      min_score: Number(minScore),
      top_k: Number(topK),
    });
  };

  const clearFilters = () => {
    setProjectId('');
    setMinScore('0.35');
    setTopK('12');
    setTag('');
  };

  return (
    <div className="p-6 sm:p-10 lg:p-14 space-y-12 max-w-6xl mx-auto">
      {/* Editorial Header */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono tracking-widest text-[#ff6a00] uppercase font-bold">
              05 // HYBRID RETRIEVAL ENGINE
            </p>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase mt-1">
              Search
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <button
              type="button"
              onClick={() => setHybrid((v) => !v)}
              className={`border px-2.5 py-1 transition-colors uppercase ${hybrid ? 'border-[#ff6a00] text-[#ff6a00] font-medium' : 'border-white/[0.1] text-neutral-500'}`}
            >
              HYBRID CDN INDEX: {hybrid ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`border px-2.5 py-1 transition-colors uppercase ${showFilters || filtersActive ? 'border-white text-white font-medium' : 'border-white/[0.1] text-neutral-500'}`}
            >
              FILTERS {filtersActive ? '●' : ''}
            </button>
          </div>
        </div>

        {/* Minimal Search Prompt Input */}
        <form
          className="pt-6 border-t border-white/[0.08]"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <div className="flex items-baseline justify-between gap-4">
            <input
              id="search-query"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="⌕  Describe scene, machinery, activity, or condition in natural language..."
              className="w-full bg-transparent text-lg sm:text-xl text-white placeholder:text-neutral-500 outline-none pb-3 border-b border-white/[0.12] focus:border-[#ff6a00] transition-colors font-sans"
            />
            <button
              type="submit"
              disabled={mutation.isPending || !query.trim()}
              className="btn btn-primary font-mono text-xs flex-shrink-0"
            >
              {mutation.isPending ? 'SEARCHING...' : 'SEARCH →'}
            </button>
          </div>
        </form>

        {/* Collapsible Minimal Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-b border-white/[0.08] pb-6">
            <Field label="Max Results (Top K)">
              {(p) => (
                <input
                  {...p}
                  type="number"
                  min={1}
                  max={100}
                  className="field"
                  value={topK}
                  onChange={(e) => setTopK(e.target.value)}
                />
              )}
            </Field>
            <Field label="Min Similarity (0-1)">
              {(p) => (
                <input
                  {...p}
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  className="field"
                  value={minScore}
                  onChange={(e) => setMinScore(e.target.value)}
                />
              )}
            </Field>
            <Field label="Project Target Scope">
              {(p) => (
                <select
                  {...p}
                  className="field"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">All Projects</option>
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            {filtersActive && (
              <div className="sm:col-span-3">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-mono text-neutral-400 hover:text-white transition-colors"
                >
                  RESET FILTERS
                </button>
              </div>
            )}
          </div>
        )}

        {/* Natural Language Suggestions */}
        {!mutation.data && !mutation.isPending && (
          <div className="space-y-2 pt-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 block">
              SUGGESTED QUERIES
            </span>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setQuery(example);
                    run({ query: example });
                  }}
                  className="text-xs font-mono text-neutral-400 hover:text-white hover:border-[#ff6a00]/40 border border-white/[0.08] px-3 py-1.5 transition-colors text-left"
                >
                  {example} →
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Results */}
      {mutation.isPending && (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-5 h-5 border border-[#ff6a00] border-t-transparent animate-spin rounded-full" />
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            Searching vector embedding space & CDN index...
          </span>
        </div>
      )}

      {mutation.isError && (
        <ErrorState title="Search Failed" detail="Could not retrieve search results from the AI pipeline." />
      )}

      {mutation.data && !mutation.isPending && (
        <section className="space-y-6" aria-live="polite">
          <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-3">
            <span className="text-xs font-mono text-neutral-400">
              {results.length} MATCH{results.length === 1 ? '' : 'ES'} FOR “{mutation.data.query}”
            </span>
            <span className="text-xs font-mono text-neutral-500 uppercase">
              {mutation.data.hybrid_mode ? 'HYBRID INDEX' : 'VECTOR ONLY'}
            </span>
          </div>

          {results.length === 0 ? (
            <EmptyState
              title="No Evidence Above Threshold"
              description="Try lowering the minimum similarity threshold or using a different query description."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {results.map((item) => (
                <div
                  key={item.asset_id}
                  className="space-y-3 group cursor-pointer"
                  onClick={() => setDetail(item)}
                >
                  <div className="relative aspect-[16/10] bg-black border border-white/[0.08] overflow-hidden">
                    <img
                      src={item.cloudinary_url}
                      alt={item.description}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/85 text-[10px] font-mono text-white border border-white/20 uppercase">
                      {SEARCH_SOURCE_LABEL[item.search_source ?? ''] ?? 'vector'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[13.5px] text-white font-normal line-clamp-2 leading-snug">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between text-xs font-mono text-neutral-500 pt-1">
                      <ScoreReadout score={item.score} />
                      {item.project_name && <span className="truncate max-w-[140px] text-neutral-400">{item.project_name}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <ResultDialog item={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
