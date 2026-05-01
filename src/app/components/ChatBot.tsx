import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, X, Send, Bot, Loader2, ChevronDown,
  LogIn, RotateCcw, Maximize2, Minimize2,
} from 'lucide-react';
import { chatApi, type ChatMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Message extends ChatMessage {
  timestamp: Date;
}

// ─── Quick questions ─────────────────────────────────────────────────────────
const QUICK_QUESTIONS = [
  '📦 How do I add a new product?',
  '🧾 How do I create and confirm an invoice?',
  '📊 Why is my balance sheet not balanced?',
  '💰 How does VAT (Tax A & B) work?',
  '🔄 How do I receive stock after a purchase?',
  '📝 How do I create a credit note?',
  '📈 How do I generate a P&L report?',
  '👥 How do I add a new user?',
];

// ─── Markdown renderer ───────────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const inlineFormat = (str: string): React.ReactNode => {
    // Handle inline code, bold, italic
    const parts = str.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, pi) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={pi} className="rounded bg-slate-700 px-1 py-0.5 text-[11px] font-mono text-indigo-300">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pi} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return <em key={pi} className="italic text-slate-300">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines (add spacing)
    if (!trimmed) {
      elements.push(<div key={key++} className="h-1.5" />);
      i++;
      continue;
    }

    // Heading ## or ###
    if (trimmed.startsWith('### ')) {
      elements.push(
        <p key={key++} className="mt-1 text-[12px] font-bold text-indigo-300 uppercase tracking-wide">
          {inlineFormat(trimmed.slice(4))}
        </p>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <p key={key++} className="mt-1.5 text-[13px] font-bold text-white border-b border-slate-600 pb-0.5">
          {inlineFormat(trimmed.slice(3))}
        </p>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '───') {
      elements.push(<hr key={key++} className="my-1.5 border-slate-600" />);
      i++;
      continue;
    }

    // Code block ```
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={key++} className="my-1 overflow-x-auto rounded-lg bg-slate-950 p-2 text-[11px] font-mono text-green-400 border border-slate-700">
          {codeLines.join('\n')}
        </pre>
      );
      continue;
    }

    // Numbered list: 1. 2. etc
    if (/^\d+\.\s/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const content = lines[i].trim().replace(/^\d+\.\s/, '');
        items.push(
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600/40 text-[9px] font-bold text-indigo-300">
              {items.length + 1}
            </span>
            <span>{inlineFormat(content)}</span>
          </li>
        );
        i++;
      }
      elements.push(
        <ol key={key++} className="my-1 flex flex-col gap-1 text-[13px]">
          {items}
        </ol>
      );
      continue;
    }

    // Bullet list: - or * or •
    if (/^[-*•]\s/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i].trim())) {
        const content = lines[i].trim().replace(/^[-*•]\s/, '');
        items.push(
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
            <span>{inlineFormat(content)}</span>
          </li>
        );
        i++;
      }
      elements.push(
        <ul key={key++} className="my-1 flex flex-col gap-1 text-[13px]">
          {items}
        </ul>
      );
      continue;
    }

    // Emoji-prefixed checklist ✅ ⚠️ etc (treat like bullet)
    if (/^[✅⚠️❌🔧📦🧾💰📊📝👥📈🔄➡️💡🎯🏢🇷🇼]/.test(trimmed)) {
      elements.push(
        <p key={key++} className="text-[13px] leading-relaxed">
          {inlineFormat(trimmed)}
        </p>
      );
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="text-[13px] leading-relaxed">
        {inlineFormat(trimmed)}
      </p>
    );
    i++;
  }

  return <div className="flex flex-col gap-0.5">{elements}</div>;
}

// ─── Time formatter ──────────────────────────────────────────────────────────
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-RW', { hour: '2-digit', minute: '2-digit' });
}

// ─── Initial message ─────────────────────────────────────────────────────────
const makeInitialMessage = (): Message => ({
  role: 'assistant',
  content: `Hi there! 👋 I'm **Stacy**, your StockManager AI assistant.\n\nI have full knowledge of the system and can help you with:\n\n- 📦 Products, stock, purchases & suppliers\n- 🧾 Invoices, quotations & credit notes\n- 📊 Reports: P&L, Balance Sheet, VAT, Cash Flow\n- 🔧 Troubleshooting any issues\n- 🇷🇼 Rwanda accounting & tax rules\n- 💬 Just chatting — I'm here!\n\nWhat can I help you with today?`,
  timestamp: new Date(),
});

