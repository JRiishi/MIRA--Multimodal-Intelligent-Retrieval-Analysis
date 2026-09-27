import { useState } from 'react';
import { useMediaLibrary, useAssignMedia, useDeleteMedia } from '../hooks/media';

import { useProjects } from '../hooks/projects';
import { AlertCircle, CheckCircle2, MapPin, Folder, Trash2, Loader2, ArrowRight } from 'lucide-react';
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
    const targetProjId = selectedProjectMap[assetId];
    if (!targetProjId) return;
    assignMutation.mutate({ assetId, projectId: targetProjId });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden font-sans">
      <header className="px-8 py-6 bg-white border-b border-gray-200 flex items-center justify-between shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Human In The Loop
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Review & Unassigned Media</h1>
          <p className="text-xs text-gray-500 mt-1">
            Media captures with lower automated routing confidence or completed milestone photos pending confirmation.
          </p>
        </div>
      </header>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="card aspect-square animate-pulse bg-gray-200"></div>
              ))}
            </div>
          ) : unassignedOrReviewMedia.length === 0 ? (
            <div className="py-20 text-center bg-white border border-dashed border-gray-200 rounded-2xl">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-900">All Media Successfully Routed</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                There are currently no unassigned media captures or assets requiring manual review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unassignedOrReviewMedia.map(asset => (
                <div key={asset.id} className="card bg-white border border-gray-200 overflow-hidden flex flex-col justify-between shadow-sm">
                  <div>
                    {/* Media Thumbnail */}
                    <div className="aspect-video bg-gray-100 relative overflow-hidden">
                      {asset.cloudinary_url ? (
                        <img src={asset.cloudinary_url} alt="Review Asset" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Image</div>
                      )}
                      <div className={`absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        asset.processing_status === 'NEEDS_REVIEW' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {asset.processing_status.replace('_', ' ')}
                      </div>
                    </div>

                    {/* Metadata Details */}
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between items-center text-[11px] text-gray-500">
                        <span>{format(new Date(asset.uploaded_at), 'MMM d, yyyy h:mm a')}</span>
                        {asset.image_latitude != null && asset.image_longitude != null && (
                          <span className="flex items-center gap-1 text-primary-700 font-mono">
                            <MapPin className="w-3 h-3" />
                            {asset.image_latitude.toFixed(2)}, {asset.image_longitude.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Project Assignment Action Box */}
                  <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2">
                    <label className="block text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                      <Folder className="w-3 h-3 text-gray-500" />
                      Assign to Project Workspace:
                    </label>
                    
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedProjectMap[asset.id] || asset.project_id || ''}
                        onChange={(e) => setSelectedProjectMap({ ...selectedProjectMap, [asset.id]: e.target.value })}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">Select a project...</option>
                        {projects?.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleAssign(asset.id)}
                        disabled={assignMutation.isPending || !(selectedProjectMap[asset.id] || asset.project_id)}
                        className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 disabled:opacity-50"
                      >
                        {assignMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        Assign
                      </button>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => deleteMutation.mutate(asset.id)}
                        disabled={deleteMutation.isPending}
                        className="text-[11px] text-gray-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Delete Asset
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}