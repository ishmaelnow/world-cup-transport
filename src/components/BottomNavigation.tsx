import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Navigation, History, CreditCard, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const isRider = user.role === 'rider';
  const isDriver = user.role === 'driver';
  const isAdmin = user.role === 'admin';

  // Don't show bottom nav on auth pages or active ride pages
  if (
    location.pathname === '/' ||
    location.pathname.includes('/ride/') ||
    location.pathname.includes('/driver/ride/') ||
    location.pathname.includes('/onboarding')
  ) {
    return null;
  }

  const navItems = isRider
    ? [
        { icon: Home, label: 'Home', path: '/rider' },
        { icon: Navigation, label: 'Ride', path: '/rider' },
        { icon: History, label: 'History', path: '/rider/history' },
        { icon: CreditCard, label: 'Payment', path: '/rider/payment-methods' },
      ]
    : isDriver
    ? [
        { icon: Home, label: 'Home', path: '/driver' },
        { icon: Navigation, label: 'Rides', path: '/driver' },
        { icon: History, label: 'Earnings', path: '/driver/earnings' },
      ]
    : [];

  if (navItems.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === '/rider' && location.pathname.startsWith('/rider') && !location.pathname.includes('/history') && !location.pathname.includes('/payment')) ||
              (item.path === '/driver' && location.pathname.startsWith('/driver') && !location.pathname.includes('/earnings'));

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={22} className={isActive ? 'text-blue-600' : ''} />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}





