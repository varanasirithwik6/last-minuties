import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppShell() {
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith('/chat');

  return (
    <div className={`app-layout ${isChatRoute ? 'app-layout-chat' : ''}`}>
      {/* Desktop Sidebar (hidden when on full-screen chat) */}
      {!isChatRoute && <Sidebar />}

      {/* Mobile Top Bar (hidden on chat page so ChatPage has full immersive header) */}
      {!isChatRoute && <TopBar />}

      {/* Main Content */}
      <main className={`main-content ${isChatRoute ? 'main-content-chat' : ''}`}>
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation (hidden on chat page so chat input docks at bottom) */}
      {!isChatRoute && <BottomNav />}
    </div>
  );
}
