import React, { useState, useRef } from 'react';
import { useMediaLibrary, useUploadMedia, useDeleteMedia } from '../hooks/media';
import { useProjects } from '../hooks/projects';
import { UploadCloud, Image as ImageIcon, Loader2, AlertCircle, Trash2, MapPin, Navigation, X } from 'lucide-react';
import { format } from 'date-fns';
import type { ProcessingStatus } from '../types';

export default function MediaLibrary() {
  const { data: media, isLoading, error } = useMediaLibrary();
  const { data: projects } = useProjects();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const deleteMutation = useDeleteMedia();

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
      case 'NEEDS_REVIEW':
        return { label: 'Needs Review', bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle };
      case 'UNASSIGNED':
        return { label: 'Unassigned', bg: 'bg-gray-100', text: 'text-gray-700', icon: null };
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
          <p className="text-sm text-gray-500 mt-1">Upload field media with automatic or custom GPS geotagging.</p>
        </div>
        
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <UploadCloud className="w-4 h-4" />
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
              Upload field media and the system will automatically analyze the content and route it to the geographically matching project.
            </p>
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="mt-6 btn-secondary text-sm"
            >
              Upload First Photo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {media.map((asset) => {
              const status = getStatusDisplay(asset.processing_status);
              const StatusIcon = status.icon;
              
              return (
                <div key={asset.id} className="card group cursor-pointer flex flex-col h-[290px]">
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

                    {/* Geotag Source Badge */}
                    {asset.location_source && asset.location_source !== 'NONE' && (
                      <div className="absolute top-3 left-3 px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded bg-black/60 text-white backdrop-blur-sm">
                        📍 {asset.location_source} GPS
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-white border-t border-gray-100 flex justify-between items-start">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getProjectName(asset.project_id)}
                      </p>
                      
                      {asset.image_latitude != null && asset.image_longitude != null && (
                        <div className="flex items-center gap-1 text-[11px] text-primary-700 mt-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="font-mono">
                            {asset.image_latitude.toFixed(3)}, {asset.image_longitude.toFixed(3)}
                          </span>
                          {asset.location_match_distance != null && (
                            <span className="text-gray-400">
                              ({asset.location_match_distance.toFixed(1)} km)
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(asset.uploaded_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(asset.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
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

      {isUploadModalOpen && (
        <UploadMediaModal onClose={() => setIsUploadModalOpen(false)} />
      )}
    </div>
  );
}

function UploadMediaModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const uploadMutation = useUploadMedia();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
  };

  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
      },
      (err) => {
        setIsLocating(false);
        setLocationError(`Location access denied or unavailable: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const latVal = latitude.trim() ? parseFloat(latitude) : null;
    const lonVal = longitude.trim() ? parseFloat(longitude) : null;

    uploadMutation.mutate(
      {
        file,
        latitude: latVal,
        longitude: lonVal,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Upload Field Media</h2>
            <p className="text-xs text-gray-500">With automatic or custom Geo-Tagging</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* File Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Photo</label>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            {!file ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-primary-500 rounded-lg p-6 text-center cursor-pointer transition-colors bg-gray-50 hover:bg-primary-50/20"
              >
                <UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Click to choose a photo</p>
                <p className="text-xs text-gray-400 mt-1">Supports JPG, PNG, WEBP</p>
              </div>
            ) : (
              <div className="relative border border-gray-200 rounded-lg p-3 flex items-center gap-3 bg-gray-50">
                {previewUrl && (
                  <img src={previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded border border-gray-200 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                  className="text-xs text-red-600 hover:underline px-2 py-1"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Geo-Tagging Section */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary-600" />
                Geotag / GPS Coordinates
              </label>
              <button
                type="button"
                onClick={handleFetchCurrentLocation}
                disabled={isLocating}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 px-2 py-1 bg-primary-50 hover:bg-primary-100 rounded transition-colors"
              >
                {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                {isLocating ? 'Locating...' : 'Use My GPS'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                <input 
                  type="number" 
                  step="any"
                  value={latitude}
                  onChange={e => setLatitude(e.target.value)}
                  placeholder="e.g. 28.6010"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                <input 
                  type="number" 
                  step="any"
                  value={longitude}
                  onChange={e => setLongitude(e.target.value)}
                  placeholder="e.g. 77.2990"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-mono"
                />
              </div>
            </div>

            {locationError && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {locationError}
              </p>
            )}

            <p className="text-[11px] text-gray-400 mt-2">
              💡 <em>Leave blank to auto-extract GPS coordinates from image EXIF metadata (camera/phone photos).</em>
            </p>
          </div>

          {uploadMutation.isError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md">
              Failed to upload media. Please check your network and try again.
            </div>
          )}

          {/* Action Buttons */}
          <div className="border-t border-gray-100 pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="btn-secondary text-sm"
              disabled={uploadMutation.isPending}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary text-sm flex items-center justify-center min-w-[140px]"
              disabled={uploadMutation.isPending || !file}
            >
              {uploadMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </span>
              ) : (
                'Upload & Route'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}