import React, { useState } from 'react';
import { useSearch } from '../hooks/search';
import { useProjects } from '../hooks/projects';
import { useAssetTransformations } from '../hooks/media';
import { 
  Search as SearchIcon, 
  Loader2, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Folder, 
  ExternalLink, 
  X, 
  Layers, 
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Copy,
  Check,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { SearchResultItem } from '../types';

const SAMPLE_QUERIES = [
  "Workers installing solar panels",
  "Road construction and asphalt paving",
  "River plastic cleanup and floating booms",
  "Heavy excavator digging trenches",
  "Solar battery storage and inverter station",
  "Water quality monitoring sensors"
];

const PRESET_CLOUDINARY_TAGS = [
  { id: '', label: 'All Tags' },
  { id: 'verified', label: '✓ Verified' },
  { id: 'solar', label: '☀️ Solar' },
  { id: 'road_construction', label: '🛣️ Road' },
  { id: 'plastic_cleanup', label: '🌊 Cleanup' },
  { id: 'mira_field', label: '📍 Field Raw' },
];

export default function Search() {
  const [query, setQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activityFilter, setActivityFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [useHybrid, setUseHybrid] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [activeModalItem, setActiveModalItem] = useState<SearchResultItem | null>(null);

  // Cloudinary Lightbox Modal state
  const [modalTab, setModalTab] = useState<'original' | 'provenance' | 'campaign'>('original');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const { data: assetTransformations } = useAssetTransformations(activeModalItem?.asset_id || null);

  const searchMutation = useSearch();
  const { data: projects } = useProjects();
  const navigate = useNavigate();

  const handleSearch = (searchQuery: string = query, overrideTag: string = selectedTag) => {
    if (!searchQuery.trim() && !overrideTag) return;
    searchMutation.mutate({
      query: searchQuery.trim() || 'field evidence',
      project_id: selectedProjectId || undefined,
      activity: activityFilter.trim() || undefined,
      location: locationFilter.trim() || undefined,
      use_cloudinary_hybrid: useHybrid,
      cloudinary_tag: overrideTag || undefined,
      top_k: 12,
      min_score: 0.35
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const handleChipClick = (sampleQuery: string) => {
    setQuery(sampleQuery);
    handleSearch(sampleQuery);
  };

  const handleTagClick = (tagId: string) => {
    setSelectedTag(tagId);
    handleSearch(query, tagId);
  };

  const clearFilters = () => {
    setSelectedProjectId('');
    setActivityFilter('');
    setLocationFilter('');
    setSelectedTag('');
    if (query.trim()) {
      searchMutation.mutate({
        query: query.trim(),
        use_cloudinary_hybrid: useHybrid,
        top_k: 12,
        min_score: 0.35
      });
    }
  };

  const hasActiveFilters = Boolean(selectedProjectId || activityFilter || locationFilter || selectedTag);

  const getScoreColor = (score: number) => {
    if (score >= 0.5) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 0.35) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Search Header Banner */}
      <header className="px-8 pt-8 pb-6 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 text-primary-700 border border-primary-100 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Cloudinary Search API + Qdrant Vectors
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Hybrid Multimodal Evidence Retrieval
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Combine Cloudinary Boolean metadata/tag expressions with deep semantic vector matching.
            </p>
          </div>

          {/* Search Input Box */}
          <form onSubmit={handleFormSubmit} className="relative mb-3">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Workers installing solar panels on rooftops..."
              className="w-full pl-12 pr-28 py-3.5 bg-gray-50/80 hover:bg-gray-50 focus:bg-white border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 text-sm"
              autoFocus
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors ${
                  hasActiveFilters || showFilters
                    ? 'bg-primary-50 text-primary-700 border-primary-200' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
                title="Toggle metadata filters"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilters && (
                  <span className="w-2 h-2 bg-primary-600 rounded-full"></span>
                )}
              </button>
              
              <button 
                type="submit"
                disabled={searchMutation.isPending || (!query.trim() && !selectedTag)}
                className="btn-primary py-2 px-4 shadow-none disabled:opacity-50 text-xs flex items-center gap-1.5"
              >
                {searchMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
              </button>
            </div>
          </form>

          {/* Cloudinary Hybrid Mode Bar & Tag Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 px-3 bg-slate-900 text-white rounded-xl mb-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUseHybrid(!useHybrid)}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                  useHybrid ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Cloudinary Hybrid Mode: {useHybrid ? 'ON' : 'OFF'}</span>
              </button>
              <span className="text-[11px] text-gray-400 hidden sm:inline">
                {useHybrid ? 'Merging Cloudinary Search API + Qdrant' : 'Pure Qdrant vector retrieval'}
              </span>
            </div>

            {/* Cloudinary Tag Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Tags:</span>
              {PRESET_CLOUDINARY_TAGS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTagClick(t.id)}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                    selectedTag === t.id 
                      ? 'bg-primary-500 text-white font-semibold shadow-xs' 
                      : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Collapsible Filter Bar */}
          {showFilters && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Project Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Folder className="w-3 h-3 text-gray-500" />
                    Filter by Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 outline-none"
                  >
                    <option value="">All Projects</option>
                    {projects?.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Activity Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-gray-500" />
                    Filter by Activity
                  </label>
                  <input
                    type="text"
                    value={activityFilter}
                    onChange={(e) => setActivityFilter(e.target.value)}
                    placeholder="e.g. installation, paving"
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>

                {/* Location Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-500" />
                    Filter by Location
                  </label>
                  <input
                    type="text"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    placeholder="e.g. Mayur Vihar, Yamuna"
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-3 pt-2 border-t border-gray-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Clear filters
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSearch()}
                    className="btn-primary text-xs py-1 px-3"
                  >
                    Apply Filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Suggestion Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar text-xs">
            <span className="text-gray-400 flex items-center gap-1 whitespace-nowrap text-[11px] font-medium mr-1">
              Suggestions:
            </span>
            {SAMPLE_QUERIES.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(sample)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-gray-100 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 border border-transparent text-gray-600 transition-all text-xs"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Results Container */}
      <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Loading State */}
          {searchMutation.isPending && (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-2 text-primary-600 text-sm py-4">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Executing hybrid search across Cloudinary Search API and Qdrant vector index...</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="card overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-gray-200"></div>
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-100 rounded w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Initial State */}
          {!searchMutation.isPending && !searchMutation.isSuccess && !searchMutation.isError && (
            <div className="text-center py-20 bg-white border border-gray-200 rounded-xl border-dashed">
              <SearchIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900">Explore Multimodal Evidence</h3>
              <p className="text-gray-500 mt-1 text-sm max-w-md mx-auto">
                Type a query above or click any Cloudinary tag to perform hybrid retrieval combining structured CDN metadata and semantic vectors.
              </p>
            </div>
          )}

          {/* Error State */}
          {searchMutation.isError && (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center max-w-lg mx-auto">
              <p className="text-sm font-semibold text-red-800">Unable to search evidence</p>
              <p className="text-xs text-red-600 mt-1">
                An error occurred while querying the search layers. Please verify backend services and try again.
              </p>
              <button
                onClick={() => handleSearch()}
                className="mt-4 btn-primary text-xs py-1.5 px-4"
              >
                Retry Search
              </button>
            </div>
          )}

          {/* Empty Results State */}
          {searchMutation.isSuccess && searchMutation.data.results.length === 0 && (
            <div className="text-center py-20 bg-white border border-gray-200 rounded-xl border-dashed">
              <SearchIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900">No matching evidence found</h3>
              <p className="text-gray-500 mt-1 text-sm max-w-md mx-auto">
                No indexed media crossed the relevance threshold (≥ 35% similarity) for "{searchMutation.data.query}".
                {hasActiveFilters && " Try clearing active metadata filters."}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 btn-secondary text-xs"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Success Results Grid */}
          {searchMutation.isSuccess && searchMutation.data.results.length > 0 && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-gray-200">
                <p className="text-xs font-medium text-gray-500">
                  Found <span className="font-semibold text-gray-900">{searchMutation.data.results.length}</span> relevant evidence match(es) for <span className="font-semibold text-primary-700">"{searchMutation.data.query}"</span>
                </p>
                <div className="flex items-center gap-2">
                  {searchMutation.data.hybrid_mode && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-primary-50 text-primary-700 rounded-full text-[11px] font-bold border border-primary-200">
                      <Zap className="w-3 h-3" /> Cloudinary Hybrid Merged
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[11px] font-medium border border-gray-200">
                    Threshold: ≥ 35%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchMutation.data.results.map((result) => (
                  <div 
                    key={result.asset_id}
                    onClick={() => setActiveModalItem(result)}
                    className="card flex flex-col group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 bg-white"
                  >
                    {/* Thumbnail with overlay badges */}
                    <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                      {result.cloudinary_url ? (
                        <img 
                          src={result.cloudinary_url} 
                          alt={result.description} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          No Image
                        </div>
                      )}
                      
                      {/* Similarity Score & Search Source Pill */}
                      <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1">
                        <span className={`px-2.5 py-0.5 border rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${getScoreColor(result.score)}`}>
                          {Math.round(result.score * 100)}% Match
                        </span>

                        {/* Search Source Badge */}
                        {result.search_source === 'HYBRID' && (
                          <span className="px-2 py-0.5 bg-primary-600/90 text-white rounded-md text-[10px] font-bold shadow-xs flex items-center gap-1 backdrop-blur-sm">
                            <Zap className="w-3 h-3 text-amber-300" /> Hybrid Match
                          </span>
                        )}
                        {result.search_source === 'CLOUDINARY_SEARCH' && (
                          <span className="px-2 py-0.5 bg-indigo-600/90 text-white rounded-md text-[10px] font-bold shadow-xs flex items-center gap-1 backdrop-blur-sm">
                            <Sparkles className="w-3 h-3 text-indigo-200" /> Cloudinary Search API
                          </span>
                        )}
                      </div>

                      {/* Project Tag */}
                      {result.project_name && (
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-black/60 text-white border border-white/20 rounded-full text-xs font-medium backdrop-blur-sm flex items-center gap-1 max-w-[65%] truncate">
                          <Folder className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{result.project_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Content Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        {result.activity && (
                          <h3 className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1 mb-1">
                            {result.activity}
                          </h3>
                        )}
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {result.description}
                        </p>
                      </div>

                      {/* Card Footer Metadata */}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                        {result.location ? (
                          <span className="flex items-center gap-1 truncate text-primary-700 font-medium">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{result.location}</span>
                          </span>
                        ) : result.latitude && result.longitude ? (
                          <span className="flex items-center gap-1 font-mono text-gray-400">
                            <MapPin className="w-3 h-3" />
                            {result.latitude.toFixed(2)}, {result.longitude.toFixed(2)}
                          </span>
                        ) : (
                          <span></span>
                        )}

                        {result.timestamp && (
                          <span className="flex items-center gap-1 text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(result.timestamp), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Evidence Detail Lightbox Modal with Cloudinary Transformations */}
      {activeModalItem && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex justify-between items-center bg-gray-50/70">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span>Evidence Intelligence</span>
                  <span className={`px-2 py-0.5 border rounded-full text-[11px] font-semibold ${getScoreColor(activeModalItem.score)}`}>
                    {Math.round(activeModalItem.score * 100)}% Match
                  </span>
                  {activeModalItem.search_source === 'HYBRID' && (
                    <span className="px-2 py-0.5 bg-primary-600 text-white rounded text-[10px] font-bold">
                      ⚡ Hybrid Match
                    </span>
                  )}
                </h2>
                {activeModalItem.project_name && (
                  <p className="text-xs text-primary-700 font-medium mt-0.5">
                    Project: {activeModalItem.project_name}
                  </p>
                )}
              </div>
              <button 
                onClick={() => setActiveModalItem(null)} 
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cloudinary Transformation Mode Switcher */}
            <div className="px-5 pt-3 pb-2 bg-gray-50 border-b border-gray-200 flex items-center gap-1.5 overflow-x-auto flex-shrink-0">
              <button
                onClick={() => setModalTab('original')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  modalTab === 'original' ? 'bg-white text-gray-900 shadow-xs border border-gray-200' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>Original Delivery</span>
              </button>
              <button
                onClick={() => setModalTab('provenance')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  modalTab === 'provenance' ? 'bg-emerald-50 text-emerald-800 shadow-xs border border-emerald-200' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Provenance Watermark
              </button>
              <button
                onClick={() => setModalTab('campaign')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  modalTab === 'campaign' ? 'bg-primary-50 text-primary-800 shadow-xs border border-primary-200' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-primary-600" /> Campaign Crops
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Dynamic Image Canvas */}
              <div className="rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-950 flex items-center justify-center relative">
                {modalTab === 'original' && (
                  <img 
                    src={assetTransformations?.optimized_url || activeModalItem.cloudinary_url} 
                    alt="Original Delivery" 
                    onError={(e) => {
                      if (activeModalItem.cloudinary_url && e.currentTarget.src !== activeModalItem.cloudinary_url) {
                        e.currentTarget.src = activeModalItem.cloudinary_url;
                      }
                    }}
                    className="max-h-64 w-full object-contain"
                  />
                )}

                {modalTab === 'provenance' && (
                  <img 
                    src={assetTransformations?.verified_badge_url || activeModalItem.cloudinary_url} 
                    alt="Provenance Watermarked" 
                    onError={(e) => {
                      if (activeModalItem.cloudinary_url && e.currentTarget.src !== activeModalItem.cloudinary_url) {
                        e.currentTarget.src = activeModalItem.cloudinary_url;
                      }
                    }}
                    className="max-h-64 w-full object-contain"
                  />
                )}

                {modalTab === 'campaign' && (
                  <div className="grid grid-cols-3 gap-2 p-2 w-full h-full items-center bg-gray-900">
                    <div className="space-y-1 text-center">
                      <div className="aspect-square bg-black rounded border border-gray-700 overflow-hidden">
                        <img 
                          src={assetTransformations?.campaign_aspects?.square_1_1 || activeModalItem.cloudinary_url} 
                          alt="Square 1:1"
                          onError={(e) => {
                            if (activeModalItem.cloudinary_url && e.currentTarget.src !== activeModalItem.cloudinary_url) {
                              e.currentTarget.src = activeModalItem.cloudinary_url;
                            }
                          }}
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <span className="text-[10px] text-gray-300 font-mono">1:1 Square</span>
                    </div>
                    <div className="space-y-1 text-center">
                      <div className="aspect-video bg-black rounded border border-gray-700 overflow-hidden">
                        <img 
                          src={assetTransformations?.campaign_aspects?.landscape_16_9 || activeModalItem.cloudinary_url} 
                          alt="Landscape 16:9"
                          onError={(e) => {
                            if (activeModalItem.cloudinary_url && e.currentTarget.src !== activeModalItem.cloudinary_url) {
                              e.currentTarget.src = activeModalItem.cloudinary_url;
                            }
                          }}
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <span className="text-[10px] text-gray-300 font-mono">16:9 Landscape</span>
                    </div>
                    <div className="space-y-1 text-center">
                      <div className="aspect-[9/16] max-h-44 mx-auto bg-black rounded border border-gray-700 overflow-hidden">
                        <img 
                          src={assetTransformations?.campaign_aspects?.story_9_16 || activeModalItem.cloudinary_url} 
                          alt="Story 9:16"
                          onError={(e) => {
                            if (activeModalItem.cloudinary_url && e.currentTarget.src !== activeModalItem.cloudinary_url) {
                              e.currentTarget.src = activeModalItem.cloudinary_url;
                            }
                          }}
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <span className="text-[10px] text-gray-300 font-mono">9:16 Story</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Description & Activity */}
              <div className="space-y-3">
                {activeModalItem.activity && (
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Observed Activity</span>
                    <p className="text-xs font-semibold text-gray-900 mt-0.5">{activeModalItem.activity}</p>
                  </div>
                )}

                {activeModalItem.description && (
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Moondream Description</span>
                    <p className="text-xs text-gray-700 mt-0.5 leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      {activeModalItem.description}
                    </p>
                  </div>
                )}

                {/* Detected Objects */}
                {activeModalItem.objects && activeModalItem.objects.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Detected Objects</span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeModalItem.objects.map((obj, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 rounded text-[11px]">
                          {obj}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata Row */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 text-xs text-gray-600">
                  {activeModalItem.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" />
                      <span className="truncate">{activeModalItem.location}</span>
                    </div>
                  )}
                  {activeModalItem.timestamp && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>{format(new Date(activeModalItem.timestamp), 'PPP')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center flex-shrink-0">
              {activeModalItem.project_id ? (
                <button
                  type="button"
                  onClick={() => {
                    const pid = activeModalItem.project_id;
                    setActiveModalItem(null);
                    navigate(`/projects/${pid}`);
                  }}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <span>View Project</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : <span></span>}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    let urlToCopy = activeModalItem.cloudinary_url;
                    if (modalTab === 'provenance' && assetTransformations?.verified_badge_url) {
                      urlToCopy = assetTransformations.verified_badge_url;
                    } else if (modalTab === 'campaign' && assetTransformations?.campaign_aspects?.square_1_1) {
                      urlToCopy = assetTransformations.campaign_aspects.square_1_1;
                    } else if (assetTransformations?.optimized_url) {
                      urlToCopy = assetTransformations.optimized_url;
                    }
                    if (urlToCopy) {
                      navigator.clipboard.writeText(urlToCopy);
                      setCopiedUrl('search_modal');
                      setTimeout(() => setCopiedUrl(null), 2000);
                    }
                  }}
                  className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-3"
                >
                  {copiedUrl === 'search_modal' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUrl === 'search_modal' ? 'Copied URL!' : 'Copy URL'}
                </button>
                <a 
                  href={
                    modalTab === 'provenance'
                      ? (assetTransformations?.verified_badge_url || activeModalItem.cloudinary_url)
                      : modalTab === 'campaign'
                      ? (assetTransformations?.campaign_aspects?.square_1_1 || activeModalItem.cloudinary_url)
                      : (assetTransformations?.optimized_url || activeModalItem.cloudinary_url)
                  } 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-secondary text-xs flex items-center gap-1 py-1 px-3"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open HD
                </a>
                <button 
                  type="button" 
                  onClick={() => setActiveModalItem(null)} 
                  className="btn-primary text-xs py-1 px-4"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}