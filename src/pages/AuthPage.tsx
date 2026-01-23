import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, signUp } from '../lib/auth';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Car } from 'lucide-react';
import type { UserRole } from '../lib/database.types';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('rider');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, role, fullName || undefined);
      }

      if (role === 'rider') {
        navigate('/rider');
      } else if (role === 'driver') {
        navigate('/driver/onboarding');
      } else {
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Car className="text-white" size={32} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">World Cup Transport</h1>
          <p className="text-gray-600 mt-2">Your trusted rideshare platform</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex gap-2 mb-6">
            <Button
              variant={isLogin ? 'primary' : 'secondary'}
              onClick={() => setIsLogin(true)}
              fullWidth
            >
              Login
            </Button>
            <Button
              variant={!isLogin ? 'primary' : 'secondary'}
              onClick={() => setIsLogin(false)}
              fullWidth
            >
              Sign Up
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <Input
                  label="Full Name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    I am a
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={role === 'rider' ? 'primary' : 'secondary'}
                      onClick={() => setRole('rider')}
                      fullWidth
                    >
                      Rider
                    </Button>
                    <Button
                      type="button"
                      variant={role === 'driver' ? 'primary' : 'secondary'}
                      onClick={() => setRole('driver')}
                      fullWidth
                    >
                      Driver
                    </Button>
                    <Button
                      type="button"
                      variant={role === 'admin' ? 'primary' : 'secondary'}
                      onClick={() => setRole('admin')}
                      fullWidth
                    >
                      Admin
                    </Button>
                  </div>
                </div>
              </>
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
