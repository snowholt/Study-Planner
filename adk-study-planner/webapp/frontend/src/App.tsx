import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import GuestSettings from './pages/GuestSettings';

// Protected route wrapper - only for authenticated users
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Auth pages - redirects to chat if already logged in
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  
  if (token) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main chat - accessible to everyone (guests and logged in users) */}
        <Route path="/" element={<Chat />} />
        
        {/* Guest settings - for API key setup without account */}
        <Route path="/guest-settings" element={<GuestSettings />} />
        
        {/* Auth routes */}
        <Route
          path="/login"
          element={
            <AuthRoute>
              <Login />
            </AuthRoute>
          }
        />
        <Route
          path="/register"
          element={
            <AuthRoute>
              <Register />
            </AuthRoute>
          }
        />
        
        {/* Protected routes - require login */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
