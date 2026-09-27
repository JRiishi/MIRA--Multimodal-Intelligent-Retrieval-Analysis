import React from 'react';
import { 
  GitCompare, 
  MapPin, 
  TrendingUp,
  FileText
} from 'lucide-react';

interface ChatMessageRendererProps {
  message: string;
  role: 'user' | 'assistant';
  intent?: string | null;
}

export const ChatMessageRenderer: React.FC<ChatMessageRendererProps> = ({ message, role }) => {
  if (role === 'user') {
    return <span className="font-medium text-white">{message}</span>;
  }

  // Detect Progression / Structural Change pattern
  const isProgression = message.includes('Observed Progression') || 
                        message.includes('Initial Baseline') || 
                        message.includes('Visual Variation');

  if (isProgression) {
    return <ProgressionCard message={message} />;
  }

  // Detect Status pattern
  const isStatus = message.includes('current observed activity') || 
                   message.includes('Based on the latest available visual evidence');
  if (isStatus) {
    return <StatusCard message={message} />;
  }

  // Detect Overview / Summary pattern
  const isOverview = message.includes('Project Overview') || message.includes('Observed Activities:');
  if (isOverview) {
    return <OverviewCard message={message} />;
  }

  // Fallback to General Rich Markdown Renderer
  return <MarkdownBody text={message} />;
};

// Specialized Card for Before/After Progression & Structural Change
const ProgressionCard: React.FC<{ message: string }> = ({ message }) => {
  // Extract variation percentage
  const varMatch = message.match(/Visual Variation:\s*~?(\d+)%/i);
  const variationPct = varMatch ? parseInt(varMatch[1], 10) : 85;

  // Extract Summary
  const summaryMatch = message.match(/Analysis Summary\*{0,2}:\s*([^(\n]+)/i);
  const summaryText = summaryMatch ? summaryMatch[1].trim() : "Significant structural change detected.";

  // Extract Baseline line
  const baselineMatch = message.match(/Initial Baseline\s*(?:\(([^)]+)\))?\*{0,2}:\s*(?:Observed\s*\*?([^*—\n-]+)\*?)?\s*[—\-:]*\s*(.*)/i);
  const baselineDate = baselineMatch?.[1] || "Initial Stage";
  const baselineActivity = baselineMatch?.[2]?.trim() || "Baseline Groundwork";
  const baselineDesc = baselineMatch?.[3]?.replace(/^[-—:]\s*/, '').trim() || "Initial project site conditions recorded.";

  // Extract Latest State line
  const latestMatch = message.match(/Latest State\s*(?:\(([^)]+)\))?\*{0,2}:\s*(?:Observed\s*\*?([^*—\n-]+)\*?)?\s*[—\-:]*\s*(.*)/i);
  const latestDate = latestMatch?.[1] || "Current Stage";
  const latestActivity = latestMatch?.[2]?.trim() || "Latest Field Progress";
  const latestDesc = latestMatch?.[3]?.replace(/^[-—:]\s*/, '').trim() || "Most recent verified visual progress.";

  return (
    <div className="space-y-4">
      {/* Header Badge */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200/80">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <GitCompare className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-gray-900 tracking-tight">Observed Progression & Structural Change</span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
          AI Audit Diff
        </span>
      </div>

      {/* Stage Cards: Baseline vs Current State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Baseline Card */}
        <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span> Initial Baseline
              </span>
              <span className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {baselineDate}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-900 leading-snug">
              {baselineActivity}
            </p>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              {baselineDesc}
            </p>
          </div>
        </div>

        {/* Latest State Card */}
        <div className="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200/90 shadow-2xs flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Latest Observation
              </span>
              <span className="text-[10px] font-medium text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                {latestDate}
              </span>
            </div>
            <p className="text-xs font-semibold text-emerald-950 leading-snug">
              {latestActivity}
            </p>
            <p className="text-[11px] text-emerald-800 mt-1 leading-relaxed">
              {latestDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Structural Variation Metric Meter */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-gray-900 via-slate-900 to-slate-800 text-white shadow-sm space-y-2">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-gray-200">{summaryText}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400">Visual Delta:</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
              ~{variationPct}% Variation
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-gray-700/60 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-teal-400 via-emerald-400 to-green-500 h-2 rounded-full transition-all duration-700" 
            style={{ width: `${Math.min(100, Math.max(10, variationPct))}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Specialized Card for Status Queries
const StatusCard: React.FC<{ message: string }> = ({ message }) => {
  // Extract project name, activity, and description
  const activityMatch = message.match(/current observed activity.*?(?:is\s*\*?\*?)(.*?)(?:\*?\*?\s*(?:in|\.|$))/i);
  const activity = activityMatch ? activityMatch[1].replace(/\*\*/g, '').trim() : "Active Project Work";

  const obsMatch = message.match(/Visual Observation:\s*(.*)/i);
  const observation = obsMatch ? obsMatch[1].trim() : null;

  const locMatch = message.match(/Location:\s*(.*)/i);
  const location = locMatch ? locMatch[1].trim() : null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-gray-900 tracking-tight">Current Operational Status</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          Verified Active
        </span>
      </div>

      {/* Main Activity Banner */}
      <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1">
        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Observed Activity</span>
        <p className="text-xs font-bold text-emerald-950">{activity}</p>
      </div>

      {/* Detailed Observation */}
      {observation && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Photographic Observation</span>
          <p className="text-xs text-gray-800 leading-relaxed">{observation}</p>
        </div>
      )}

      {/* Location tag */}
      {location && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100/80 px-2.5 py-1 rounded-lg w-fit">
          <MapPin className="w-3.5 h-3.5 text-gray-500" />
          <span>{location}</span>
        </div>
      )}
    </div>
  );
};

// Specialized Card for Project Overview
const OverviewCard: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
        <div className="w-6 h-6 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600">
          <FileText className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-bold text-gray-900 tracking-tight">Project Summary & Intelligence</span>
      </div>
      <MarkdownBody text={message} />
    </div>
  );
};

// Universal Markdown Formatter for General Queries
const MarkdownBody: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <div className="space-y-2 text-xs leading-relaxed text-gray-800">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1.5" />;

        // Header 3 (###)
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-xs font-bold text-gray-900 mt-2 mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-600"></span>
              {trimmed.replace('### ', '')}
            </h4>
          );
        }

        // Header 2 (##) or 1 (#)
        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          return (
            <h3 key={idx} className="text-sm font-bold text-gray-900 mt-2 mb-1">
              {trimmed.replace(/^#+\s*/, '')}
            </h3>
          );
        }

        // Bullet point (- or *)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          const content = trimmed.replace(/^[-*•]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 my-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
              <span className="text-xs text-gray-700">{renderInlineMarkdown(content)}</span>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-xs text-gray-800">
            {renderInlineMarkdown(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

// Helper to render bold and italic spans
function renderInlineMarkdown(str: string): React.ReactNode {
  // Regex to split by bold **text** or *italic*
  const parts = str.split(/(\*\*.*?\*\*|\*.*?\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="italic text-gray-700">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}
