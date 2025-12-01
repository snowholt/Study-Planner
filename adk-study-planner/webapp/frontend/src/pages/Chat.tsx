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
  ArrowUp, 
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
  UserPlus,
  Paperclip,
  Sun,
  Moon
} from 'lucide-react';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
          sidebarOpen ? 'w-72' : 'w-0'
        } flex-shrink-0 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col transition-all duration-300 overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-[var(--text-primary)] truncate">Study Planner</h2>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {isAuthenticated ? user?.username : 'Guest User'}
              </p>
            </div>
          </div>
          <button
            onClick={handleNewChat}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isAuthenticated ? (
            sessions.length === 0 ? (
              <p className="text-center text-[var(--text-secondary)] text-sm py-8">
                No conversations yet
              </p>
            ) : (
              <div className="space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-colors ${
                      currentSession?.id === session.id
                        ? 'bg-[var(--bg-tertiary)]'
                        : 'hover:bg-[var(--bg-tertiary)]/50'
                    }`}
                    onClick={() => selectSession(session)}
                  >
                    <MessageSquare className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
                    <span className="flex-1 text-sm text-[var(--text-primary)] truncate">
                      {session.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-[var(--text-secondary)] hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-8 px-4">
              <p className="text-[var(--text-secondary)] text-sm mb-4">
                Sign in to save your conversations
              </p>
              <button
                onClick={() => navigate('/register')}
                className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
              >
                <UserPlus className="w-4 h-4" />
                Create Account
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-2 border-t border-[var(--border-color)]">
          <button
            onClick={() => navigate(settingsPath)}
            className="w-full p-3 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-secondary)]"
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm">Settings</span>
          </button>
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="w-full p-3 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-secondary)]"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm">Sign out</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="w-full p-3 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-secondary)]"
            >
              <LogIn className="w-5 h-5" />
              <span className="text-sm">Sign in</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Chat Header - Clean minimal style */}
        <header className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-primary)]">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-full hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-secondary)]"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="font-medium text-[var(--text-primary)] truncate flex-1">
            {isAuthenticated ? (currentSession?.title || 'New Conversation') : 'Study Planner'}
          </h1>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-secondary)]"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
          {!isAuthenticated && (
            <button
              onClick={() => navigate('/register')}
              className="text-sm px-4 py-2 rounded-full border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Sign Up
            </button>
          )}
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
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 && !hasApiKey ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-14 h-14 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-6">
                <BookOpen className="w-7 h-7 text-[var(--text-secondary)]" />
              </div>
              <h2 className="text-2xl font-normal text-[var(--text-primary)] mb-3">
                Welcome to Study Planner
              </h2>
              <p className="text-[var(--text-secondary)] max-w-md mb-6 text-base">
                Set up your Google API key to get started
              </p>
              <button 
                onClick={() => navigate(settingsPath)}
                className="px-6 py-2.5 rounded-full border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors text-sm"
              >
                Go to Settings
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <h2 className="text-3xl font-normal text-[var(--text-primary)] mb-3">
                What would you like to learn?
              </h2>
              <p className="text-[var(--text-secondary)] max-w-md text-base">
                Ask me to create a study plan for any topic
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-3xl px-5 py-3 ${
                      message.role === 'user'
                        ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <div className="whitespace-pre-wrap text-base leading-relaxed">
                        {message.content}
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none text-[var(--text-primary)]">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children }) => (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] hover:underline">
                                {children}
                              </a>
                            ),
                            h1: ({ children }) => <h1 className="text-xl font-semibold mt-4 mb-2 text-[var(--text-primary)]">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-2 text-[var(--text-primary)]">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1 text-[var(--text-primary)]">{children}</h3>,
                            p: ({ children }) => <p className="mb-3 text-[var(--text-primary)] leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1.5">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1.5">{children}</ol>,
                            li: ({ children }) => <li className="text-[var(--text-primary)]">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            code: ({ children }) => <code className="bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                            pre: ({ children }) => <pre className="bg-[var(--bg-secondary)] p-4 rounded-xl overflow-x-auto my-3 text-sm">{children}</pre>,
                            blockquote: ({ children }) => <blockquote className="border-l-3 border-[var(--border-color)] pl-4 italic my-3 text-[var(--text-secondary)]">{children}</blockquote>,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="px-5 py-3">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--text-secondary)]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[var(--bg-primary)]">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            {/* Selected file preview */}
            {selectedFile && (
              <div className="mb-3 flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)]">
                <Paperclip className="w-4 h-4 text-[var(--text-secondary)]" />
                <span className="text-sm text-[var(--text-primary)] flex-1 truncate">{selectedFile.name}</span>
                <button
                  type="button"
                  onClick={removeSelectedFile}
                  className="p-1 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* Gemini-style input container */}
            <div className="relative bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] focus-within:border-[var(--text-secondary)] transition-colors shadow-sm">
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
                placeholder={hasApiKey ? "Ask for a study plan..." : "Please set your API key first..."}
                disabled={!hasApiKey || isSending}
                rows={1}
                className="w-full px-5 pt-4 pb-14 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed text-base"
                style={{ minHeight: '56px', maxHeight: '200px' }}
              />
              
              {/* Bottom toolbar inside the input */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                {/* Left side icons */}
                <div className="flex items-center gap-1">
                  {/* File upload button */}
                  <button
                    type="button"
                    onClick={handleFileSelect}
                    disabled={!hasApiKey || isSending}
                    className="p-2.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Upload file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Right side - Send button */}
                <button
                  type="submit"
                  disabled={!input.trim() || !hasApiKey || isSending}
                  className="p-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-80 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowUp className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            
            <p className="text-xs text-[var(--text-secondary)] text-center mt-3">
              Press Enter to send, Shift+Enter for new line
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
