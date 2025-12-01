import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import { 
  Key, 
  Lock, 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  Trash2,
  Eye,
  EyeOff 
} from 'lucide-react';

export default function Settings() {
  const { user, loadUser, logout } = useAuthStore();
  const navigate = useNavigate();
  
  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeySuccess, setApiKeySuccess] = useState('');
  const [apiKeyError, setApiKeyError] = useState('');
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiKeyError('');
    setApiKeySuccess('');
    setApiKeyLoading(true);

    try {
      await api.put('/user/api-key', { api_key: apiKey });
      setApiKeySuccess('API key saved successfully');
      setApiKey('');
      await loadUser();
    } catch (error: any) {
      setApiKeyError(error.response?.data?.detail || 'Failed to save API key');
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleDeleteApiKey = async () => {
    setApiKeyError('');
    setApiKeySuccess('');
    setApiKeyLoading(true);

    try {
      await api.delete('/user/api-key');
      setApiKeySuccess('API key deleted');
      await loadUser();
    } catch (error: any) {
      setApiKeyError(error.response?.data?.detail || 'Failed to delete API key');
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setPasswordLoading(true);

    try {
      await api.put('/user/password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      setPasswordSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordError(error.response?.data?.detail || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await api.delete('/user/account');
      logout();
      navigate('/login');
    } catch (error: any) {
      setDeleteLoading(false);
      alert(error.response?.data?.detail || 'Failed to delete account');
    }
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
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Settings</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* User Info */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)]">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Profile</h2>
          <div className="space-y-3 text-[var(--text-secondary)]">
            <p><span className="text-[var(--text-primary)]">Username:</span> {user?.username}</p>
            <p><span className="text-[var(--text-primary)]">Email:</span> {user?.email}</p>
            <p>
              <span className="text-[var(--text-primary)]">API Key:</span>{' '}
              {user?.has_api_key ? (
                <span className="text-green-400">Configured ✓</span>
              ) : (
                <span className="text-yellow-400">Not set</span>
              )}
            </p>
          </div>
        </div>

        {/* API Key Section */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)]">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-2">Google API Key</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Your API key is encrypted and stored securely. Get one from{' '}
            <a 
              href="https://aistudio.google.com/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:underline"
            >
              Google AI Studio
            </a>
          </p>

          {apiKeySuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 mb-4">
              <Check className="w-5 h-5" />
              <span className="text-sm">{apiKeySuccess}</span>
            </div>
          )}

          {apiKeyError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{apiKeyError}</span>
            </div>
          )}

          <form onSubmit={handleApiKeySubmit} className="space-y-4">
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={user?.has_api_key ? '••••••••••••••••••••' : 'Enter your Google API key'}
                className="w-full pl-12 pr-12 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-purple-500 transition-colors"
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
                disabled={!apiKey || apiKeyLoading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {apiKeyLoading ? 'Saving...' : 'Save API Key'}
              </button>
              {user?.has_api_key && (
                <button
                  type="button"
                  onClick={handleDeleteApiKey}
                  disabled={apiKeyLoading}
                  className="py-2.5 px-4 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Change Password Section */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)]">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Change Password</h2>

          {passwordSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 mb-4">
              <Check className="w-5 h-5" />
              <span className="text-sm">{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                required
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                required
                minLength={8}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-red-500/30">
          <h2 className="text-lg font-medium text-red-400 mb-2">Danger Zone</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="py-2.5 px-4 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-red-400 text-sm">Are you sure? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="py-2.5 px-4 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleteLoading ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="py-2.5 px-4 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
