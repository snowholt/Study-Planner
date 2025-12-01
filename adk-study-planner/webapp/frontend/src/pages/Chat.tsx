import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { 
  Plus, 
  Send, 
  Settings, 
  LogOut, 
  MessageSquare, 
  Trash2,
  BookOpen,
  Loader2,
  Menu,
  X,
  AlertCircle
} from 'lucide-react';

export default function Chat() {
  const { user, token, logout } = useAuthStore();
  const { 
    sessions, 
    currentSession, 
    messages, 
    isSending, 
    error,
    loadSessions, 
    createSession, 
    selectSession, 
    deleteSession,
    sendMessage,
    clearError 
  } = useChatStore();
  
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Only load sessions when we have a token
    if (token) {
      loadSessions();
    }
  }, [loadSessions, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleNewChat = async () => {
    await createSession();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex bg-[var(--bg-primary)]">
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
              <p className="text-xs text-[var(--text-secondary)] truncate">{user?.username}</p>
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
          {sessions.length === 0 ? (
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
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-2 border-t border-[var(--border-color)]">
          <button
            onClick={() => navigate('/settings')}
            className="w-full p-3 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-secondary)]"
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm">Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full p-3 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-secondary)]"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Sign out</span>
          </button>
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
          <h1 className="font-medium text-[var(--text-primary)] truncate">
            {currentSession?.title || 'New Conversation'}
          </h1>
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
          {messages.length === 0 && !user?.has_api_key ? (
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
                  onClick={() => navigate('/settings')}
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
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>
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
                  placeholder={user?.has_api_key ? "Ask for a study plan..." : "Please set your API key first..."}
                  disabled={!user?.has_api_key || isSending}
                  rows={1}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-purple-500 transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ minHeight: '48px', maxHeight: '200px' }}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || !user?.has_api_key || isSending}
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
