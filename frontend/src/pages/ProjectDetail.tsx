import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject, useDeleteProject } from '../hooks/projects';
import { useMediaLibrary } from '../hooks/media';
import { ArrowLeft, Calendar, FileText, Image as ImageIcon, MessageSquare, Clock, GitCompare, MapPin, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';

const TABS = [
  { id: 'overview', name: 'Overview', icon: FileText },
  { id: 'media', name: 'Media', icon: ImageIcon },
  { id: 'timeline', name: 'Timeline', icon: Clock },
  { id: 'chat', name: 'Chat', icon: MessageSquare },
  { id: 'change', name: 'Before / After', icon: GitCompare },
];

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading: isProjectLoading } = useProject(projectId);
  const { data: allMedia } = useMediaLibrary();
  const deleteMutation = useDeleteProject();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const projectMedia = allMedia?.filter(m => m.project_id === projectId) || [];

  const handleDelete = () => {
    if (!projectId) return;
    deleteMutation.mutate(projectId, {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        navigate('/projects');
      },
    });
  };

  if (isProjectLoading) {
    return <div className="p-8 animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div></div>;
  }

  if (!project) {
    return <div className="p-8 text-center text-red-700">Project not found</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="px-8 py-6 bg-white border-b border-gray-200">
        <button 
          onClick={() => navigate('/projects')}
          className="text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{project.name}</h1>
              {project.location_name && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-100 px-2.5 py-1 rounded-full">
                  <MapPin className="w-3.5 h-3.5" />
                  {project.location_name}
                  {project.latitude != null && project.longitude != null && (
                    <span className="text-primary-400 font-mono text-[11px]">
                      ({project.latitude.toFixed(3)}, {project.longitude.toFixed(3)})
                    </span>
                  )}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-2 max-w-2xl">{project.description || "No description provided."}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500 flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded border border-gray-100">
              <Calendar className="w-4 h-4" />
              Created {format(new Date(project.created_at), 'MMM d, yyyy')}
            </div>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200 flex items-center gap-1.5 text-xs py-1.5 px-3"
              title="Delete Project"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Project
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-6 mt-8 border-b border-gray-200">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "pb-3 text-sm font-medium transition-colors relative flex items-center gap-2",
                activeTab === tab.id 
                  ? "text-primary-600 border-b-2 border-primary-600 -mb-[2px]" 
                  : "text-gray-500 hover:text-gray-900 border-b-2 border-transparent -mb-[2px]"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Latest Evidence</h2>
              {projectMedia.length === 0 ? (
                <div className="p-8 text-center bg-white border border-dashed border-gray-200 rounded-lg">
                  <p className="text-gray-500 text-sm">No evidence has been routed to this project yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {projectMedia.slice(0, 4).map(asset => (
                    <div key={asset.id} className="aspect-square bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                      {asset.cloudinary_url && (
                        <img src={asset.cloudinary_url} className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
        
        {activeTab === 'media' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">All Project Media ({projectMedia.length})</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {projectMedia.map(asset => (
                <div key={asset.id} className="aspect-square bg-gray-100 rounded-md overflow-hidden border border-gray-200 relative group">
                  {asset.cloudinary_url && (
                    <img src={asset.cloudinary_url} className="w-full h-full object-cover" loading="lazy" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    {format(new Date(asset.uploaded_at), 'MMM d, yyyy')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {['timeline', 'chat', 'change'].includes(activeTab) && (
          <div className="h-64 flex items-center justify-center bg-white rounded-lg border border-dashed border-gray-200">
            <div className="text-center">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Coming Soon</p>
              <p className="text-xs text-gray-400 mt-1">This module is under development.</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">Delete Project?</h3>
            <p className="text-sm text-gray-600 mt-2">
              Are you sure you want to delete <span className="font-medium text-gray-900">"{project.name}"</span>? Any associated media assets will become unassigned.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="btn-secondary text-sm"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors flex items-center gap-2"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
