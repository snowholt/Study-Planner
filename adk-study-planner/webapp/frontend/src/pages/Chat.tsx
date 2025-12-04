import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useGuestStore } from '../stores/guestStore';
import SignupPrompt from '../components/SignupPrompt';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../lib/api';
import {
  Plus,
  Settings,
  LogOut,
  LogIn,
  MessageSquare,
  Trash2,
  BookOpen,
  Loader2,
  Menu,
  X,
  AlertCircle,
  Paperclip,
  Sun,
  Moon,
  Mic,
  ExternalLink,
  Youtube,
  FileText,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';

// Custom Send Icon (paper airplane style)
const SendIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat() {
  const { user, token, logout } = useAuthStore();
  const {
    sessions,
    currentSession,
    messages: authMessages,
    isSending: authIsSending,
    error: authError,
    loadSessions,
    createSession,
    selectSession,
    deleteSession,
    sendMessage: authSendMessage,
    clearError: authClearError
  } = useChatStore();

  const {
    guestApiKey,
    guestMessages,
    addGuestMessage,
    clearGuestMessages,
    incrementMessageCount,
    checkShouldShowPrompt,
    showSignupPrompt,
    showPrompt
  } = useGuestStore();

  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [guestSending, setGuestSending] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ||
        localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return true;
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const navigate = useNavigate();

  // Determine if user is authenticated
  const isAuthenticated = !!token;

  // Use appropriate state based on auth status
  const messages: Message[] = isAuthenticated ? authMessages : guestMessages;
  const isSending = isAuthenticated ? authIsSending : guestSending;
  const error = isAuthenticated ? authError : guestError;
  const hasApiKey = isAuthenticated ? user?.has_api_key : !!guestApiKey;

  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
    }
  }, [loadSessions, isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Theme toggle effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMicClick = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setInput(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Guest message handler
  const sendGuestMessage = async (message: string) => {
    if (!guestApiKey) return;

    setGuestSending(true);
    setGuestError(null);

    // Add user message immediately
    addGuestMessage({ role: 'user', content: message, timestamp: Date.now() });
    incrementMessageCount();

    try {
      const response = await api.post('/chat/guest', {
        message,
        api_key: guestApiKey,
        conversation_history: guestMessages.map(m => ({ role: m.role, content: m.content }))
      });

      addGuestMessage({ role: 'assistant', content: response.data.response, timestamp: Date.now() });

      // Check if we should show signup prompt
      if (checkShouldShowPrompt()) {
        showPrompt();
      }
    } catch (err: any) {
      setGuestError(err.response?.data?.detail || 'Failed to send message');
    } finally {
      setGuestSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const message = input.trim();
    setInput('');

    if (isAuthenticated) {
      await authSendMessage(message);
    } else {
      await sendGuestMessage(message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleNewChat = async () => {
    if (isAuthenticated) {
      await createSession();
    } else {
      clearGuestMessages();
    }
  };

  const handleLogout = () => {
    logout();
  };

  const clearError = () => {
    if (isAuthenticated) {
      authClearError();
    } else {
      setGuestError(null);
    }
  };

  const settingsPath = isAuthenticated ? '/settings' : '/guest-settings';

  return (
    <div className="h-screen flex bg-[var(--bg-primary)]">
      {/* Signup Prompt Modal */}
      {showSignupPrompt && <SignupPrompt />}

      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-0'
          } flex-shrink-0 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col transition-all duration-300 overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-medium text-sm text-[var(--text-primary)] truncate">Study Planner</h2>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {isAuthenticated ? user?.username : 'Guest'}
              </p>
            </div>
          </div>
          <button
            onClick={handleNewChat}
            className="group w-[90%] mx-auto py-2 px-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2 mb-2"
          >
            <div className="flex items-center justify-center text-[var(--text-primary)]">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="icon" aria-hidden="true"><path d="M2.6687 11.333V8.66699C2.6687 7.74455 2.66841 7.01205 2.71655 6.42285C2.76533 5.82612 2.86699 5.31731 3.10425 4.85156L3.25854 4.57617C3.64272 3.94975 4.19392 3.43995 4.85229 3.10449L5.02905 3.02149C5.44666 2.84233 5.90133 2.75849 6.42358 2.71582C7.01272 2.66769 7.74445 2.66797 8.66675 2.66797H9.16675C9.53393 2.66797 9.83165 2.96586 9.83179 3.33301C9.83179 3.70028 9.53402 3.99805 9.16675 3.99805H8.66675C7.7226 3.99805 7.05438 3.99834 6.53198 4.04102C6.14611 4.07254 5.87277 4.12568 5.65601 4.20313L5.45581 4.28906C5.01645 4.51293 4.64872 4.85345 4.39233 5.27149L4.28979 5.45508C4.16388 5.7022 4.08381 6.01663 4.04175 6.53125C3.99906 7.05373 3.99878 7.7226 3.99878 8.66699V11.333C3.99878 12.2774 3.99906 12.9463 4.04175 13.4688C4.08381 13.9833 4.16389 14.2978 4.28979 14.5449L4.39233 14.7285C4.64871 15.1465 5.01648 15.4871 5.45581 15.7109L5.65601 15.7969C5.87276 15.8743 6.14614 15.9265 6.53198 15.958C7.05439 16.0007 7.72256 16.002 8.66675 16.002H11.3337C12.2779 16.002 12.9461 16.0007 13.4685 15.958C13.9829 15.916 14.2976 15.8367 14.5447 15.7109L14.7292 15.6074C15.147 15.3511 15.4879 14.9841 15.7117 14.5449L15.7976 14.3447C15.8751 14.128 15.9272 13.8546 15.9587 13.4688C16.0014 12.9463 16.0017 12.2774 16.0017 11.333V10.833C16.0018 10.466 16.2997 10.1681 16.6667 10.168C17.0339 10.168 17.3316 10.4659 17.3318 10.833V11.333C17.3318 12.2555 17.3331 12.9879 17.2849 13.5771C17.2422 14.0993 17.1584 14.5541 16.9792 14.9717L16.8962 15.1484C16.5609 15.8066 16.0507 16.3571 15.4246 16.7412L15.1492 16.8955C14.6833 17.1329 14.1739 17.2354 13.5769 17.2842C12.9878 17.3323 12.256 17.332 11.3337 17.332H8.66675C7.74446 17.332 7.01271 17.3323 6.42358 17.2842C5.90135 17.2415 5.44665 17.1577 5.02905 16.9785L4.85229 16.8955C4.19396 16.5601 3.64271 16.0502 3.25854 15.4238L3.10425 15.1484C2.86697 14.6827 2.76534 14.1739 2.71655 13.5771C2.66841 12.9879 2.6687 12.2555 2.6687 11.333ZM13.4646 3.11328C14.4201 2.334 15.8288 2.38969 16.7195 3.28027L16.8865 3.46485C17.6141 4.35685 17.6143 5.64423 16.8865 6.53613L16.7195 6.7207L11.6726 11.7686C11.1373 12.3039 10.4624 12.6746 9.72827 12.8408L9.41089 12.8994L7.59351 13.1582C7.38637 13.1877 7.17701 13.1187 7.02905 12.9707C6.88112 12.8227 6.81199 12.6134 6.84155 12.4063L7.10132 10.5898L7.15991 10.2715C7.3262 9.53749 7.69692 8.86241 8.23218 8.32715L13.2791 3.28027L13.4646 3.11328ZM15.7791 4.2207C15.3753 3.81702 14.7366 3.79124 14.3035 4.14453L14.2195 4.2207L9.17261 9.26856C8.81541 9.62578 8.56774 10.0756 8.45679 10.5654L8.41772 10.7773L8.28296 11.7158L9.22241 11.582L9.43433 11.543C9.92426 11.432 10.3749 11.1844 10.7322 10.8271L15.7791 5.78027L15.8552 5.69629C16.185 5.29194 16.1852 4.708 15.8552 4.30371L15.7791 4.2207Z"></path></svg>
            </div>
            <span className="text-sm font-medium text-[var(--text-primary)]">New chat</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isAuthenticated ? (
            sessions.length === 0 ? (
              <p className="text-center text-[var(--text-secondary)] text-xs py-6">
                No conversations yet
              </p>
            ) : (
              <div className="space-y-0.5">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${currentSession?.id === session.id
                      ? 'bg-[var(--bg-tertiary)]'
                      : 'hover:bg-[var(--bg-tertiary)]/50'
                      }`}
                    onClick={() => selectSession(session)}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[var(--text-secondary)] flex-shrink-0" />
                    <span className="flex-1 text-xs text-[var(--text-primary)] truncate">
                      {session.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-[var(--text-secondary)] hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-6 px-3">
              <p className="text-[var(--text-secondary)] text-xs">
                Sign in to save conversations
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-2 border-t border-[var(--border-color)]">
          <button
            onClick={() => navigate(settingsPath)}
            className="w-full p-2.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2.5 text-[var(--text-secondary)]"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Settings</span>
          </button>
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="w-full p-2.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2.5 text-[var(--text-secondary)]"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sign out</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="w-full p-2.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2.5 text-[var(--text-secondary)]"
            >
              <LogIn className="w-4 h-4" />
              <span className="text-sm">Sign in</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Chat Header - Clean minimal style */}
        <header className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-secondary)]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-medium text-[var(--text-primary)] text-sm ml-4">
              {isAuthenticated ? (currentSession?.title || 'New Chat') : 'Study Planner'}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-3 rounded-xl hover:bg-[var(--bg-secondary)] transition-all text-[var(--text-secondary)] hover:text-pink-500 hover:scale-110"
              title={isDarkMode ? 'Light mode' : 'Dark mode'}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-400 flex-1">{error}</span>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !hasApiKey ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-[var(--text-secondary)]" />
              </div>
              <h2 className="text-xl font-normal text-[var(--text-primary)] mb-2">
                Welcome to Study Planner
              </h2>
              <p className="text-[var(--text-secondary)] text-sm mb-4">
                Set up your API key to get started
              </p>
              <button
                onClick={() => navigate(settingsPath)}
                className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-sm"
              >
                Go to Settings
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <h2 className="text-2xl font-normal text-[var(--text-primary)] mb-2">
                What would you like to learn?
              </h2>
              <p className="text-[var(--text-secondary)] text-sm">
                Ask me to create a study plan for any topic
              </p>
            </div>
          ) : (
            <div className="space-y-6" style={{ padding: '5%' }}>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  {message.role === 'user' ? (
                    /* User Message Bubble */
                    <div className="max-w-[80%]">
                      <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl rounded-tr-sm px-6 py-4 shadow-md">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Assistant Message Bubble */
                    <div className="w-full">
                      <div className="glass-panel rounded-2xl rounded-tl-sm" style={{ padding: '24px 32px' }}>
                        {/* Response Header */}
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border-color)]">
                          <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                          </div>
                          <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Study Plan Response</span>
                        </div>

                        {/* Main Content */}
                        <div className="prose prose-sm max-w-none text-[var(--text-primary)]">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({ href, children }) => (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 hover:underline font-medium">
                                  {children}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ),
                              h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-3 text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-lg font-bold mt-5 mb-2 text-[var(--text-primary)]">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-2 text-[var(--text-primary)] flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>{children}</h3>,
                              p: ({ children }) => <p className="mb-3 text-[var(--text-primary)] leading-relaxed text-sm">{children}</p>,
                              ul: ({ children }) => <ul className="list-none mb-3 space-y-2 text-sm ml-4">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-outside mb-3 space-y-2 text-sm ml-6">{children}</ol>,
                              li: ({ children }) => <li className="text-[var(--text-primary)] relative pl-4 before:content-['•'] before:absolute before:left-0 before:text-pink-500 before:font-bold mb-1">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>,
                              em: ({ children }) => <em className="italic text-[var(--text-secondary)]">{children}</em>,
                              code: ({ children }) => <code className="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-xs font-mono text-purple-300">{children}</code>,
                              pre: ({ children }) => <pre className="bg-[var(--bg-tertiary)] p-4 rounded-xl overflow-x-auto my-3 text-xs border border-[var(--border-color)]">{children}</pre>,
                              blockquote: ({ children }) => <blockquote className="border-l-3 border-purple-500/50 pl-4 py-2 my-3 bg-purple-500/5 rounded-r-lg italic text-[var(--text-secondary)] text-sm">{children}</blockquote>,
                              hr: () => <hr className="my-4 border-[var(--border-color)]" />,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>

                        {/* Extract and display resource links as buttons */}
                        {(() => {
                          const youtubeLinks = message.content.match(/https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[^\s)]+/g) || [];
                          const arxivLinks = message.content.match(/https?:\/\/arxiv\.org\/[^\s)]+/g) || [];
                          const hasLinks = youtubeLinks.length > 0 || arxivLinks.length > 0;

                          if (!hasLinks) return null;

                          return (
                            <div className="mt-5 pt-4 border-t border-[var(--border-color)]">
                              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-3">Resources Found</p>
                              <div className="flex flex-wrap gap-3">
                                {youtubeLinks.slice(0, 3).map((link, i) => (
                                  <a
                                    key={`yt-${i}`}
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex flex-col items-center justify-center w-32 h-24 rounded-xl glass-panel hover:bg-red-500/10 transition-all hover:-translate-y-1"
                                  >
                                    <div className="p-2 rounded-full bg-red-500/20 text-red-400 mb-2 group-hover:scale-110 transition-transform">
                                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                                    </div>
                                    <span className="text-xs font-medium text-red-400">Watch Video</span>
                                  </a>
                                ))}
                                {arxivLinks.slice(0, 2).map((link, i) => (
                                  <a
                                    key={`arxiv-${i}`}
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex flex-col items-center justify-center w-32 h-24 rounded-xl glass-panel hover:bg-blue-500/10 transition-all hover:-translate-y-1"
                                  >
                                    <div className="p-2 rounded-full bg-blue-500/20 text-blue-400 mb-2 group-hover:scale-110 transition-transform">
                                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                    </div>
                                    <span className="text-xs font-medium text-blue-400">Read Paper</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Copy Button at bottom */}
                        <div className="mt-5 pt-4 border-t border-[var(--border-color)] flex justify-end">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(message.content);
                              const btn = document.getElementById(`copy-btn-${index}`);
                              if (btn) {
                                btn.setAttribute('data-copied', 'true');
                                setTimeout(() => btn.removeAttribute('data-copied'), 2000);
                              }
                            }}
                            id={`copy-btn-${index}`}
                            className="group inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-color)] hover:border-[var(--text-secondary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] data-[copied=true]:text-green-400 data-[copied=true]:border-green-400/50 text-sm font-medium"
                            title="Copy response"
                          >
                            <Copy className="w-4 h-4 group-data-[copied=true]:hidden" />
                            <Check className="w-4 h-4 hidden group-data-[copied=true]:block" />
                            <span className="group-data-[copied=true]:hidden">Copy</span>
                            <span className="hidden group-data-[copied=true]:inline">Copied!</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl px-5 py-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                      <span className="text-sm text-[var(--text-secondary)]">Generating your study plan...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="py-4 bg-[var(--bg-primary)] flex justify-center">
          <div className="w-full max-w-2xl px-4">
            {/* Selected file preview */}
            {selectedFile && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                <Paperclip className="w-4 h-4 text-[var(--text-secondary)]" />
                <span className="text-sm text-[var(--text-primary)] flex-1 truncate">{selectedFile.name}</span>
                <button
                  type="button"
                  onClick={removeSelectedFile}
                  className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Input container */}
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative input-floating rounded-3xl focus-within:ring-2 focus-within:ring-pink-500/20 transition-all duration-300">
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.md"
                />

                {/* Textarea */}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={hasApiKey ? "Ask for a study plan..." : "Set your API key in settings..."}
                  disabled={!hasApiKey || isSending}
                  rows={1}
                  className="w-full bg-transparent text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed text-sm placeholder:text-center"
                  style={{
                    minHeight: '60px',
                    maxHeight: '160px',
                    paddingLeft: '24px',
                    paddingRight: '24px',
                    paddingTop: '20px',
                    paddingBottom: '56px'
                  }}
                />

                {/* Bottom toolbar */}
                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
                  {/* Left icons */}
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={handleFileSelect}
                      disabled={!hasApiKey || isSending}
                      className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Attach file"
                    >
                      <Paperclip className="w-[18px] h-[18px]" />
                    </button>
                    <button
                      type="button"
                      onClick={handleMicClick}
                      disabled={!hasApiKey || isSending}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isListening
                        ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                        }`}
                      title={isListening ? "Stop recording" : "Voice input"}
                    >
                      <Mic className={`w-[18px] h-[18px] ${isListening ? 'animate-pulse' : ''}`} />
                    </button>
                  </div>

                  {/* Send button */}
                  <button
                    type="submit"
                    disabled={!input.trim() || !hasApiKey || isSending}
                    className="p-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-80 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    {isSending ? (
                      <Loader2 className="w-[18px] h-[18px] animate-spin" />
                    ) : (
                      <SendIcon className="w-[18px] h-[18px]" />
                    )}
                  </button>
                </div>
              </div>
            </form>

            <p className="text-[10px] text-[var(--text-secondary)] text-center mt-2 opacity-60">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
