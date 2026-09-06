import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute, { AdminRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import FeedPage from './pages/FeedPage';
import ExplorePage from './pages/ExplorePage';
import CreatePostPage from './pages/CreatePostPage';
import ProfilePage from './pages/ProfilePage';
import PostPage from './pages/PostPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminModeration from './pages/AdminModeration';
import MessagesPage from './pages/MessagesPage';

// Settings Pages
import SettingsLayout from './pages/settings/SettingsLayout';
import EditProfile from './pages/settings/EditProfile';
import NotificationsSettings from './pages/settings/NotificationsSettings';
import PrivacySettings from './pages/settings/PrivacySettings';
import HelpSettings from './pages/settings/HelpSettings';
import ComingSoonSettings from './pages/settings/ComingSoonSettings';
import InteractionsSettings from './pages/settings/InteractionsSettings';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

              {/* Protected routes with sidebar layout */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/feed" element={<FeedPage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/create-post" element={<CreatePostPage />} />
                <Route path="/post/:id" element={<PostPage />} />
                <Route path="/profile/:username" element={<ProfilePage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                
                {/* Messages Route */}
                <Route path="/messages" element={<MessagesPage />} />
                
                {/* Settings Routes */}
                <Route path="/settings" element={<SettingsLayout />}>
                  <Route index element={<Navigate to="edit-profile" replace />} />
                  <Route path="edit-profile" element={<EditProfile />} />
                  <Route path="notifications" element={<NotificationsSettings />} />
                  <Route path="privacy" element={<PrivacySettings />} />
                  <Route path="close-friends" element={<ComingSoonSettings title="Close Friends" />} />
                  <Route path="interactions" element={<InteractionsSettings />} />
                  <Route path="content-preferences" element={<ComingSoonSettings title="Content Preferences" />} />
                  <Route path="language" element={<ComingSoonSettings title="Language" />} />
                  <Route path="help" element={<HelpSettings />} />
                  <Route path="saved" element={<ComingSoonSettings title="Saved" />} />
                </Route>
              </Route>

              {/* Admin routes */}
              <Route element={<AdminRoute><Layout /></AdminRoute>}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/moderation" element={<AdminModeration />} />
              </Route>

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/feed" replace />} />
              <Route path="*" element={<Navigate to="/feed" replace />} />
            </Routes>
          </ToastProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
