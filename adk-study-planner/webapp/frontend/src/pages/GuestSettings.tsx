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
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Guest Settings</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Guest Notice */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-500/20">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-2">
            You're using Study Planner as a guest
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Your API key and conversations are stored locally in your browser. 
            Create an account to save your data across devices and unlock all features.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
          >
            <UserPlus className="w-4 h-4" />
            Create Account
          </button>
        </div>

        {/* API Key Section */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)]">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-2">Google API Key</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            To use the AI assistant, you need a Google API key. Get one for free from{' '}
            <a 
              href="https://aistudio.google.com/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:underline"
            >
              Google AI Studio
            </a>
          </p>

          {/* Status */}
          <div className="mb-4 p-3 rounded-xl bg-[var(--bg-tertiary)]">
            <p className="text-sm">
              <span className="text-[var(--text-secondary)]">Status: </span>
              {guestApiKey ? (
                <span className="text-green-400">API key configured ✓</span>
              ) : (
                <span className="text-yellow-400">Not set - required to chat</span>
              )}
            </p>
          </div>

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 mb-4">
              <Check className="w-5 h-5" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={guestApiKey ? '••••••••••••••••••••' : 'Enter your Google API key'}
                style={{ paddingLeft: '48px' }}
                className="w-full pr-12 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!apiKey}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save API Key
              </button>
              {guestApiKey && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="py-2.5 px-4 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Benefits of signing up */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)]">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Why create an account?</h2>
          <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span>Save your conversations and access them from any device</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span>Securely store your API key with encryption</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span>Unlimited conversations without prompts</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span>It's completely free!</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
