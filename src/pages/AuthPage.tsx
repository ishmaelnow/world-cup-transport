import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, signInWithGoogle, signUp } from '../lib/auth';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Car, X } from 'lucide-react';
import type { UserRole } from '../lib/database.types';
import { PrivacyPolicy } from './PrivacyPolicy';
import { Home } from '../components/Home';
import { AuthMapBackground } from '../components/AuthMapBackground';

export function AuthPage({ startupError }: { startupError?: string | null }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('rider');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        navigate('/');
      } else {
        await signUp(email, password, role, fullName || undefined);
        setNotice('Check your email to verify your account, then return here to log in.');
        setIsLogin(true);
        setPassword('');
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setNotice('');
    setLoading(true);

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setLoading(false);
    }
  };

  if (showPrivacyPolicy) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-4">
            <Button
              variant="secondary"
              onClick={() => setShowPrivacyPolicy(false)}
              className="flex items-center gap-2"
            >
              <X size={16} />
              Back to Login
            </Button>
          </div>
          <PrivacyPolicy />
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <AuthMapBackground />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4 shadow-lg shadow-blue-600/20">
            <Car className="text-white" size={32} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">World Cup Transport</h1>
          <p className="text-gray-600 mt-2">Your trusted rideshare platform</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Login/Signup Form */}
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="bg-white/94 backdrop-blur-md rounded-xl shadow-xl shadow-slate-900/12 border border-white/80 p-8">
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
                {startupError && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
                    {startupError}
                  </div>
                )}

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

                {notice && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                    {notice}
                  </div>
                )}

                <Button type="submit" fullWidth disabled={loading}>
                  {loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'}
                </Button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white/94 px-3 text-gray-500">or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="mt-4"
                >
                  Continue with Google
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowPrivacyPolicy(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline w-full text-center"
                >
                  View Privacy Policy
                </button>
              </div>
            </div>
          </div>

          {/* Home Content Section */}
          <div>
            <Home />
          </div>
        </div>
      </div>
    </div>
  );
}
