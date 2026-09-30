import { useState } from 'react';
import { clsx } from 'clsx';
import { Check, Copy } from 'lucide-react';

interface ChatMessageRendererProps {
  message: string;
  role: 'user' | 'assistant';
}

/**
 * Editorial intelligence message renderer with clean typography and zero chat bubbles.
 */
export const ChatMessageRenderer: React.FC<ChatMessageRendererProps> = ({ message, role }) => {
  const [copied, setCopied] = useState(false);
  const isUser = role === 'user';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className={clsx(
        'group relative py-4 border-b border-white/[0.06] transition-colors',
        isUser ? 'bg-transparent' : 'bg-white/[0.01]',
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            {isUser ? 'YOU' : 'INTELLIGENCE'}
          </span>
          {!isUser && (
            <span className="text-[10px] font-mono text-neutral-400 border border-white/[0.1] px-1.5 py-0.2">
              GROUNDED
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={copy}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] font-mono text-neutral-500 hover:text-neutral-300"
          title="Copy message"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-white" />
              <span>COPIED</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>COPY</span>
            </>
          )}
        </button>
      </div>

      <div className={clsx('text-[14px] leading-relaxed space-y-2', isUser ? 'text-white font-medium' : 'text-neutral-300')}>
        {renderRichMessage(message)}
      </div>
    </div>
  );
};

/** Formats message with line breaks, bullets, and inline code blocks */
function renderRichMessage(text: string): React.ReactNode {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, pIdx) => {
    const lines = para.split('\n');
    return (
      <div key={pIdx} className="space-y-1">
        {lines.map((line, lIdx) => {
          const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
          const content = isBullet ? line.trim().substring(2) : line;

          return (
            <div
              key={lIdx}
              className={clsx(
                isBullet && 'flex items-start gap-2 pl-3',
                'min-h-[1.4em]',
              )}
            >
              {isBullet && (
                <span className="w-1 h-1 rounded-none bg-neutral-400 mt-2.5 flex-shrink-0" aria-hidden="true" />
              )}
              <span className="flex-1">{renderInlineCode(content)}</span>
            </div>
          );
        })}
      </div>
    );
  });
}

/** Splits on backticks so cited field names render as code without a markdown lib. */
function renderInlineCode(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={index}
          className="font-mono text-[12px] px-1 py-0.5 bg-white/[0.06] border border-white/[0.1] text-white mx-0.5"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
