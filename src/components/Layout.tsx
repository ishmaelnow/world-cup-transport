import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../lib/auth';
import { LogOut, User, Car, Navigation } from 'lucide-react';
import { Button } from './Button';
import { Notifications } from './Notifications';
import { BottomNavigation } from './BottomNavigation';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
  title: string;
  showHeader?: boolean;
}

export function Layout({ children, title, showHeader = true }: LayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isDriverMode = location.pathname.startsWith('/driver');
  const canSwitchMode = user?.role === 'driver';

  const hasBottomNav = user && !location.pathname.includes('/ride/') && !location.pathname.includes('/onboarding');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {showHeader && (
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <button onClick={() => navigate(user?.role === 'rider' ? '/rider' : user?.role === 'driver' ? '/driver' : '/admin')} className="flex items-center space-x-2">
                  <img src="/icon-192.png" alt="World Cup Transport" className="w-8 h-8 rounded" />
                  <h1 className="text-2xl font-bold text-blue-600">World Cup Transport</h1>
                </button>
                {user && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {user.role.toUpperCase()}
                  </span>
                )}
              </div>
              {user && (
                <div className="flex items-center space-x-3">
                  {canSwitchMode && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(isDriverMode ? '/rider' : '/driver')}
                      className="hidden sm:flex items-center gap-2"
                    >
                      {isDriverMode ? (
                        <>
                          <Navigation size={16} />
                          <span>Rider</span>
                        </>
                      ) : (
                        <>
                          <Car size={16} />
                          <span>Driver</span>
                        </>
                      )}
                    </Button>
                  )}
                  <Notifications />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSignOut}
                    title="Sign Out"
                    className="flex items-center gap-2"
                  >
                    <LogOut size={18} />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}
      <main className={`flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 ${hasBottomNav ? 'pb-24' : ''}`}>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">{title}</h2>
        {children}
      </main>
      {hasBottomNav && <BottomNavigation />}
    </div>
  );
}
