import { useNavigate } from 'react-router-dom';
import { X, UserPlus, Sparkles } from 'lucide-react';
import { useGuestStore } from '../stores/guestStore';

export default function SignupPrompt() {
  const navigate = useNavigate();
  const { dismissPrompt } = useGuestStore();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={dismissPrompt}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4 mx-auto">
          <Sparkles className="w-8 h-8 text-purple-400" />
        </div>

        {/* Content */}
        <h2 className="text-xl font-semibold text-[var(--text-primary)] text-center mb-2">
          Enjoying Study Planner?
        </h2>
        <p className="text-[var(--text-secondary)] text-center text-sm mb-6">
          Create a free account to save your conversations, sync across devices, and get unlimited access!
        </p>

        {/* Benefits */}
        <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 mb-6">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-[var(--text-secondary)]">
              <span className="text-green-400">✓</span> Save all your study plans
            </li>
            <li className="flex items-center gap-2 text-[var(--text-secondary)]">
              <span className="text-green-400">✓</span> Access from any device
            </li>
            <li className="flex items-center gap-2 text-[var(--text-secondary)]">
              <span className="text-green-400">✓</span> Secure API key storage
            </li>
            <li className="flex items-center gap-2 text-[var(--text-secondary)]">
              <span className="text-green-400">✓</span> 100% free forever
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/register')}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Create Free Account
          </button>
          <button
            onClick={dismissPrompt}
            className="w-full py-3 px-4 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Maybe Later
          </button>
        </div>

        <p className="text-xs text-[var(--text-secondary)] text-center mt-4">
          Already have an account?{' '}
          <button 
            onClick={() => navigate('/login')}
            className="text-purple-400 hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
