import { create } from 'zustand';
import api from '../lib/api';

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface Session {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatState {
  sessions: Session[];
  currentSession: Session | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  
  loadSessions: () => Promise<void>;
  createSession: (title?: string) => Promise<Session>;
  selectSession: (session: Session) => Promise<void>;
  deleteSession: (sessionId: number) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,

  loadSessions: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/chat/sessions');
      set({ sessions: response.data, isLoading: false });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.detail || 'Failed to load sessions' 
      });
    }
  },

  createSession: async (title = 'New Chat') => {
    try {
      const response = await api.post('/chat/sessions', { title });
      const session = response.data;
      set((state) => ({ 
        sessions: [session, ...state.sessions],
        currentSession: session,
        messages: []
      }));
      return session;
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to create session' });
      throw error;
    }
  },

  selectSession: async (session) => {
    set({ isLoading: true, currentSession: session });
    try {
      const response = await api.get(`/chat/sessions/${session.id}/messages`);
      set({ messages: response.data, isLoading: false });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.detail || 'Failed to load messages' 
      });
    }
  },

  deleteSession: async (sessionId) => {
    try {
      await api.delete(`/chat/sessions/${sessionId}`);
      set((state) => ({
        sessions: state.sessions.filter(s => s.id !== sessionId),
        currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
        messages: state.currentSession?.id === sessionId ? [] : state.messages
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to delete session' });
    }
  },

  sendMessage: async (message) => {
    const { currentSession } = get();
    
    // Add user message to UI immediately
    set((state) => ({
      isSending: true,
      messages: [...state.messages, { role: 'user', content: message }]
    }));

    try {
      const response = await api.post('/chat/send', {
        message,
        session_id: currentSession?.id
      });

      const { response: assistantResponse, session_id } = response.data;

      // If new session was created, reload sessions
      if (!currentSession) {
        const sessionsResponse = await api.get('/chat/sessions');
        const newSession = sessionsResponse.data.find((s: Session) => s.id === session_id);
        set((state) => ({
          sessions: sessionsResponse.data,
          currentSession: newSession,
          messages: [...state.messages, { role: 'assistant', content: assistantResponse }],
          isSending: false
        }));
      } else {
        set((state) => ({
          messages: [...state.messages, { role: 'assistant', content: assistantResponse }],
          isSending: false
        }));
      }
    } catch (error: any) {
      set((state) => ({
        isSending: false,
        error: error.response?.data?.detail || 'Failed to send message',
        // Remove the optimistic user message on error
        messages: state.messages.slice(0, -1)
      }));
    }
  },

  clearError: () => set({ error: null }),
}));
