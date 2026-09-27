import { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronRight, User } from 'lucide-react';

interface ChatMessageRendererProps {
  message: string;
  role: 'user' | 'assistant';
}

/**
 * Renders a grounded assistant answer.
 *
 * Deliberately restrained: the answer is plain prose, so it is not dressed up in
 * gradients, avatars or quotation chrome. Inline code is supported because
 * answers frequently cite pipeline fields such as `routing_confidence`.
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
        'panel p-3.5',
        isUser ? 'bg-rail border-rail' : 'bg-surface',
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={clsx(
            'w-5 h-5 rounded-[2px] flex items-center justify-center flex-shrink-0',
            isUser ? 'bg-rail-3 text-rail-ink' : 'bg-brand-600 text-white',
          )}
          aria-hidden="true"
        >
          {isUser ? <User className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
        <span
          className={clsx(
            'font-label text-[10px] uppercase tracking-[0.16em]',
            isUser ? 'text-rail-ink-2' : 'text-ink-3',
          )}
        >
          {isUser ? 'Question' : 'Grounded answer'}
        </span>
        <button
          type="button"
          onClick={copy}
          className={clsx(
            'btn btn-sm btn-ghost ml-auto -my-1',
            isUser ? 'text-rail-ink-2 hover:text-rail-ink hover:bg-rail-3' : '',
          )}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div
        className={clsx(
          'text-[13px] leading-relaxed',
          isUser ? 'text-rail-ink' : 'text-ink-2',
        )}
      >
        {renderInlineCode(message)}
      </div>
    </div>
  );
};

/** Splits on backticks so cited field names render as code without a markdown lib. */
function renderInlineCode(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={index}
          className="value text-[12px] px-1 py-0.5 bg-sunken border border-line rounded-[2px] text-ink"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
