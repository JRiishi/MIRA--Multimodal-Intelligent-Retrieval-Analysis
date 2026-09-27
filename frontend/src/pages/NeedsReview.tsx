import { useState } from 'react';
import { useMediaLibrary, useAssignMedia, useDeleteMedia } from '../hooks/media';
import { useProjects } from '../hooks/projects';
import { AlertCircle, CheckCircle2, MapPin, Folder, Trash2, Loader2, Check, Sparkles, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function NeedsReview() {
  const { data: media, isLoading } = useMediaLibrary();
  const { data: projects } = useProjects();
  const assignMutation = useAssignMedia();
  const deleteMutation = useDeleteMedia();

  const [selectedProjectMap, setSelectedProjectMap] = useState<{ [assetId: string]: string }>({});

  const unassignedOrReviewMedia = media?.filter(
    m => m.processing_status === 'NEEDS_REVIEW' || m.processing_status === 'UNASSIGNED'
  ) || [];

  const handleAssign = (assetId: string) => {
    const asset = media?.find(m => m.id === assetId);
    const targetProjId = selectedProjectMap[assetId] || asset?.project_id;
    if (!targetProjId) return;
    assignMutation.mutate({ assetId, projectId: targetProjId });
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null;
    const proj = projects?.find(p => p.id === projectId);
    return proj ? proj.name : null;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden font-sans">
      <header className="px-8 py-6 bg-white border-b border-gray-200 flex items-center justify-between shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Human In The Loop Review
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Review & Unassigned Media</h1>
          <p className="text-xs text-gray-500 mt-1">
            Media captures requiring verification, confirmation of AI-suggested project routing, or manual project assignment.
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs font-semibold text-gray-500">Pending Review:</span>
          <div className="text-xl font-bold text-amber-600 font-mono">{unassignedOrReviewMedia.length}</div>
        </div>
      </header>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="card aspect-square animate-pulse bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
          ) : unassignedOrReviewMedia.length === 0 ? (
            <div className="py-20 text-center bg-white border border-dashed border-gray-200 rounded-2xl shadow-xs">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-900">All Media Successfully Routed</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                There are currently no unassigned media captures or assets requiring manual review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unassignedOrReviewMedia.map(asset => {
                const effectiveTargetProjId = selectedProjectMap[asset.id] || asset.project_id || '';
                const isAssigningThis = assignMutation.isPending && assignMutation.variables?.assetId === asset.id;
                const isDeletingThis = deleteMutation.isPending && deleteMutation.variables === asset.id;
                const suggestedProjectName = getProjectName(asset.project_id);

                return (
                  <div key={asset.id} className="card bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                    <div>
                      {/* Media Thumbnail with status badge */}
                      <div className="aspect-video bg-gray-950 relative overflow-hidden group">
                        {asset.cloudinary_url ? (
                          <img 
                            src={asset.cloudinary_url} 
                            alt="Review Asset" 
                            onError={(e) => {
                              if (asset.cloudinary_url && e.currentTarget.src !== asset.cloudinary_url) {
                                e.currentTarget.src = asset.cloudinary_url;
                              }
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            loading="lazy" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No Image Available</div>
                        )}
                        
                        <div className={`absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                          asset.processing_status === 'NEEDS_REVIEW' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-gray-100 text-gray-700 border border-gray-300'
                        }`}>
                          {asset.processing_status.replace('_', ' ')}
                        </div>

                        {asset.cloudinary_url && (
                          <a
                            href={asset.cloudinary_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" /> Full View
                          </a>
                        )}
                      </div>

                      {/* Content details */}
                      <div className="p-4 space-y-3">
                        {/* Timestamp and GPS */}
                        <div className="flex justify-between items-center text-[11px] text-gray-500">
                          <span>{format(new Date(asset.uploaded_at), 'MMM d, yyyy h:mm a')}</span>
                          {asset.image_latitude != null && asset.image_longitude != null && (
                            <span className="flex items-center gap-1 text-primary-700 font-mono">
                              <MapPin className="w-3 h-3" />
                              {asset.image_latitude.toFixed(2)}, {asset.image_longitude.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* AI Routing Suggestion Box */}
                        {suggestedProjectName && (
                          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 space-y-1">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                              <Sparkles className="w-3 h-3 text-amber-600" /> AI Suggested Workspace
                            </div>
                            <div className="font-semibold text-xs text-gray-900">{suggestedProjectName}</div>
                            {asset.routing_confidence != null && (
                              <div className="text-[10px] text-amber-700 font-mono">
                                Match Confidence: {(asset.routing_confidence * 100).toFixed(1)}%
                              </div>
                            )}
                          </div>
                        )}

                        {/* Observed Activity / Description */}
                        {asset.activity && (
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Observed Activity</span>
                            <p className="text-xs font-semibold text-gray-900">{asset.activity}</p>
                          </div>
                        )}
                        {asset.description && (
                          <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 line-clamp-2">
                            {asset.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Project Assignment Action Controls */}
                    <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2.5">
                      <label className="block text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                        <Folder className="w-3 h-3 text-gray-500" />
                        Target Project Workspace:
                      </label>
                      
                      <div className="flex items-center gap-2">
                        <select
                          value={effectiveTargetProjId}
                          onChange={(e) => setSelectedProjectMap({ ...selectedProjectMap, [asset.id]: e.target.value })}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          <option value="">Select a project...</option>
                          {projects?.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleAssign(asset.id)}
                          disabled={isAssigningThis || !effectiveTargetProjId}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 disabled:opacity-50 whitespace-nowrap"
                        >
                          {isAssigningThis ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Assigning...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>Assign</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(asset.id)}
                          disabled={isDeletingThis}
                          className="text-[11px] text-gray-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                        >
                          {isDeletingThis ? <Loader2 className="w-3 h-3 animate-spin text-red-500" /> : <Trash2 className="w-3 h-3" />}
                          <span>Delete Asset</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}