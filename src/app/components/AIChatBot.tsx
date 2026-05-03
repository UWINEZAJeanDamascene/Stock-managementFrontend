import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  MessageCircle, X, Send, Bot, Loader2, ChevronDown,
  LogIn, RotateCcw, Maximize2, Minimize2, Sparkles,
  TrendingUp, BarChart3, PieChart, Table, Zap,
} from 'lucide-react';
import { chatApi, type ChatMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend,
} from 'recharts';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Message extends ChatMessage {
  timestamp: Date;
}

interface ParsedBlock {
  type: 'text' | 'chart' | 'table';
  content: string;
  data?: any;
}

// ─── Quick questions ─────────────────────────────────────────────────────────
const QUICK_QUESTIONS = [
  '📦 How do I add a new product?',
  '🧾 How do I create and confirm an invoice?',
  '📊 Show me my sales trend this quarter',
  '💰 How does VAT (Tax A & B) work?',
  '🔄 How do I receive stock after a purchase?',
  '📈 What are my top 5 products by revenue?',
  '🏦 Why is my balance sheet not balanced?',
  '👥 How do I add a new user?',
];

// ─── Chart colors ───────────────────────────────────────────────────────────
const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

// ─── Parse message into blocks (text, chart, table) ───────────────────────────
function parseMessageBlocks(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const regex = /```json\n?([\s\S]*?)\n?```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Text before the JSON block
    const before = text.slice(lastIndex, match.index).trim();
    if (before) blocks.push({ type: 'text', content: before });

    try {
      const data = JSON.parse(match[1]);
      if (data.type === 'chart') {
        blocks.push({ type: 'chart', content: '', data });
      } else if (data.type === 'table') {
        blocks.push({ type: 'table', content: '', data });
      } else {
        blocks.push({ type: 'text', content: match[0] });
      }
    } catch {
      blocks.push({ type: 'text', content: match[0] });
    }

    lastIndex = regex.lastIndex;
  }

  const after = text.slice(lastIndex).trim();
  if (after) blocks.push({ type: 'text', content: after });

  if (blocks.length === 0 && text.trim()) {
    blocks.push({ type: 'text', content: text.trim() });
  }

  return blocks;
}