// ─── Component ───────────────────────────────────────────────────────────────
export default function ChatBot() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([makeInitialMessage()]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  useEffect(() => {
    if (open) {
      setUnreadCount(0);
      setTimeout(() => {
        textareaRef.current?.focus();
        scrollToBottom(false);
      }, 120);
    }
  }, [open, scrollToBottom]);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open, scrollToBottom]);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const sendMessage = async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText || loading) return;

    const userMsg: Message = { role: 'user', content: messageText, timestamp: new Date() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    try {
      // Pass chat history without timestamps (API doesn't need them)
      const history: ChatMessage[] = messages.map(m => ({ role: m.role, content: m.content }));
      const data = await chatApi.send(messageText, history);
      const botMsg: Message = { role: 'assistant', content: data.reply, timestamp: new Date() };
      setMessages([...updatedMessages, botMsg]);
      if (!open) setUnreadCount(c => c + 1);
    } catch (err: any) {
      const backendReply = err?.data?.reply || err?.response?.data?.reply;
      const errMsg: Message = {
        role: 'assistant',
        content: backendReply || 'I\'m having trouble connecting right now. Please check your connection and try again.',
        timestamp: new Date(),
      };
      setMessages([...updatedMessages, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleReset = () => {
    setMessages([makeInitialMessage()]);
    setInput('');
  };

  const windowWidth = expanded ? 'w-[520px]' : 'w-[370px]';
  const windowHeight = expanded ? '680px' : '560px';

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(p => !p)}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        className="fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 transition-all duration-200 hover:bg-indigo-500 hover:scale-110 active:scale-95"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-6 w-6" />}
        {/* unread badge removed to avoid overlapping red dot */}
      </button>

      {/* Chat window */}
      {open && (
        <div
          className={`fixed bottom-24 right-6 z-[9998] flex flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl transition-all duration-300 ${windowWidth}`}
          style={{ height: windowHeight }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 bg-gradient-to-r from-indigo-700 to-indigo-600 px-4 py-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30">
              <Bot className="h-5 w-5 text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 ring-1 ring-indigo-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Stacy — AI Assistant</p>
              <p className="text-[11px] text-indigo-200">
                {isAuthenticated ? '● Online · Full system knowledge' : 'Sign in to unlock full features'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpanded(p => !p)}
                title={expanded ? 'Compact view' : 'Expand'}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
              >
                {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              {isAuthenticated && (
                <button
                  onClick={handleReset}
                  title="New conversation"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                title="Close"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
          >
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                {msg.role === 'assistant' && (
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600/40 ring-1 ring-indigo-500/30">
                    <Bot className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                )}

                <div className={`flex flex-col gap-0.5 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                  <div
                    className={`rounded-2xl px-3 py-2.5 ${
                      msg.role === 'user'
                        ? 'rounded-tr-sm bg-indigo-600 text-white text-[13px]'
                        : 'rounded-tl-sm bg-slate-800 text-slate-100 border border-slate-700/50'
                    }`}
                  >
                    {msg.role === 'user'
                      ? <p className="leading-relaxed">{msg.content}</p>
                      : renderMarkdown(msg.content)
                    }
                  </div>
                  <span className="px-1 text-[10px] text-slate-600">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {/* Quick questions — shown only at start */}
            {messages.length === 1 && !loading && isAuthenticated && (
              <div className="mt-1 flex flex-col gap-1.5">
                <p className="px-1 text-[11px] text-slate-500 font-medium">Quick questions:</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {QUICK_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-left text-[12px] text-indigo-400 transition-all hover:border-indigo-500/50 hover:bg-slate-700/80 hover:text-indigo-300 active:scale-[0.98]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-2">
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600/40 ring-1 ring-indigo-500/30">
                  <Bot className="h-3.5 w-3.5 text-indigo-400" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-slate-800 px-4 py-3 border border-slate-700/50">
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:160ms]" />
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:320ms]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom */}
          {showScrollBtn && (
            <button
              onClick={() => scrollToBottom()}
              className="absolute right-4 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-500 transition-colors"
              style={{ bottom: isAuthenticated ? '80px' : '68px' }}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}

          {/* Input area */}
          <div className="shrink-0 border-t border-slate-800 bg-slate-900/95 px-3 py-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-end gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 focus-within:border-indigo-500/70 transition-colors">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
                    disabled={loading}
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 outline-none disabled:opacity-50 leading-relaxed max-h-[120px]"
                    style={{ scrollbarWidth: 'none' }}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                    className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-all hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                  >
                    {loading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Send className="h-4 w-4" />
                    }
                  </button>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-slate-600">
                  Stacy · Powered by Gemini 2.0 Flash · Verify important info
                </p>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-center text-[12px] text-slate-400">
                  Sign in to unlock personalised AI assistance with your live data
                </p>
                <a
                  href="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                >
                  <LogIn className="h-4 w-4" />
                  Sign in to chat with Stacy
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
