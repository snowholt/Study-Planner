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
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
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
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
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
            className="w-full py-2 px-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--border-color)] transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Chat
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
                    className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      currentSession?.id === session.id
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
            <h1 className="font-medium text-[var(--text-primary)] text-sm">
              {isAuthenticated ? (currentSession?.title || 'New Chat') : 'Study Planner'}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-secondary)]"
              title={isDarkMode ? 'Light mode' : 'Dark mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {!isAuthenticated && (
              <button
                onClick={() => navigate('/register')}
                className="text-sm px-3 py-1.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 transition-opacity ml-1"
              >
                Sign Up
              </button>
            )}
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
            <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'user' ? (
                    /* User Message Bubble */
                    <div className="max-w-[80%] ml-8">
                      <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl rounded-tr-md px-5 py-3 shadow-sm">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-primary)]">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Assistant Message Bubble */
                    <div className="w-full max-w-[95%] mr-4">
                      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl rounded-tl-md px-6 py-5 shadow-sm">
                        {/* Response Header */}
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-color)]">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                              <Sparkles className="w-4 h-4 text-purple-400" />
                            </div>
                            <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Study Plan Response</span>
                          </div>
                          {/* Copy Button */}
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
                            className="group p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] data-[copied=true]:text-green-400"
                            title="Copy response"
                          >
                            <Copy className="w-4 h-4 group-data-[copied=true]:hidden" />
                            <Check className="w-4 h-4 hidden group-data-[copied=true]:block" />
                          </button>
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
                              li: ({ children }) => <li className="text-[var(--text-primary)] relative pl-4 before:content-['•'] before:absolute before:left-0 before:text-purple-400 before:font-bold">{children}</li>,
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
                              <div className="flex flex-wrap gap-2">
                                {youtubeLinks.slice(0, 3).map((link, i) => (
                                  <a
                                    key={`yt-${i}`}
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-medium"
                                  >
                                    <Youtube className="w-4 h-4" />
                                    Video {i + 1}
                                  </a>
                                ))}
                                {arxivLinks.slice(0, 2).map((link, i) => (
                                  <a
                                    key={`arxiv-${i}`}
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors text-xs font-medium"
                                  >
                                    <FileText className="w-4 h-4" />
                                    Paper {i + 1}
                                  </a>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
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
            <form onSubmit={handleSubmit}>
              <div className="relative bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] focus-within:border-[var(--text-secondary)]/50 transition-colors">
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
                      className={`p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        isListening 
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
