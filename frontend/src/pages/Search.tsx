import { useState } from 'react';
import { ScanSearch, SlidersHorizontal, X, ExternalLink, Sparkle } from 'lucide-react';
import { useSearch, type SearchRequestParams } from '../hooks/search';
import { useProjects } from '../hooks/projects';
import { useAssetTransformations } from '../hooks/media';
import {
  EmptyState,
  ErrorState,
  Skeleton,
  Chip,
  Modal,
  SegmentedControl,
  Field,
  ScoreReadout,
  Coordinate,
} from '../components/ui';
import { SEARCH_SOURCE_LABEL, humanizeToken, shortDate } from '../lib/presentation';
import type { SearchResultItem } from '../types';

const EXAMPLES = [
  'cable trenching along the array',
  'sluice gate discharge',
  'turbine blade staged for lift',
  'box culvert formwork',
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
      title="Evidence detail"
      width="max-w-3xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          <a
            href={item.cloudinary_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary print-url"
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            Open original
          </a>
        </>
      }
    >
      <div className="px-4 pt-3">
        <SegmentedControl<ResultTab>
          ariaLabel="Transformation view"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'original', label: 'Optimised' },
            { value: 'provenance', label: 'Provenance' },
            { value: 'campaign', label: 'Campaign' },
          ]}
        />
      </div>

      <div className="p-4 space-y-4">
        <div className="panel-sunken aspect-[16/9] flex items-center justify-center overflow-hidden">
          <img
            src={current}
            alt={item.description}
            className="max-h-full max-w-full object-contain"
          />
        </div>

        <p className="text-[13px] text-ink-2 leading-relaxed">{item.description}</p>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <dt className="label">Similarity</dt>
            <dd className="mt-1">
              <ScoreReadout score={item.score} />
            </dd>
          </div>
          <div>
            <dt className="label">Activity</dt>
            <dd className="value text-[12px] text-ink-2 mt-1">{humanizeToken(item.activity)}</dd>
          </div>
          <div>
            <dt className="label">Scene</dt>
            <dd className="value text-[12px] text-ink-2 mt-1 truncate">{humanizeToken(item.scene)}</dd>
          </div>
          <div>
            <dt className="label">Position</dt>
            <dd className="mt-1">
              <Coordinate lat={item.latitude} lng={item.longitude} />
            </dd>
          </div>
        </dl>

        {(item.objects?.length ?? 0) > 0 && (
          <div>
            <span className="label">Detected objects</span>
            <ul className="flex flex-wrap gap-1 mt-1.5">
              {item.objects?.map((object) => (
                <li key={object}>
                  <Chip>{humanizeToken(object)}</Chip>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'campaign' && aspects.length > 0 && (
          <ul className="grid grid-cols-3 gap-3">
            {aspects.map((aspect) => (
              <li key={aspect.label} className="panel overflow-hidden">
                <img
                  src={aspect.url}
                  alt={`${aspect.label} campaign export`}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full object-cover bg-sunken"
                />
                <div className="px-2 py-1.5 rule-t">
                  <span className="label">{aspect.label}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
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
      // Sent only when set. The CDN treats an empty string as a literal tag
      // filter, so it has to be omitted rather than blanked.
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
    <div className="p-4 lg:p-6 space-y-4">
      {/* Query console */}
      <div className="panel p-3 space-y-3">
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <div className="relative flex-1">
            <ScanSearch
              className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3"
              aria-hidden="true"
            />
            <label htmlFor="search-query" className="sr-only">
              Search the evidence corpus
            </label>
            <input
              id="search-query"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe the scene, activity or object"
              className="field pl-8 h-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHybrid((v) => !v)}
              aria-pressed={hybrid}
              className={hybrid ? 'btn btn-signal' : 'btn btn-secondary'}
              title="Merge the vector index with Cloudinary boolean tag filters"
            >
              <Sparkle className="w-3.5 h-3.5" aria-hidden="true" />
              Hybrid
            </button>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              aria-controls="search-filters"
              className={filtersActive || showFilters ? 'btn btn-secondary' : 'btn btn-ghost'}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              Filters
              {filtersActive && (
                <span className="w-1.5 h-1.5 bg-signal-500 rounded-[1px]" aria-hidden="true" />
              )}
            </button>
            <button type="submit" disabled={mutation.isPending || !query.trim()} className="btn btn-primary">
              {mutation.isPending ? 'Searching' : 'Search'}
            </button>
          </div>
        </form>

        {showFilters && (
          <div
            id="search-filters"
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 rule-t"
          >
            <Field label="Limit results">
              {(p) => (
                <input
                  {...p}
                  type="number"
                  min={1}
                  max={100}
                  className="field field-sm value"
                  value={topK}
                  onChange={(e) => setTopK(e.target.value)}
                />
              )}
            </Field>
            <Field label="Minimum similarity" hint="0 to 1">
              {(p) => (
                <input
                  {...p}
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  className="field field-sm value"
                  value={minScore}
                  onChange={(e) => setMinScore(e.target.value)}
                />
              )}
            </Field>
            <Field label="Project">
              {(p) => (
                <select
                  {...p}
                  className="field field-sm"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">All projects</option>
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field
              label="CDN tag"
              className="sm:col-span-3"
              hint="Matches tags already written back to Cloudinary. Applies to the CDN index, so it needs hybrid mode to affect the vector results too."
            >
              {(p) => (
                <input
                  {...p}
                  type="text"
                  className="field field-sm value"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="verified  or  array_commissioning"
                />
              )}
            </Field>
            {filtersActive && (
              <div className="sm:col-span-3">
                <button type="button" onClick={clearFilters} className="btn btn-sm btn-ghost">
                  <X className="w-3 h-3" aria-hidden="true" />
                  Reset filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggestions before a first search */}
      {!mutation.data && !mutation.isPending && (
        <div className="panel p-4">
          <span className="label">Try a natural description</span>
          <ul className="flex flex-wrap gap-1.5 mt-2.5">
            {EXAMPLES.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery(example);
                    run({ query: example });
                  }}
                  className="chip border-line bg-sunken text-ink-2 hover:border-brand-300 hover:text-brand-700 transition-colors"
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mutation.isPending && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[132px]" />
          ))}
        </div>
      )}

      {mutation.isError && (
        <ErrorState title="Search failed" detail="The retrieval request did not complete." />
      )}

      {mutation.data && !mutation.isPending && (
        <section className="space-y-3" aria-live="polite">
          <div className="panel px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <span className="label">Matches</span>
            <span className="value text-[15px] font-semibold">{results.length}</span>
            <span className="meta">for</span>
            <span className="value text-[13px] text-ink">{mutation.data.query}</span>
            <div className="ml-auto flex items-center gap-2">
              <Chip className={mutation.data.hybrid_mode ? 'chip-signal' : 'chip-neutral'}>
                {mutation.data.hybrid_mode ? 'hybrid index' : 'vector only'}
              </Chip>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="panel">
              <EmptyState
                icon={ScanSearch}
                title="No evidence above the threshold"
                description="Lower the minimum similarity, widen the result limit, or describe the scene differently."
                action={
                  filtersActive ? (
                    <button type="button" onClick={clearFilters} className="btn btn-secondary">
                      Reset filters
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {results.map((item) => (
                <li key={item.asset_id} className="panel group flex flex-col">
                  <button
                    type="button"
                    onClick={() => setDetail(item)}
                    aria-label={`Open evidence ${item.asset_id}`}
                    className="relative block aspect-[16/10] bg-sunken overflow-hidden text-left"
                  >
                    <img
                      src={item.cloudinary_url}
                      alt={item.description}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <span className="absolute top-1.5 left-1.5 flex gap-1">
                      <Chip className="bg-ink/75 text-white border-ink/50">
                        {SEARCH_SOURCE_LABEL[item.search_source ?? ''] ?? 'vector'}
                      </Chip>
                    </span>
                  </button>

                  <div className="p-3 flex-1 flex flex-col gap-2">
                    <p className="text-[12.5px] text-ink leading-snug line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Chip className="chip-brand">{humanizeToken(item.activity)}</Chip>
                      {item.project_name && (
                        <span className="meta truncate">{item.project_name}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-auto pt-1.5 rule-t">
                      <ScoreReadout score={item.score} />
                      <span className="meta">
                        {item.timestamp ? shortDate(item.timestamp) : 'undated'}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <ResultDialog item={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
