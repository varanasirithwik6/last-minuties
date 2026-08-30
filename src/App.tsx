import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { useAuthStore } from './stores/authStore';
import AppShell from './components/layout/AppShell';
import LoadingScreen from './components/common/LoadingScreen';
import InstallPrompt from './components/pwa/InstallPrompt';

// Lazy-loaded pages
const LandingPage = lazy(() => import('./pages/auth/LandingPage'));
const PhoneAuthPage = lazy(() => import('./pages/auth/PhoneAuthPage'));
const HomePage = lazy(() => import('./pages/app/HomePage'));
const FindPage = lazy(() => import('./pages/app/FindPage'));
const SellPage = lazy(() => import('./pages/app/SellPage'));
const ActivityPage = lazy(() => import('./pages/app/ActivityPage'));
const ProfilePage = lazy(() => import('./pages/app/ProfilePage'));
const TicketDetailPage = lazy(() => import('./pages/app/TicketDetailPage'));
const ChatPage = lazy(() => import('./pages/app/ChatPage'));
const NotificationsPage = lazy(() => import('./pages/app/NotificationsPage'));
const MatchPage = lazy(() => import('./pages/app/MatchPage'));
const EditListingPage = lazy(() => import('./pages/app/EditListingPage'));
const RequestsPage = lazy(() => import('./pages/app/RequestsPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

export default function App() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><PhoneAuthPage /></PublicRoute>} />
          <Route path="/auth" element={<PublicRoute><PhoneAuthPage /></PublicRoute>} />

          {/* Protected app routes */}
          <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route path="home" element={<HomePage />} />
            <Route path="find" element={<FindPage />} />
            <Route path="sell" element={<SellPage />} />
            <Route path="sell/:id/edit" element={<EditListingPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="requests" element={<RequestsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<ProfilePage />} />
            <Route path="ticket/:id" element={<TicketDetailPage />} />
            <Route path="chat/:connectionId" element={<ChatPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="match" element={<MatchPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <InstallPrompt />
    </BrowserRouter>
  );
}
