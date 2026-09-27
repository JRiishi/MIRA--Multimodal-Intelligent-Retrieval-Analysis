import React, { useRef } from 'react';
import { useMediaLibrary, useUploadMedia, useDeleteMedia } from '../hooks/media';
import { useProjects } from '../hooks/projects';
import { UploadCloud, Image as ImageIcon, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { ProcessingStatus } from '../types';

export default function MediaLibrary() {
  const { data: media, isLoading, error } = useMediaLibrary();
  const { data: projects } = useProjects();
  const uploadMutation = useUploadMedia();
  const deleteMutation = useDeleteMedia();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Loop for multiple files, for now just process all selected
      Array.from(e.target.files).forEach(file => {
        uploadMutation.mutate(file);
      });
      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getStatusDisplay = (status: ProcessingStatus) => {
    switch (status) {
      case 'QUEUED':
      case 'UPLOADING':
        return { label: 'Uploading...', bg: 'bg-blue-100', text: 'text-blue-700', icon: Loader2 };
      case 'ANALYZING':
      case 'ROUTING':
      case 'INDEXING':
        return { label: 'AI Processing', bg: 'bg-amber-100', text: 'text-amber-700', icon: Loader2 };
      case 'READY':
        return { label: 'Ready', bg: 'bg-green-100', text: 'text-green-700', icon: null };
      case 'FAILED':
        return { label: 'Failed', bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle };
      default:
        return { label: status, bg: 'bg-gray-100', text: 'text-gray-700', icon: null };
    }
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'Unassigned';
    const project = projects?.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <header className="px-8 py-6 bg-white border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Media Library</h1>
          <p className="text-sm text-gray-500 mt-1">Upload field media. The system will analyze and organize it automatically.</p>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*"
          multiple
          onChange={handleFileChange}
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary flex items-center gap-2"
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          Upload Media
        </button>
      </header>

      <div className="flex-1 p-8 overflow-y-auto">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card aspect-square animate-pulse bg-gray-200"></div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-100 rounded-md text-red-700 text-sm">
            Unable to load media library.
          </div>
        ) : !media || media.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-lg border-dashed">
            <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No media uploaded</h3>
            <p className="text-gray-500 mt-1 text-sm max-w-sm mx-auto">
              Upload field media and the system will automatically analyze the content and assign it to the correct project.
            </p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 btn-secondary text-sm"
            >
              Select Images
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {media.map((asset) => {
              const status = getStatusDisplay(asset.processing_status);
              const StatusIcon = status.icon;
              
              return (
                <div key={asset.id} className="card group cursor-pointer flex flex-col h-[280px]">
                  {/* Image Area */}
                  <div className="relative flex-1 bg-gray-100 overflow-hidden">
                    {asset.cloudinary_url ? (
                      <img 
                        src={asset.cloudinary_url} 
                        alt="Media Asset" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                    
                    {/* Status Badge Over Image */}
                    <div className={`absolute top-3 right-3 px-2.5 py-1 text-xs font-medium rounded-full shadow-sm flex items-center gap-1.5 ${status.bg} ${status.text}`}>
                      {StatusIcon && <StatusIcon className={`w-3 h-3 ${status.icon === Loader2 ? 'animate-spin' : ''}`} />}
                      {status.label}
                    </div>
                  </div>

                  <div className="p-4 bg-white border-t border-gray-100 flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getProjectName(asset.project_id)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(asset.uploaded_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(asset.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Delete asset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}