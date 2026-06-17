import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { RiderDashboard } from './pages/rider/RiderDashboard';
import { ActiveRide } from './pages/rider/ActiveRide';
import { PaymentMethods } from './pages/rider/PaymentMethods';
import { RideHistory } from './pages/rider/RideHistory';
import { DriverOnboarding } from './pages/driver/DriverOnboarding';
import { DriverDashboard } from './pages/driver/DriverDashboard';
import { ActiveDriverRide } from './pages/driver/ActiveDriverRide';
import { DriverEarnings } from './pages/driver/DriverEarnings';
import { AdminDashboard } from './pages/admin/AdminDashboard';

function getHomePath(role: string | undefined) {
  if (role === 'admin') return '/admin';
  if (role === 'driver') return '/driver';
  return '/rider';
}

function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: string;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    console.log('[route] unauthenticated; redirecting to /', { requiredRole });
    return <Navigate to="/" replace />;
  }

  if (requiredRole) {
    console.log('[route] evaluating protected route', {
      requiredRole,
      userId: user.id,
      email: user.email,
      profileRole: user.role,
      jwtRole: user.jwtRole,
    });

    if (requiredRole === 'rider' && (user.role === 'rider' || user.role === 'driver')) {
      console.log('[route] allowing rider route', { email: user.email, profileRole: user.role });
      return <>{children}</>;
    }

    if (requiredRole === 'driver' && user.role === 'driver') {
      console.log('[route] allowing driver route', { email: user.email, profileRole: user.role });
      return <>{children}</>;
    }

    if (requiredRole === 'admin' && user.role === 'admin') {
      console.log('[route] allowing admin route', { email: user.email, profileRole: user.role });
      return <>{children}</>;
    }

    const redirectTo = getHomePath(user.role);
    console.warn('[route] role mismatch; redirecting', {
      requiredRole,
      redirectTo,
      email: user.email,
      profileRole: user.role,
      jwtRole: user.jwtRole,
    });
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (() => {
            const redirectTo = getHomePath(user.role);
            console.log('[route] root redirect', {
              redirectTo,
              userId: user.id,
              email: user.email,
              profileRole: user.role,
              jwtRole: user.jwtRole,
            });
            return <Navigate to={redirectTo} replace />;
          })() : (
            <AuthPage />
          )
        }
      />

      <Route
        path="/rider"
        element={
          <ProtectedRoute requiredRole="rider">
            <RiderDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rider/ride/:rideId"
        element={
          <ProtectedRoute requiredRole="rider">
            <ActiveRide />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rider/payment-methods"
        element={
          <ProtectedRoute requiredRole="rider">
            <PaymentMethods />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rider/history"
        element={
          <ProtectedRoute requiredRole="rider">
            <RideHistory />
          </ProtectedRoute>
        }
      />

      <Route
        path="/driver/onboarding"
        element={
          <ProtectedRoute>
            <DriverOnboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver"
        element={
          <ProtectedRoute requiredRole="driver">
            <DriverDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver/ride/:rideId"
        element={
          <ProtectedRoute requiredRole="driver">
            <ActiveDriverRide />
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver/earnings"
        element={
          <ProtectedRoute requiredRole="driver">
            <DriverEarnings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