// ─── Inline markdown renderer ────────────────────────────────────────────────
function InlineMarkdown({ text }: { text: string }): React.ReactNode {
  // First, handle markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyCounter = 0;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      elements.push(<span key={keyCounter++}>{processInlineFormatting(text.slice(lastIndex, match.index))}</span>);
    }

    const linkText = match[1];
    let url = match[2];

    // Determine if this is an Excel download link
    const isExcelDownload = url.includes('/downloads/') || url.includes('/public-download/');

    if (isExcelDownload) {
      elements.push(
        <a
          key={keyCounter++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/20 px-3 py-1.5 text-sm font-medium text-emerald-400 hover:bg-emerald-600/30 transition-colors border border-emerald-600/30"
          onClick={(e) => {
            e.preventDefault();
            fetch(url)
              .then((res) => {
                if (!res.ok) throw new Error(`Download failed: ${res.status}`);
                // Extract filename from Content-Disposition header
                const disposition = res.headers.get('content-disposition');
                let filename = 'download.xlsx';
                if (disposition && disposition.includes('filename=')) {
                  const match = disposition.match(/filename="([^"]+)"/);
                  if (match) filename = match[1];
                }
                return res.blob().then(blob => ({ blob, filename }));
              })
              .then(({ blob, filename }) => {
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              })
              .catch((err) => {
                console.error('[Download] Error:', err);
                alert('Download failed: ' + err.message);
              });
          }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {linkText}
        </a>
      );
    } else {
      elements.push(
        <a
          key={keyCounter++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300 underline"
        >
          {linkText}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last link
  if (lastIndex < text.length) {
    elements.push(<span key={keyCounter++}>{processInlineFormatting(text.slice(lastIndex))}</span>);
  }

  return elements.length > 0 ? elements : <span>{processInlineFormatting(text)}</span>;
}

function processInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i} className="italic text-slate-300">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="rounded bg-slate-700 px-1 py-0.5 text-[11px] font-mono text-indigo-300">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

// ─── Render a chart block ───────────────────────────────────────────────────
function ChartBlock({ data }: { data: any }) {
  const { chartType = 'bar', labels = [], datasets = [], title = 'Chart' } = data;
  const chartData = useMemo(() => {
    return labels.map((label: string, i: number) => {
      const row: any = { name: label };
      datasets.forEach((ds: any) => {
        row[ds.label] = ds.data?.[i] ?? 0;
      });
      return row;
    });
  }, [labels, datasets]);

  const total = useMemo(() => {
    return datasets.reduce((sum: number, ds: any) => sum + (ds.data?.reduce((a: number, b: number) => a + b, 0) || 0), 0);
  }, [datasets]);

  return (
    <div className="my-3 rounded-xl border border-slate-700/60 bg-slate-900/80 p-3">
      <div className="mb-2 flex items-center gap-2">
        {chartType === 'line' && <TrendingUp className="h-4 w-4 text-indigo-400" />}
        {chartType === 'bar' && <BarChart3 className="h-4 w-4 text-emerald-400" />}
        {(chartType === 'pie' || chartType === 'doughnut') && <PieChart className="h-4 w-4 text-amber-400" />}
        <span className="text-xs font-semibold text-slate-200">{title}</span>
        {total > 0 && (
          <span className="ml-auto text-[10px] text-slate-400">
            Total: {total.toLocaleString('en-RW')}
          </span>
        )}
      </div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <RechartsTooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              {datasets.map((ds: any, i: number) => (
                <Line key={i} type="monotone" dataKey={ds.label} stroke={ds.color || CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          ) : chartType === 'bar' ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <RechartsTooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              {datasets.map((ds: any, i: number) => (
                <Bar key={i} dataKey={ds.label} fill={ds.color || CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          ) : (
            <RePieChart>
              <RechartsTooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Pie
                data={chartData}
                dataKey={datasets[0]?.label || 'value'}
                nameKey="name"
                cx="50%" cy="50%" outerRadius={70}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {chartData.map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
            </RePieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Render a table block ───────────────────────────────────────────────────
function TableBlock({ data }: { data: any }) {
  const { title = 'Data Table', columns = [], rows = [] } = data;
  return (
    <div className="my-3 rounded-xl border border-slate-700/60 bg-slate-900/80 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-700/60 bg-slate-800/50 px-3 py-2">
        <Table className="h-4 w-4 text-cyan-400" />
        <span className="text-xs font-semibold text-slate-200">{title}</span>
      </div>
      <div className="max-h-[260px] overflow-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-slate-800/80">
            <tr>
              {columns.map((col: string, i: number) => (
                <th key={i} className="px-3 py-2 font-semibold text-slate-300 border-b border-slate-700/50">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any[], ri: number) => (
              <tr key={ri} className="border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors">
                {row.map((cell: any, ci: number) => (
                  <td key={ci} className="px-3 py-1.5 text-slate-300">
                    {typeof cell === 'number' ? cell.toLocaleString('en-RW') : String(cell ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Render message content with charts/tables ──────────────────────────────
function MessageContent({ text }: { text: string }) {
  const blocks = useMemo(() => parseMessageBlocks(text), [text]);

  return (
    <div className="flex flex-col gap-0.5">
      {blocks.map((block, i) => {
        if (block.type === 'chart' && block.data) {
          return <ChartBlock key={i} data={block.data} />;
        }
        if (block.type === 'table' && block.data) {
          return <TableBlock key={i} data={block.data} />;
        }

        // Text block — split into paragraphs and lists
        const lines = block.content.split('\n');
        return (
          <div key={i} className="flex flex-col gap-0.5">
            {lines.map((line, li) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={li} className="h-1" />;

              // Heading
              if (trimmed.startsWith('### ')) {
                return <p key={li} className="mt-1 text-[11px] font-bold text-indigo-300 uppercase tracking-wide">{trimmed.slice(4)}</p>;
              }
              if (trimmed.startsWith('## ')) {
                return <p key={li} className="mt-1.5 text-[12px] font-bold text-white border-b border-slate-600 pb-0.5">{trimmed.slice(3)}</p>;
              }

              // Bullet
              if (/^[-*•]\s/.test(trimmed)) {
                return (
                  <div key={li} className="flex items-start gap-2 text-[12px] leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    <InlineMarkdown text={trimmed.replace(/^[-*•]\s/, '')} />
                  </div>
                );
              }

              // Numbered list
              if (/^\d+\.\s/.test(trimmed)) {
                const num = trimmed.match(/^\d+/)?.[0] || '';
                return (
                  <div key={li} className="flex items-start gap-2 text-[12px] leading-relaxed">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600/40 text-[9px] font-bold text-indigo-300">
                      {num}
                    </span>
                    <InlineMarkdown text={trimmed.replace(/^\d+\.\s/, '')} />
                  </div>
                );
              }

              // Horizontal rule
              if (trimmed === '---' || trimmed === '───') {
                return <hr key={li} className="my-1.5 border-slate-600" />;
              }

              // Regular paragraph
              return <p key={li} className="text-[12px] leading-relaxed"><InlineMarkdown text={trimmed} /></p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Time formatter ──────────────────────────────────────────────────────────
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-RW', { hour: '2-digit', minute: '2-digit' });
}

// ─── Initial message ─────────────────────────────────────────────────────────
const makeInitialMessage = (): Message => ({
  role: 'assistant',
  content: `Hi there! 👋 I'm **Stacy**, your StockManager AI assistant.

I have full knowledge of the system and can help you with:

- 📦 Products, stock, purchases & suppliers
- 🧾 Invoices, quotations & credit notes
- 📊 Reports: P&L, Balance Sheet, VAT, Cash Flow
- 🔧 Troubleshooting any issues
- 🇷🇼 Rwanda accounting & tax rules
- 💬 Just chatting — I'm here!

I can also fetch your **live data**, generate **charts** and **reports** on demand. Try asking me:

- "Show me my monthly revenue trend"
- "What are my top 5 products by revenue?"
- "Why is my balance sheet not balanced?"

What can I help you with today?`,
  timestamp: new Date(),
});

// ─── Component ────────────────────────────────────────────────────────────────
export default function AIChatBot() {
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

  // Responsive sizing: compact on all screens, never covers too much content
  const windowWidth = expanded
    ? 'w-[95%] max-w-[520px] sm:w-[480px] md:w-[520px]'
    : 'w-[95%] max-w-[400px] sm:w-[360px] md:w-[400px]';
  const windowHeight = expanded
    ? 'h-[70dvh] max-h-[600px] sm:h-[560px] md:h-[600px]'
    : 'h-[55dvh] max-h-[480px] sm:h-[460px] md:h-[480px]';

  // Keep the chat window from exceeding the viewport height (responsive + resize aware)
  const [viewportHeight, setViewportHeight] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 800);
  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const maxHeightPx = Math.max(320, viewportHeight - 120); // leave room for header/footer

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(p => !p)}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/30 transition-all duration-300 hover:scale-110 hover:shadow-indigo-500/50 active:scale-95"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-6 w-6" />}
        {/* unread badge removed to avoid overlapping red dot */}
      </button>

      {/* Chat window */}
      {open && (
        <div
          className={`fixed bottom-20 sm:bottom-24 right-2 sm:right-6 z-[9998] flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-slate-700/80 bg-slate-950 shadow-2xl shadow-black/40 transition-all duration-300 ${windowWidth} ${windowHeight}`}
          style={{ maxHeight: `${maxHeightPx}px` }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 bg-gradient-to-r from-indigo-700 via-violet-700 to-indigo-800 px-4 py-3.5">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30 backdrop-blur-sm">
              <Bot className="h-5 w-5 text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-indigo-700 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                Stacy
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-medium text-indigo-100">AI</span>
              </p>
              <p className="text-[11px] text-indigo-200 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {isAuthenticated ? 'Online · Full system knowledge' : 'Sign in to unlock full features'}
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
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 ring-1 ring-indigo-500/30">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                )}

                <div className={`flex flex-col gap-0.5 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[88%]`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 ${
                      msg.role === 'user'
                        ? 'rounded-tr-sm bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-[13px] shadow-md shadow-indigo-500/20'
                        : 'rounded-tl-sm bg-slate-800/90 text-slate-100 border border-slate-700/50 shadow-sm'
                    }`}
                  >
                    {msg.role === 'user'
                      ? <p className="leading-relaxed">{msg.content}</p>
                      : <MessageContent text={msg.content} />
                    }
                  </div>
                  <span className="px-1 text-[10px] text-slate-600">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {/* Quick questions */}
            {messages.length === 1 && !loading && isAuthenticated && (
              <div className="mt-1 flex flex-col gap-2">
                <p className="px-1 text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Quick questions:
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {QUICK_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-3 py-2 text-left text-[12px] text-indigo-300 transition-all hover:border-indigo-500/50 hover:bg-slate-700/60 hover:text-indigo-200 active:scale-[0.98]"
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
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 ring-1 ring-indigo-500/30">
                  <Bot className="h-3.5 w-3.5 text-white" />
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
              style={{ bottom: isAuthenticated ? '84px' : '72px' }}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}

          {/* Input area */}
          <div className="shrink-0 border-t border-slate-800/80 bg-slate-900/95 px-3 py-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-end gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-3 py-2 focus-within:border-indigo-500/50 focus-within:bg-slate-800 transition-all">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about your business..."
                    disabled={loading}
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 outline-none disabled:opacity-50 leading-relaxed max-h-[120px]"
                    style={{ scrollbarWidth: 'none' }}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                    className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white transition-all hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-md"
                  >
                    {loading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Send className="h-4 w-4" />
                    }
                  </button>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-slate-600 flex items-center justify-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Stacy · Powered by Groq · Verify important info
                </p>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-center text-[12px] text-slate-400">
                  Sign in to unlock AI-powered insights with your live data
                </p>
                <a
                  href="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 shadow-md"
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
