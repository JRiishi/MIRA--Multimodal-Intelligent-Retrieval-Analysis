import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject, useDeleteProject } from '../hooks/projects';
import { useMediaLibrary, useAssetTransformations } from '../hooks/media';
import { 
  useProjectChat, 
  useProjectChatHistory, 
  useClearProjectChat, 
  useProjectTimeline, 
  useGenerateProjectReport,
  useProjectChangeAnalysis
} from '../hooks/chat';
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  Image as ImageIcon, 
  MessageSquare, 
  Clock, 
  GitCompare, 
  MapPin, 
  Trash2, 
  Loader2, 
  Send, 
  Sparkles, 
  ExternalLink, 
  X, 
  RefreshCw, 
  FileBarChart2, 
  Printer, 
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Layers,
  Sliders
} from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import type { ChatEvidenceItem } from '../types';
import { ChatMessageRenderer } from '../components/ChatMessageRenderer';


const TABS = [
  { id: 'overview', name: 'Overview', icon: FileText },
  { id: 'media', name: 'Media', icon: ImageIcon },
  { id: 'timeline', name: 'Timeline', icon: Clock },
  { id: 'change', name: 'Before / After', icon: GitCompare },
  { id: 'chat', name: 'AI Chat', icon: MessageSquare },
  { id: 'reports', name: 'Reports', icon: FileBarChart2 },
];

