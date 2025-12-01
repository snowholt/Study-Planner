import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuestStore } from '../stores/guestStore';
import { 
  Key, 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  Trash2,
  Eye,
  EyeOff,
  UserPlus
} from 'lucide-react';

export default function GuestSettings() {
  const navigate = useNavigate();
  const { guestApiKey, setGuestApiKey, removeGuestApiKey } = useGuestStore();
  
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    // Basic validation - Google API keys typically start with 'AIza'
    if (!apiKey.startsWith('AIza')) {
      setError('This doesn\'t look like a valid Google API key');
      return;
    }

    setGuestApiKey(apiKey.trim());
    setSuccess('API key saved! You can now start chatting.');
    setApiKey('');
  };

  const handleDelete = () => {
    removeGuestApiKey();
    setSuccess('API key removed');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 relative flex items-center justify-center pt-[10%]">
          <button 
            onClick={() => navigate('/')}
            className="absolute left-4 p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] text-justify">Guest Settings</h1>
        </div>
      </header>

      <main className="w-full flex justify-center py-12">
        <div className="w-full max-w-2xl px-6 space-y-8">
        {/* Guest Notice */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-8 border border-purple-500/20 shadow-lg shadow-purple-500/5 text-center">
          <div className="flex items-start justify-between gap-6 mb-6 text-left">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                You're using Study Planner as a guest
              </h2>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                Your API key and conversations are stored locally in your browser. 
                Create an account to save your data across devices and unlock all features.
              </p>
            </div>
            <div className="hidden sm:flex p-4 bg-purple-500/10 rounded-2xl shrink-0">
              <UserPlus className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <button
            onClick={() => navigate('/register')}
            className="w-auto inline-flex items-center justify-center gap-3 py-2 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-all shadow-md hover:shadow-lg hover:shadow-purple-500/20 text-lg"
          >
            <UserPlus className="w-5 h-5" />
            Create Free Account
          </button>
        </div>

        {/* API Key Section */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-8 border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-1">Google API Key</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Required to power the AI assistant
              </p>
            </div>
            <a 
              href="https://aistudio.google.com/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm font-medium text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1.5 bg-purple-500/5 px-3 py-1.5 rounded-lg transition-colors"
            >
              Get API Key
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>

          {/* Status */}
          <div className={`mb-6 p-4 rounded-xl border ${guestApiKey ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${guestApiKey ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                {guestApiKey ? <Check className="w-4 h-4 text-green-400" /> : <AlertCircle className="w-4 h-4 text-yellow-400" />}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {guestApiKey ? 'API Key Configured' : 'API Key Missing'}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {guestApiKey ? 'You are ready to start chatting' : 'Please enter your key below to continue'}
                </p>
              </div>
            </div>
          </div>

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 mb-4 animate-in fade-in slide-in-from-top-2">
              <Check className="w-5 h-5" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 mb-4 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-[var(--bg-primary)] text-[var(--text-secondary)] group-focus-within:text-purple-400 transition-colors">
                <Key className="w-4 h-4" />
              </div>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={guestApiKey ? '••••••••••••••••••••' : 'Enter your Google API key'}
                style={{ paddingLeft: '52px' }}
                className="w-full pr-12 py-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex gap-3 pt-2 justify-center">
              <button
                type="submit"
                disabled={!apiKey}
                className="flex-none w-auto py-2.5 px-6 rounded-xl bg-[var(--text-primary)] text-[var(--bg-primary)] font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Save Configuration
              </button>
              {guestApiKey && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="py-2.5 px-4 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                  title="Remove API Key"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Benefits of signing up */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-8 border border-[var(--border-color)] shadow-sm">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-6">Why create an account?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]">
              <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Sync Devices</p>
                <p className="text-xs text-[var(--text-secondary)]">Access chats anywhere</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]">
              <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Secure Storage</p>
                <p className="text-xs text-[var(--text-secondary)]">Encrypted key vault</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]">
              <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">No Limits</p>
                <p className="text-xs text-[var(--text-secondary)]">Unlimited conversations</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]">
              <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Always Free</p>
                <p className="text-xs text-[var(--text-secondary)]">No credit card needed</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
