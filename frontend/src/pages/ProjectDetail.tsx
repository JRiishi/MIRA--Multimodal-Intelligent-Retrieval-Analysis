import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../hooks/projects';
import { useMediaLibrary } from '../hooks/media';
import { ArrowLeft, Calendar, FileText, Image as ImageIcon, MessageSquare, Clock, GitCompare } from 'lucide-react';
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
  
  const [activeTab, setActiveTab] = useState('overview');
  
  const projectMedia = allMedia?.filter(m => m.project_id === projectId) || [];

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
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{project.name}</h1>
            <p className="text-sm text-gray-600 mt-2 max-w-2xl">{project.description || "No description provided."}</p>
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded border border-gray-100">
            <Calendar className="w-4 h-4" />
            Created {format(new Date(project.created_at), 'MMM d, yyyy')}
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
    </div>
  );
}