const QUICK_ACTIONS = [
  { label: 'Project Status', prompt: 'What is the current status of this project based on the latest available evidence?' },
  { label: 'Recent Activity', prompt: 'What are the most recent activities observed in this project?' },
  { label: 'What Changed?', prompt: 'What significant changes have been observed in this project over time?' },
  { label: 'Find Evidence', prompt: 'Find visual evidence related to ' },
  { label: 'Generate Report', prompt: 'Generate an impact report for this project using the available evidence.' }
];

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading: isProjectLoading } = useProject(projectId);
  const { data: allMedia } = useMediaLibrary();
  const deleteMutation = useDeleteProject();

  // Chat & Intelligence hooks
  const chatMutation = useProjectChat(projectId);
  const { data: chatHistory, isLoading: isHistoryLoading } = useProjectChatHistory(projectId);
  const clearChatMutation = useClearProjectChat(projectId);
  const { data: timelineData, isLoading: isTimelineLoading } = useProjectTimeline(projectId);
  const reportMutation = useGenerateProjectReport(projectId);
  const changeMutation = useProjectChangeAnalysis(projectId);

  const [activeTab, setActiveTab] = useState('overview');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [activeEvidenceModal, setActiveEvidenceModal] = useState<ChatEvidenceItem | null>(null);

  // Cloudinary Before/After showcase state
  const [comparisonMode, setComparisonMode] = useState<'slider' | 'side_by_side' | 'composite'>('slider');
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Cloudinary Lightbox Modal state
  const [modalTab, setModalTab] = useState<'original' | 'provenance' | 'campaign'>('original');
  const { data: assetTransformations } = useAssetTransformations(activeEvidenceModal?.asset_id || null);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const projectMedia = allMedia?.filter(m => m.project_id === projectId) || [];

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (activeTab === 'chat' && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, chatMutation.isPending, activeTab]);

  const handleDelete = () => {
    if (!projectId) return;
    deleteMutation.mutate(projectId, {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        navigate('/projects');
      },
    });
  };

  const handleSendMessage = (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const msg = customMsg || chatInput;
    if (!msg.trim() || chatMutation.isPending) return;

    chatMutation.mutate(msg.trim(), {
      onSuccess: () => {
        setChatInput('');
      }
    });
  };

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    if (action.label === 'Find Evidence') {
      setChatInput(action.prompt);
    } else {
      handleSendMessage(undefined, action.prompt);
    }
  };

  if (isProjectLoading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-24 bg-gray-100 rounded"></div>
      </div>
    );
  }

  if (!project) {
    return <div className="p-8 text-center text-red-700 font-medium">Project workspace not found.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="px-8 py-5 bg-white border-b border-gray-200 flex-shrink-0 shadow-sm">
        <button 
          onClick={() => navigate('/projects')}
          className="text-xs font-semibold text-gray-500 hover:text-gray-900 mb-3 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
        </button>

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{project.name}</h1>
              {project.location_name && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 bg-primary-50 border border-primary-100 px-2.5 py-1 rounded-full">
                  <MapPin className="w-3.5 h-3.5" />
                  {project.location_name}
                  {project.latitude != null && project.longitude != null && (
                    <span className="text-primary-400 font-mono text-[10px]">
                      ({project.latitude.toFixed(2)}, {project.longitude.toFixed(2)})
                    </span>
                  )}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed">
              {project.description || "No description provided."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500 flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Created {format(new Date(project.created_at), 'MMM d, yyyy')}
            </div>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200 flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg"
              title="Delete Project"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-6 mt-6 border-b border-gray-200 -mb-[1px]">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "pb-3 text-xs font-semibold transition-colors relative flex items-center gap-2",
                activeTab === tab.id 
                  ? "text-primary-600 border-b-2 border-primary-600 font-bold" 
                  : "text-gray-500 hover:text-gray-900 border-b-2 border-transparent"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
              {tab.id === 'media' && projectMedia.length > 0 && (
                <span className="px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded-full text-[10px]">
                  {projectMedia.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Tab Content Container */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-5 bg-white border border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Evidence</span>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{projectMedia.length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Verified multimodal captures</p>
                </div>
                <div className="card p-5 bg-white border border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Geographic Scope</span>
                  <p className="text-sm font-bold text-gray-900 mt-1 truncate">{project.location_name || "Location Unset"}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Automated GPS radius routing</p>
                </div>
                <div className="card p-5 bg-primary-50 border border-primary-100 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-primary-700 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Project Intelligence
                    </span>
                    <p className="text-xs text-primary-900 mt-1">Talk to this project's visual evidence with AI reasoning.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('chat')}
                    className="mt-3 btn-primary text-xs py-1.5 px-3 self-start flex items-center gap-1"
                  >
                    Open AI Chat &rarr;
                  </button>
                </div>
              </div>

              {/* Latest Visual Evidence Grid */}
              <section className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-bold text-gray-900">Latest Evidence Captures</h2>
                  {projectMedia.length > 4 && (
                    <button 
                      onClick={() => setActiveTab('media')}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                    >
                      View all ({projectMedia.length}) &rarr;
                    </button>
                  )}
                </div>

                {projectMedia.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-gray-200 rounded-xl">
                    <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600 font-medium text-sm">No evidence has been routed to this project yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Upload images in the Media Library to trigger automated routing.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {projectMedia.slice(0, 4).map(asset => (
                      <div 
                        key={asset.id} 
                        onClick={() => setActiveEvidenceModal({
                          asset_id: asset.id,
                          cloudinary_url: asset.cloudinary_url || '',
                          description: 'Verified project media capture.',
                          timestamp: asset.uploaded_at
                        })}
                        className="group relative aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 cursor-pointer shadow-sm hover:shadow transition-all"
                      >
                        {asset.cloudinary_url ? (
                          <img src={asset.cloudinary_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No preview</div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent text-white text-[11px] opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center">
                          <span>{format(new Date(asset.uploaded_at), 'MMM d, yyyy')}</span>
                          <span className="font-semibold text-[10px] bg-primary-600 px-1.5 py-0.5 rounded">View</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 2: MEDIA GALLERY */}
          {activeTab === 'media' && (
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Project Media Library</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{projectMedia.length} media item(s) strictly assigned to this project.</p>
                </div>
              </div>

              {projectMedia.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-gray-200 rounded-xl">
                  <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-gray-900">No media assets found</h3>
                  <p className="text-xs text-gray-500 mt-1">Upload images with matching GPS or domain keywords to populate evidence.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {projectMedia.map(asset => (
                    <div 
                      key={asset.id} 
                      onClick={() => setActiveEvidenceModal({
                        asset_id: asset.id,
                        cloudinary_url: asset.cloudinary_url || '',
                        description: 'Project visual evidence record.',
                        timestamp: asset.uploaded_at
                      })}
                      className="group card overflow-hidden border border-gray-200 hover:shadow-md transition-all cursor-pointer flex flex-col"
                    >
                      <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                        {asset.cloudinary_url && (
                          <img src={asset.cloudinary_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        )}
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 text-white rounded text-[10px] font-medium backdrop-blur-sm">
                          {asset.processing_status}
                        </div>
                      </div>
                      <div className="p-3 bg-white flex justify-between items-center text-xs text-gray-500">
                        <span>{format(new Date(asset.uploaded_at), 'MMM d, yyyy')}</span>
                        <span className="text-primary-600 font-semibold text-[11px] group-hover:underline">Inspect &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-base font-bold text-gray-900">Project Activity Timeline</h2>
                <p className="text-xs text-gray-500 mt-0.5">Chronological progression of field observations and visual evidence.</p>
              </div>

              {isTimelineLoading && (
                <div className="py-12 flex justify-center items-center gap-2 text-primary-600 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading timeline...
                </div>
              )}

              {timelineData && timelineData.length === 0 && (
                <div className="py-16 text-center border border-dashed border-gray-200 rounded-xl">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-gray-900">No timeline entries yet</h3>
                  <p className="text-xs text-gray-500 mt-1">Timeline milestones are automatically generated as evidence is uploaded.</p>
                </div>
              )}

              {timelineData && timelineData.length > 0 && (
                <div className="relative border-l-2 border-primary-200 ml-4 space-y-8 py-2">
                  {timelineData.map((item, idx) => (
                    <div key={idx} className="relative pl-6 group">
                      {/* Timeline Node Dot */}
                      <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-primary-600 group-hover:scale-110 transition-transform"></div>
                      
                      <div className="card p-4 border border-gray-200 bg-white hover:border-primary-200 transition-all">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 mb-2">
                          <span className="inline-block px-2.5 py-0.5 bg-primary-50 text-primary-700 rounded-full text-xs font-bold">
                            {item.activity || "Observed Activity"}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">{item.date}</span>
                        </div>
                        
                        <p className="text-xs text-gray-700 leading-relaxed mb-3">
                          {item.description || "Field evidence captured."}
                        </p>

                        {item.cloudinary_url && (
                          <div 
                            onClick={() => setActiveEvidenceModal({
                              asset_id: item.asset_id || '',
                              cloudinary_url: item.cloudinary_url,
                              description: item.description || '',
                              activity: item.activity,
                              timestamp: item.date
                            })}
                            className="w-48 aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:opacity-90"
                          >
                            <img src={item.cloudinary_url} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BEFORE / AFTER CHANGE DETECTION */}
          {activeTab === 'change' && (
            <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200 max-w-4xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <GitCompare className="w-4 h-4" />
                    </div>
                    <h2 className="text-base font-bold text-gray-900">Before & After Progression Analysis</h2>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Automated structural change computation comparing initial baseline vs latest state.</p>
                </div>
                <button
                  onClick={() => changeMutation.mutate({})}
                  disabled={changeMutation.isPending || projectMedia.length < 2}
                  className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  {changeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitCompare className="w-3.5 h-3.5" />}
                  Run Structural Analysis
                </button>
              </div>

              {projectMedia.length < 2 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>At least 2 uploaded images are required to compute structural progression for this project.</span>
                </div>
              )}

              {changeMutation.isPending && (
                <div className="py-16 text-center text-primary-600 text-xs flex flex-col justify-center items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="font-semibold">Aligning image matrices & computing structural change index...</span>
                </div>
              )}

              {changeMutation.data && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* High-Impact Metric Summary Box */}
                  <div className="p-4 bg-gradient-to-r from-gray-900 via-slate-900 to-slate-800 text-white rounded-xl shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Analysis Result</span>
                        <p className="text-sm font-bold text-white mt-0.5">{changeMutation.data.summary}</p>
                      </div>
                      <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                        <span className="text-xs text-gray-300">Computed Delta:</span>
                        <span className="text-base font-bold text-emerald-400">
                          {Math.round((1.0 - changeMutation.data.change_score) * 100)}% Variation
                        </span>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full bg-gray-700/60 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-teal-400 via-emerald-400 to-green-500 h-2 rounded-full transition-all duration-700" 
                        style={{ width: `${Math.min(100, Math.max(10, Math.round((1.0 - changeMutation.data.change_score) * 100)))}%` }}
                      />
                    </div>
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-lg">
                      <button
                        onClick={() => setComparisonMode('slider')}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          comparisonMode === 'slider' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5" /> Interactive Slider
                      </button>
                      <button
                        onClick={() => setComparisonMode('side_by_side')}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          comparisonMode === 'side_by_side' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" /> Side-by-Side
                      </button>
                      <button
                        onClick={() => setComparisonMode('composite')}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          comparisonMode === 'composite' ? 'bg-white text-primary-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-primary-600" /> Cloudinary Composite URL
                      </button>
                    </div>

                    <div className="text-[11px] text-gray-500 hidden sm:block">
                      {comparisonMode === 'slider' && 'Drag slider horizontally to reveal progression'}
                      {comparisonMode === 'side_by_side' && 'Comparing baseline against latest observation'}
                      {comparisonMode === 'composite' && 'Zero-compute composite rendered by Cloudinary CDN'}
                    </div>
                  </div>

                  {/* 1. INTERACTIVE SLIDER VIEW */}
                  {comparisonMode === 'slider' && (
                    <div className="space-y-3">
                      <div className="relative aspect-video rounded-2xl overflow-hidden border border-gray-300 shadow-sm bg-black select-none group">
                        {/* After Image (Background) */}
                        <img 
                          src={changeMutation.data.after_url} 
                          alt="After" 
                          className="absolute inset-0 w-full h-full object-cover" 
                        />
                        <div className="absolute top-3 right-3 px-2.5 py-1 bg-emerald-600/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-md shadow-xs">
                          AFTER (Current)
                        </div>

                        {/* Before Image (Clipped Overlay) */}
                        <div 
                          className="absolute inset-0 overflow-hidden" 
                          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                        >
                          <img 
                            src={changeMutation.data.before_url} 
                            alt="Before" 
                            className="absolute inset-0 w-full h-full object-cover" 
                          />
                          <div className="absolute top-3 left-3 px-2.5 py-1 bg-slate-900/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-md shadow-xs">
                            BEFORE (Baseline)
                          </div>
                        </div>

                        {/* Vertical Divider Line & Thumb */}
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] flex items-center justify-center pointer-events-none"
                          style={{ left: `${sliderPos}%` }}
                        >
                          <div className="w-8 h-8 bg-white text-gray-800 rounded-full shadow-lg border border-gray-200 flex items-center justify-center font-bold text-xs pointer-events-auto cursor-ew-resize">
                            ↔
                          </div>
                        </div>

                        {/* Hidden Range Input for smooth drag control */}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={sliderPos}
                          onChange={(e) => setSliderPos(Number(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                        />
                      </div>

                      <div className="flex justify-between items-center text-xs text-gray-500 px-1">
                        <span>← Drag to see Baseline (Before)</span>
                        <span className="font-mono text-[11px] bg-gray-100 px-2 py-0.5 rounded text-gray-700">{sliderPos}% Split</span>
                        <span>Drag to see Current (After) →</span>
                      </div>
                    </div>
                  )}

                  {/* 2. SIDE BY SIDE VIEW */}
                  {comparisonMode === 'side_by_side' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Before Card */}
                      <div className="border border-gray-200 rounded-xl overflow-hidden bg-slate-50/50 shadow-2xs flex flex-col">
                        <div className="px-4 py-2.5 bg-slate-100 border-b border-gray-200 flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-500"></span> BEFORE (Baseline State)
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            Initial Capture
                          </span>
                        </div>
                        <div 
                          onClick={() => setActiveEvidenceModal({
                            asset_id: changeMutation.data.before_asset_id,
                            cloudinary_url: changeMutation.data.before_url,
                            description: 'Initial project baseline evidence capture.',
                          })}
                          className="aspect-video bg-black/5 flex items-center justify-center cursor-pointer group relative overflow-hidden"
                        >
                          <img src={changeMutation.data.before_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                            <ExternalLink className="w-3.5 h-3.5" /> Inspect Baseline
                          </div>
                        </div>
                      </div>

                      {/* After Card */}
                      <div className="border border-emerald-200 rounded-xl overflow-hidden bg-emerald-50/30 shadow-2xs flex flex-col">
                        <div className="px-4 py-2.5 bg-emerald-100/70 border-b border-emerald-200 flex justify-between items-center text-xs">
                          <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> AFTER (Latest Observation)
                          </span>
                          <span className="text-[10px] font-medium text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                            Current Stage
                          </span>
                        </div>
                        <div 
                          onClick={() => setActiveEvidenceModal({
                            asset_id: changeMutation.data.after_asset_id,
                            cloudinary_url: changeMutation.data.after_url,
                            description: 'Latest verified progress observation.',
                          })}
                          className="aspect-video bg-black/5 flex items-center justify-center cursor-pointer group relative overflow-hidden"
                        >
                          <img src={changeMutation.data.after_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                            <ExternalLink className="w-3.5 h-3.5" /> Inspect Progress
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. CLOUDINARY COMPOSITE TRANSFORMATION VIEW */}
                  {comparisonMode === 'composite' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-br from-primary-900 via-slate-900 to-indigo-950 text-white rounded-2xl border border-primary-800/40 shadow-md space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-500/30 border border-primary-400/40 rounded-full text-[10px] font-bold text-primary-200 uppercase tracking-wider mb-1">
                              <Sparkles className="w-3 h-3 text-primary-300" /> Cloudinary Dynamic Composite Transformation
                            </div>
                            <h4 className="text-sm font-bold text-white">Dual-Layer Zero-Compute CDN Composite</h4>
                            <p className="text-xs text-gray-300 mt-0.5">
                              Dual-layer visual proof constructed on-the-fly via Cloudinary layer transformations without server CPU usage.
                            </p>
                          </div>

                          {changeMutation.data.composite_url && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(changeMutation.data.composite_url!);
                                  setCopiedUrl('composite');
                                  setTimeout(() => setCopiedUrl(null), 2000);
                                }}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg border border-white/20 flex items-center gap-1.5 transition-colors"
                              >
                                {copiedUrl === 'composite' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                {copiedUrl === 'composite' ? 'Copied URL!' : 'Copy Composite URL'}
                              </button>
                              <a
                                href={changeMutation.data.composite_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Open HD
                              </a>
                            </div>
                          )}
                        </div>

                        {changeMutation.data.composite_url ? (
                          <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 aspect-[2/1] flex items-center justify-center">
                            <img 
                              src={changeMutation.data.composite_url} 
                              alt="Cloudinary Composite" 
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="p-8 text-center text-xs text-gray-400 bg-white/5 rounded-xl">
                            Composite transformation URL is ready when both Cloudinary public IDs are assigned.
                          </div>
                        )}

                        {changeMutation.data.composite_url && (
                          <div className="p-3 bg-black/40 rounded-xl border border-white/10">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Generated Dynamic URL</span>
                            <code className="text-[11px] font-mono text-primary-300 break-all select-all">
                              {changeMutation.data.composite_url}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* TAB 5: AI PROJECT CHAT */}
          {activeTab === 'chat' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[calc(100vh-250px)] overflow-hidden max-w-4xl mx-auto">
              {/* Chat Header */}
              <div className="px-6 py-3.5 border-b border-gray-200 bg-gray-50/70 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    {project.name} AI Analyst
                  </span>
                </div>
                {chatHistory && chatHistory.length > 0 && (
                  <button
                    onClick={() => clearChatMutation.mutate()}
                    disabled={clearChatMutation.isPending}
                    className="text-[11px] font-semibold text-gray-400 hover:text-red-600 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Clear History
                  </button>
                )}
              </div>

              {/* Chat Quick Action Prompts */}
              <div className="px-6 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[11px] font-medium text-gray-400 mr-1 flex-shrink-0">Quick prompts:</span>
                {QUICK_ACTIONS.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickAction(action)}
                    disabled={chatMutation.isPending}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 border border-gray-200 text-gray-600 text-xs font-medium transition-colors shadow-xs"
                  >
                    {action.label}
                  </button>
                ))}
              </div>

              {/* Messages Thread */}
              <div ref={chatScrollRef} className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50">
                {isHistoryLoading && (
                  <div className="text-center py-8 text-gray-400 text-xs flex justify-center items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading workspace history...
                  </div>
                )}

                {(!chatHistory || chatHistory.length === 0) && (
                  <div className="text-center py-16">
                    <Sparkles className="w-10 h-10 text-primary-400 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-gray-900">Talk to Your Project & Evidence</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                      Ask about current status, recent activities, timeline progression, or specific visual evidence strictly scoped to {project.name}.
                    </p>
                  </div>
                )}

                {chatHistory && chatHistory.map((item) => (
                  <div 
                    key={item.id} 
                    className={clsx(
                      "flex flex-col gap-1.5",
                      item.role === 'user' ? "items-end" : "items-start"
                    )}
                  >
                    {/* User Speech Bubble */}
                    {item.role === 'user' && (
                      <div className="max-w-[80%] rounded-2xl rounded-br-xs px-4 py-2.5 text-xs font-medium bg-primary-600 text-white shadow-xs leading-relaxed">
                        {item.message}
                      </div>
                    )}

                    {/* Assistant Intelligence Card */}
                    {item.role === 'assistant' && (
                      <div className="w-full max-w-[92%] space-y-3">
                        <div className="bg-white rounded-2xl rounded-tl-xs p-4 sm:p-5 border border-gray-200/90 shadow-2xs">
                          <ChatMessageRenderer 
                            message={item.message} 
                            role={item.role} 
                            intent={item.intent} 
                          />
                        </div>

                        {/* Attached Supporting Visual Evidence Gallery */}
                        {item.evidence && item.evidence.length > 0 && (
                          <div className="pl-1 space-y-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" /> Supporting Visual Evidence ({item.evidence.length})
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {item.evidence.map((ev, evIdx) => (
                                <div 
                                  key={evIdx}
                                  onClick={() => setActiveEvidenceModal(ev)}
                                  className="card p-2.5 bg-white border border-gray-200 hover:border-primary-300 hover:shadow-xs rounded-xl cursor-pointer flex gap-3 items-center transition-all group"
                                >
                                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                                    {ev.cloudinary_url && (
                                      <img src={ev.cloudinary_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    {ev.activity && (
                                      <p className="text-[11px] font-bold text-gray-900 truncate">{ev.activity}</p>
                                    )}
                                    <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{ev.description}</p>
                                    <span className="text-[9px] text-primary-600 font-semibold mt-1 block group-hover:underline">View Evidence &rarr;</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading Bubble */}
                {chatMutation.isPending && (
                  <div className="flex items-start gap-2">
                    <div className="bg-white rounded-2xl rounded-tl-xs px-4 py-3 text-xs text-gray-600 border border-gray-200 shadow-2xs flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
                      <span>Analyzing visual matrices & synthesizing grounded intelligence...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Footer */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 bg-white flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Ask anything about ${project.name}...`}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  disabled={chatMutation.isPending}
                />
                <button
                  type="submit"
                  disabled={chatMutation.isPending || !chatInput.trim()}
                  className="btn-primary py-2.5 px-4 text-xs flex items-center gap-1.5 shadow-none disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 6: REPORTS */}
          {activeTab === 'reports' && (
            <div className="bg-white p-8 rounded-xl border border-gray-200 max-w-4xl mx-auto space-y-6">
              <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Project Impact & Status Report</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Comprehensive synthesized intelligence report grounded in field visual evidence.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => reportMutation.mutate()}
                    disabled={reportMutation.isPending}
                    className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5"
                  >
                    {reportMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Generate Report
                  </button>
                  {reportMutation.data && (
                    <button
                      onClick={() => window.print()}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>
                  )}
                </div>
              </div>

              {!reportMutation.data && !reportMutation.isPending && (
                <div className="py-16 text-center border border-dashed border-gray-200 rounded-xl">
                  <FileBarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-gray-900">No report generated yet</h3>
                  <p className="text-xs text-gray-500 mt-1">Click "Generate Report" above to compile an audit-ready impact summary.</p>
                </div>
              )}

              {reportMutation.isPending && (
                <div className="py-16 text-center text-primary-600 text-xs flex justify-center items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Compiling verified evidence & synthesizing impact report...
                </div>
              )}

              {reportMutation.data && (
                <div className="space-y-6 text-xs text-gray-800 leading-relaxed print:p-0">
                  {/* Overview Block */}
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
                    <p className="font-bold text-sm text-gray-900">{reportMutation.data.project_name}</p>
                    <p className="text-gray-600">Location: {reportMutation.data.location_name || 'Unspecified'}</p>
                    <p className="text-gray-500 text-[11px]">Generated on {reportMutation.data.generated_at} | Verified Assets: {reportMutation.data.total_evidence_count}</p>
                  </div>

                  {/* Current Status */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Current Status</h3>
                    <p className="bg-emerald-50 text-emerald-900 border border-emerald-100 p-3 rounded-lg font-medium">
                      {reportMutation.data.current_status}
                    </p>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Observed Activity</h3>
                    <p className="text-gray-700">{reportMutation.data.recent_activity}</p>
                  </div>

                  {/* Timeline Milestones */}
                  {reportMutation.data.timeline_summary && reportMutation.data.timeline_summary.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Timeline Milestones</h3>
                      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                        {reportMutation.data.timeline_summary.map((t, idx) => (
                          <div key={idx} className="p-3 flex justify-between items-start gap-4">
                            <div>
                              <span className="font-bold text-gray-900">{t.activity}</span>
                              <p className="text-gray-600 mt-0.5">{t.description}</p>
                            </div>
                            <span className="text-gray-400 font-medium whitespace-nowrap">{t.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Evidence Gallery */}
                  {reportMutation.data.key_evidence && reportMutation.data.key_evidence.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Audit Traceability Evidence</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {reportMutation.data.key_evidence.map((ev, idx) => (
                          <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                            <div className="aspect-video bg-gray-100">
                              <img src={ev.cloudinary_url} className="w-full h-full object-cover" />
                            </div>
                            <div className="p-2 text-[10px] text-gray-600">
                              <p className="font-semibold text-gray-900 truncate">{ev.activity || 'Evidence'}</p>
                              <p className="truncate">{ev.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Evidence Detail Lightbox Modal with Cloudinary Transformations */}
      {activeEvidenceModal && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex justify-between items-center bg-gray-50/70 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Cloudinary Media Intelligence</span>
              </div>
              <button onClick={() => setActiveEvidenceModal(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cloudinary Transformation Mode Tabs */}
            <div className="px-5 pt-3 pb-2 bg-gray-50 border-b border-gray-200 flex items-center gap-1.5 flex-shrink-0 overflow-x-auto">
              <button
                onClick={() => setModalTab('original')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  modalTab === 'original' ? 'bg-white text-gray-900 shadow-xs border border-gray-200' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> Original Delivery
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

            {/* Modal Body (Scrollable) */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Image Preview Container */}
              <div className="rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-950 flex items-center justify-center relative">
                {modalTab === 'original' && (
                  <img 
                    src={assetTransformations?.optimized_url || activeEvidenceModal.cloudinary_url} 
                    alt="Original Delivery" 
                    onError={(e) => {
                      if (activeEvidenceModal.cloudinary_url && e.currentTarget.src !== activeEvidenceModal.cloudinary_url) {
                        e.currentTarget.src = activeEvidenceModal.cloudinary_url;
                      }
                    }}
                    className="max-h-72 w-full object-contain" 
                  />
                )}

                {modalTab === 'provenance' && (
                  <img 
                    src={assetTransformations?.verified_badge_url || activeEvidenceModal.cloudinary_url} 
                    alt="Provenance Watermarked" 
                    onError={(e) => {
                      if (activeEvidenceModal.cloudinary_url && e.currentTarget.src !== activeEvidenceModal.cloudinary_url) {
                        e.currentTarget.src = activeEvidenceModal.cloudinary_url;
                      }
                    }}
                    className="max-h-72 w-full object-contain" 
                  />
                )}

                {modalTab === 'campaign' && (
                  <div className="grid grid-cols-3 gap-2 p-2 w-full h-full items-center bg-gray-900">
                    <div className="space-y-1 text-center">
                      <div className="aspect-square bg-black rounded border border-gray-700 overflow-hidden">
                        <img 
                          src={assetTransformations?.campaign_aspects?.square_1_1 || activeEvidenceModal.cloudinary_url} 
                          alt="Square 1:1"
                          onError={(e) => {
                            if (activeEvidenceModal.cloudinary_url && e.currentTarget.src !== activeEvidenceModal.cloudinary_url) {
                              e.currentTarget.src = activeEvidenceModal.cloudinary_url;
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
                          src={assetTransformations?.campaign_aspects?.landscape_16_9 || activeEvidenceModal.cloudinary_url} 
                          alt="Landscape 16:9"
                          onError={(e) => {
                            if (activeEvidenceModal.cloudinary_url && e.currentTarget.src !== activeEvidenceModal.cloudinary_url) {
                              e.currentTarget.src = activeEvidenceModal.cloudinary_url;
                            }
                          }}
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <span className="text-[10px] text-gray-300 font-mono">16:9 Landscape</span>
                    </div>
                    <div className="space-y-1 text-center">
                      <div className="aspect-[9/16] max-h-48 mx-auto bg-black rounded border border-gray-700 overflow-hidden">
                        <img 
                          src={assetTransformations?.campaign_aspects?.story_9_16 || activeEvidenceModal.cloudinary_url} 
                          alt="Story 9:16"
                          onError={(e) => {
                            if (activeEvidenceModal.cloudinary_url && e.currentTarget.src !== activeEvidenceModal.cloudinary_url) {
                              e.currentTarget.src = activeEvidenceModal.cloudinary_url;
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

              {/* Cloudinary Transformation Explanation Note */}
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs space-y-1.5">
                {modalTab === 'original' && (
                  <p className="text-gray-600">
                    Delivered with <span className="font-mono text-primary-700 font-semibold">f_auto,q_auto</span> for optimal web bandwidth and instantaneous delivery caching.
                  </p>
                )}
                {modalTab === 'provenance' && (
                  <p className="text-gray-600">
                    Dynamically burns verification badge, GPS stamp, and timestamp via Cloudinary text overlays (<span className="font-mono text-emerald-700 font-semibold">l_text:...</span>) without altering the immutable raw asset.
                  </p>
                )}
                {modalTab === 'campaign' && (
                  <p className="text-gray-600">
                    Smart-cropped multi-aspect social exports generated on demand via AI focal points (<span className="font-mono text-primary-700 font-semibold">c_fill,g_auto</span>).
                  </p>
                )}
              </div>

              {/* Observation Details */}
              {activeEvidenceModal.activity && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Observed Activity</span>
                  <p className="text-xs font-semibold text-gray-900">{activeEvidenceModal.activity}</p>
                </div>
              )}
              {activeEvidenceModal.description && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Moondream AI Grounded Description</span>
                  <p className="text-xs text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">{activeEvidenceModal.description}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    let urlToCopy = activeEvidenceModal.cloudinary_url;
                    if (modalTab === 'provenance' && assetTransformations?.verified_badge_url) {
                      urlToCopy = assetTransformations.verified_badge_url;
                    } else if (modalTab === 'campaign' && assetTransformations?.campaign_aspects?.square_1_1) {
                      urlToCopy = assetTransformations.campaign_aspects.square_1_1;
                    } else if (assetTransformations?.optimized_url) {
                      urlToCopy = assetTransformations.optimized_url;
                    }
                    if (urlToCopy) {
                      navigator.clipboard.writeText(urlToCopy);
                      setCopiedUrl('modal');
                      setTimeout(() => setCopiedUrl(null), 2000);
                    }
                  }}
                  className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-3"
                >
                  {copiedUrl === 'modal' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUrl === 'modal' ? 'Copied URL!' : 'Copy Transformation URL'}
                </button>
                <a 
                  href={
                    modalTab === 'provenance'
                      ? (assetTransformations?.verified_badge_url || activeEvidenceModal.cloudinary_url)
                      : modalTab === 'campaign'
                      ? (assetTransformations?.campaign_aspects?.square_1_1 || activeEvidenceModal.cloudinary_url)
                      : (assetTransformations?.optimized_url || activeEvidenceModal.cloudinary_url)
                  } 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-secondary text-xs flex items-center gap-1 py-1 px-3"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open HD
                </a>
              </div>
              <button 
                type="button"
                onClick={() => setActiveEvidenceModal(null)} 
                className="btn-primary text-xs py-1 px-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
