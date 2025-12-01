import { create } from 'zustand';

interface GuestMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface GuestState {
  // Guest API key (stored locally)
  guestApiKey: string | null;
  
  // Usage tracking
  messageCount: number;
  firstMessageTime: number | null;
  
  // Guest messages (stored in memory/localStorage)
  guestMessages: GuestMessage[];
  
  // Prompt state
  showSignupPrompt: boolean;
  promptDismissed: boolean;
  
  // Actions
  setGuestApiKey: (key: string) => void;
  removeGuestApiKey: () => void;
  addGuestMessage: (message: GuestMessage) => void;
  clearGuestMessages: () => void;
  incrementMessageCount: () => void;
  checkShouldShowPrompt: () => boolean;
  dismissPrompt: () => void;
  showPrompt: () => void;
  resetGuestData: () => void;
}

const GUEST_API_KEY_STORAGE = 'guest_api_key';
const GUEST_MESSAGE_COUNT_STORAGE = 'guest_message_count';
const GUEST_FIRST_MESSAGE_TIME_STORAGE = 'guest_first_message_time';
const GUEST_MESSAGES_STORAGE = 'guest_messages';
const GUEST_PROMPT_DISMISSED_STORAGE = 'guest_prompt_dismissed';

const MESSAGE_LIMIT = 3;
const TIME_LIMIT_MS = 60 * 60 * 1000; // 1 hour

export const useGuestStore = create<GuestState>((set, get) => ({
  guestApiKey: localStorage.getItem(GUEST_API_KEY_STORAGE),
  messageCount: parseInt(localStorage.getItem(GUEST_MESSAGE_COUNT_STORAGE) || '0', 10),
  firstMessageTime: localStorage.getItem(GUEST_FIRST_MESSAGE_TIME_STORAGE) 
    ? parseInt(localStorage.getItem(GUEST_FIRST_MESSAGE_TIME_STORAGE)!, 10) 
    : null,
  guestMessages: JSON.parse(localStorage.getItem(GUEST_MESSAGES_STORAGE) || '[]'),
  showSignupPrompt: false,
  promptDismissed: localStorage.getItem(GUEST_PROMPT_DISMISSED_STORAGE) === 'true',

  setGuestApiKey: (key) => {
    localStorage.setItem(GUEST_API_KEY_STORAGE, key);
    set({ guestApiKey: key });
  },

  removeGuestApiKey: () => {
    localStorage.removeItem(GUEST_API_KEY_STORAGE);
    set({ guestApiKey: null });
  },

  addGuestMessage: (message) => {
    const newMessages = [...get().guestMessages, message];
    localStorage.setItem(GUEST_MESSAGES_STORAGE, JSON.stringify(newMessages));
    set({ guestMessages: newMessages });
  },

  clearGuestMessages: () => {
    localStorage.removeItem(GUEST_MESSAGES_STORAGE);
    set({ guestMessages: [] });
  },

  incrementMessageCount: () => {
    const { messageCount, firstMessageTime } = get();
    const now = Date.now();
    
    // Set first message time if not set
    if (!firstMessageTime) {
      localStorage.setItem(GUEST_FIRST_MESSAGE_TIME_STORAGE, now.toString());
      set({ firstMessageTime: now });
    }
    
    const newCount = messageCount + 1;
    localStorage.setItem(GUEST_MESSAGE_COUNT_STORAGE, newCount.toString());
    set({ messageCount: newCount });
  },

  checkShouldShowPrompt: () => {
    const { messageCount, firstMessageTime, promptDismissed } = get();
    
    // Don't show if already dismissed
    if (promptDismissed) return false;
    
    // Check message limit
    if (messageCount >= MESSAGE_LIMIT) return true;
    
    // Check time limit
    if (firstMessageTime) {
      const elapsed = Date.now() - firstMessageTime;
      if (elapsed >= TIME_LIMIT_MS) return true;
    }
    
    return false;
  },

  dismissPrompt: () => {
    localStorage.setItem(GUEST_PROMPT_DISMISSED_STORAGE, 'true');
    set({ showSignupPrompt: false, promptDismissed: true });
  },

  showPrompt: () => {
    set({ showSignupPrompt: true });
  },

  resetGuestData: () => {
    localStorage.removeItem(GUEST_MESSAGE_COUNT_STORAGE);
    localStorage.removeItem(GUEST_FIRST_MESSAGE_TIME_STORAGE);
    localStorage.removeItem(GUEST_MESSAGES_STORAGE);
    localStorage.removeItem(GUEST_PROMPT_DISMISSED_STORAGE);
    set({
      messageCount: 0,
      firstMessageTime: null,
      guestMessages: [],
      showSignupPrompt: false,
      promptDismissed: false
    });
  }
}));
