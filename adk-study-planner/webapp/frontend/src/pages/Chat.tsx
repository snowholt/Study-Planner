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
  Send, 
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
  UserPlus
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
        {/* Chat Header */}
        <header className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="font-medium text-[var(--text-primary)] truncate flex-1">
            {isAuthenticated ? (currentSession?.title || 'New Conversation') : 'Guest Session'}
          </h1>
          {!isAuthenticated && (
            <button
              onClick={() => navigate('/register')}
              className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity"
            >
              Sign Up Free
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
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                Welcome to Study Planner
              </h2>
              <p className="text-[var(--text-secondary)] max-w-md mb-6">
                Before you can start, please set your Google API key in{' '}
                <button 
                  onClick={() => navigate(settingsPath)}
                  className="text-purple-400 hover:underline"
                >
                  Settings
                </button>
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                Start a Conversation
              </h2>
              <p className="text-[var(--text-secondary)] max-w-md">
                Ask me to create a study plan for any topic. I'll find academic papers and YouTube videos to help you learn.
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
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)]'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                    ) : (
                      <div className="prose prose-sm prose-invert max-w-none text-[var(--text-primary)]">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children }) => (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">
                                {children}
                              </a>
                            ),
                            h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 text-[var(--text-primary)]">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2 text-[var(--text-primary)]">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1 text-[var(--text-primary)]">{children}</h3>,
                            p: ({ children }) => <p className="mb-2 text-[var(--text-primary)]">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="text-[var(--text-primary)]">{children}</li>,
                            strong: ({ children }) => <strong className="font-bold text-[var(--text-primary)]">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            code: ({ children }) => <code className="bg-[var(--bg-tertiary)] px-1 py-0.5 rounded text-sm text-purple-300">{children}</code>,
                            pre: ({ children }) => <pre className="bg-[var(--bg-tertiary)] p-3 rounded-lg overflow-x-auto my-2">{children}</pre>,
                            blockquote: ({ children }) => <blockquote className="border-l-4 border-purple-500 pl-4 italic my-2">{children}</blockquote>,
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
                  <div className="bg-[var(--bg-secondary)] rounded-2xl px-4 py-3 border border-[var(--border-color)]">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={hasApiKey ? "Ask for a study plan..." : "Please set your API key first..."}
                  disabled={!hasApiKey || isSending}
                  rows={1}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-purple-500 transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ minHeight: '48px', maxHeight: '200px' }}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || !hasApiKey || isSending}
                className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-[var(--text-secondary)] text-center mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
