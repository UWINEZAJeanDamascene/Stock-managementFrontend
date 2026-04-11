import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, Send, Clock } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';

interface Message {
  id: string;
  type: 'bot' | 'user';
  text: string;
  timestamp: Date;
}

const quickReplies = [
  'How does pricing work?',
  'Is there a free trial?',
  'Do you offer training?',
  'What payment methods?',
];

const botResponses: Record<string, string> = {
  'How does pricing work?': 'We offer three tiers: Starter (Rwf 15k/mo), Business (Rwf 30k/mo), and Pro (Rwf 45k/mo). Yearly plans get 20% off!',
  'Is there a free trial?': 'Yes! We offer a 14-day free trial with full access to all features. No credit card required.',
  'Do you offer training?': 'Absolutely! We provide free onboarding training for all new customers, plus video tutorials and documentation.',
  'What payment methods?': 'We accept MTN MoMo, Airtel Money, bank transfers, Visa, and Mastercard.',
  'default': "Thanks for your message! Our team typically responds within 15 minutes during business hours (8 AM - 6 PM CAT). For urgent issues, please email uwinezajd2@gmail.com or WhatsApp us at +250780936645.",
};

export function LiveChatWidget() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setTimeout(() => {
        setMessages([
          {
            id: '1',
            type: 'bot',
            text: "👋 Hi there! I'm your StockManager assistant. How can I help you today?",
            timestamp: new Date(),
          },
        ]);
        setHasNewMessage(true);
      }, 2000);
    }
  }, [messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear notification when opened
  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Simulate bot response
    setTimeout(() => {
      const responseText = botResponses[inputValue] || botResponses['default'];
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: responseText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      if (!isOpen) {
        setHasNewMessage(true);
      }
    }, 1000);
  };

  const handleQuickReply = (reply: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: reply,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    setTimeout(() => {
      const responseText = botResponses[reply] || botResponses['default'];
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: responseText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
          boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.4)',
        }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6 text-white" />
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            )}
          </>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 md:w-96 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300"
          style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Header */}
          <div
            className="p-4 flex items-center justify-between"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">StockManager Support</p>
                <div className="flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="text-xs text-white/80">Online</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div
            className="h-80 overflow-y-auto p-4 space-y-4"
            style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    message.type === 'user'
                      ? 'rounded-br-none'
                      : 'rounded-bl-none'
                  }`}
                  style={{
                    backgroundColor:
                      message.type === 'user'
                        ? '#7c3aed'
                        : isDark
                        ? '#1e293b'
                        : '#ffffff',
                    color:
                      message.type === 'user'
                        ? '#ffffff'
                        : isDark
                        ? '#f1f5f9'
                        : '#0f172a',
                    border:
                      message.type === 'bot'
                        ? `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
                        : 'none',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {message.type === 'bot' ? (
                      <span className="text-xs font-medium text-purple-500">Support</span>
                    ) : (
                      <span className="text-xs font-medium text-white/80">You</span>
                    )}
                    <span className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            ))}

            {/* Quick Replies */}
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {quickReplies.map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickReply(reply)}
                    className="px-3 py-1.5 text-xs rounded-full transition-all duration-200 hover:scale-105"
                    style={{
                      backgroundColor: isDark ? '#334155' : '#e2e8f0',
                      color: isDark ? '#f1f5f9' : '#0f172a',
                    }}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="p-4 border-t"
            style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderColor: isDark ? '#334155' : '#e2e8f0',
            }}
          >
            <div className="flex items-center gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t('landing.chat.placeholder')}
                className="flex-1"
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  color: isDark ? '#f1f5f9' : '#0f172a',
                }}
              />
              <Button
                onClick={handleSend}
                size="icon"
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center gap-1 mt-2">
              <Clock className="w-3 h-3 text-purple-500" />
              <span className="text-xs" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                {t('landing.chat.responseTime')}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default LiveChatWidget;
