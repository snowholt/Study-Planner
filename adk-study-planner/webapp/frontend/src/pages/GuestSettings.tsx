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
  UserPlus,
  Shield,
  Zap,
  Infinity as InfinityIcon,
  Smartphone
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
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-pink-500/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6 relative z-10">

        {/* Left Column: Settings Card */}
        <div className="glass-panel rounded-3xl p-8 flex flex-col">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Guest Settings</h1>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Configure API Key</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Enter your Google API key to enable the AI assistant. Your key is stored locally in your browser.
              </p>
            </div>

            {/* Status Indicator */}
            <div className={`p-4 rounded-2xl border ${guestApiKey ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20'} transition-all`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${guestApiKey ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                  {guestApiKey ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {guestApiKey ? 'System Ready' : 'Configuration Needed'}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {guestApiKey ? 'You can now start chatting' : 'API key is required to proceed'}
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-pink-500 transition-colors">
                    <Key className="w-5 h-5" />
                  </div>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={guestApiKey ? '••••••••••••••••••••' : 'Paste your API key here'}
                    className="w-full pl-12 pr-12 py-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end">
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-pink-500 hover:text-pink-400 hover:underline flex items-center gap-1"
                  >
                    Get a free API key
                    <ArrowLeft className="w-3 h-3 rotate-180" />
                  </a>
                </div>
              </div>

              {success && (
                <div className="flex items-center gap-2 text-sm text-green-400 animate-in fade-in slide-in-from-top-1">
                  <Check className="w-4 h-4" />
                  {success}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-400 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!apiKey}
                  className="flex-1 py-3.5 px-6 rounded-xl btn-gradient font-semibold text-white shadow-lg hover:shadow-pink-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                >
                  Save Configuration
                </button>
                {guestApiKey && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="p-3.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove API Key"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Benefits / Upsell */}
        <div className="glass-panel rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-purple-500/5 group-hover:opacity-75 transition-opacity" />

          <div className="relative z-10 space-y-8">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Unlock Full Potential</h2>
              <p className="text-[var(--text-secondary)]">
                Create a free account to sync your study plans across devices and access premium features.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { icon: Smartphone, title: 'Sync Devices', desc: 'Access your chats anywhere' },
                { icon: Shield, title: 'Secure Storage', desc: 'Encrypted cloud vault' },
                { icon: InfinityIcon, title: 'No Limits', desc: 'Unlimited conversation history' },
                { icon: Zap, title: 'Always Free', desc: 'No credit card required' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] hover:border-pink-500/30 transition-colors">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 text-pink-500">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm">{item.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/register')}
              className="w-full py-4 rounded-xl border border-[var(--border-color)] hover:border-pink-500/50 hover:bg-pink-500/5 text-[var(--text-primary)] font-semibold transition-all flex items-center justify-center gap-2 group/btn"
            >
              <UserPlus className="w-5 h-5 group-hover/btn:text-pink-500 transition-colors" />
              Create Free Account
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
