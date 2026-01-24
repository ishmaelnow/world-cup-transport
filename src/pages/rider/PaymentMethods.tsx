import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Layout } from '../../components/Layout';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getStripe } from '../../lib/stripe';
import type { Database } from '../../lib/database.types';
import { CreditCard, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

type PaymentMethod = Database['public']['Tables']['payment_methods']['Row'];

function CardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !user) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Check environment variables
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
          'Missing Supabase configuration. Please check your .env file has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. ' +
          'Restart your dev server after updating .env file.'
        );
      }

      let response: Response;
      try {
        response = await fetch(`${supabaseUrl}/functions/v1/add-payment-method`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id }),
        });
      } catch (fetchError: any) {
        // Network error - can't reach Supabase
        console.error('Connection error:', fetchError);
        throw new Error(
          `Connection failed: ${fetchError.message || 'Cannot reach Supabase'}. ` +
          'Check: 1) Internet connection, 2) Supabase URL is correct, 3) Edge Functions are deployed. ' +
          'See CONNECTION_ERRORS_FIX.md for help.'
        );
      }

      if (!response.ok) {
        // Handle specific HTTP status codes
        if (response.status === 404) {
          throw new Error(
            'Edge Function not found (404). Please deploy Edge Functions in Supabase Dashboard. ' +
            'See CONNECTION_ERRORS_FIX.md for deployment instructions.'
          );
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            'Authentication failed. Please log out and log back in, or check your Supabase API key.'
          );
        }
        if (response.status === 500) {
          const errorData = await response.json().catch(() => ({ error: 'Server error' }));
          throw new Error(
            `Server error: ${errorData.error || 'Edge Function failed'}. ` +
            'Check Edge Function logs in Supabase Dashboard.'
          );
        }
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(
          `Request failed (${response.status}): ${errorData.error || 'Unknown error'}`
        );
      }

      const { clientSecret } = await response.json();

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (setupIntent?.status === 'succeeded') {
        // Save payment method to database via Edge Function
        const paymentMethodId = setupIntent.payment_method;
        
        if (paymentMethodId) {
          // Call function again to save the payment method
          const saveResponse = await fetch(`${supabaseUrl}/functions/v1/add-payment-method`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': supabaseAnonKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              userId: user.id,
              paymentMethodId: paymentMethodId 
            }),
          });

          if (!saveResponse.ok) {
            const errorData = await saveResponse.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Failed to save payment method:', errorData);
            // Log but don't throw - setup intent succeeded, payment method might be saved via webhook
            if (saveResponse.status === 404) {
              console.warn('Edge Function not deployed. Payment method saved to Stripe but not to database.');
            }
          }
        }
        
        setLoading(false);
        onSuccess();
      }
    } catch (err: any) {
      console.error('Payment method error:', err);
      setError(err.message || 'Failed to add payment method');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Information
        </label>
        <div className="border border-gray-300 rounded-lg p-3 bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#1f2937',
                  '::placeholder': {
                    color: '#9ca3af',
                  },
                },
                invalid: {
                  color: '#ef4444',
                },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex space-x-3">
        <Button type="submit" disabled={!stripe || loading} fullWidth>
          {loading ? 'Adding Card...' : 'Add Card'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={loading} type="button">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function PaymentMethodForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripePromise = getStripe();

  if (!stripePromise) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
        Stripe is not configured. Please check your configuration.
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CardForm onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}

function PaymentMethodsList() {
  const { user } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentMethods();
  }, [user]);

  const loadPaymentMethods = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setMethods(data || []);
    setLoading(false);
  };

  const handleDelete = async (methodId: string) => {
    if (!confirm('Remove this payment method?')) return;

    setDeleting(methodId);
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', methodId);

      if (error) throw error;

      setMethods(methods.filter((m) => m.id !== methodId));
    } catch {
      alert('Failed to remove payment method');
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', methodId);

      if (error) throw error;

      loadPaymentMethods();
    } catch {
      alert('Failed to set default payment method');
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading payment methods...</div>;
  }

  if (methods.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <CreditCard size={48} className="mx-auto mb-2 opacity-50" />
        <p>No payment methods added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {methods.map((method) => (
        <div
          key={method.id}
          className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center">
              <CreditCard size={20} className="text-gray-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {method.card_brand?.toUpperCase()} •••• {method.card_last4}
              </div>
              <div className="text-sm text-gray-500">
                Expires {method.card_exp_month}/{method.card_exp_year}
              </div>
            </div>
            {method.is_default && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full inline-flex items-center">
                <CheckCircle size={12} className="mr-1" />
                Default
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {!method.is_default && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSetDefault(method.id)}
              >
                Set Default
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(method.id)}
              disabled={deleting === method.id}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PaymentMethods() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasPaymentMethods, setHasPaymentMethods] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  
  // Get rideId from navigation state (if coming from booking)
  const rideId = (location.state as any)?.rideId;
  const returnTo = (location.state as any)?.returnTo;

  // Load payment methods
  useEffect(() => {
    const loadPaymentMethods = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setPaymentMethods(data || []);
      setHasPaymentMethods((data?.length || 0) > 0);
    };
    loadPaymentMethods();
  }, [user, refreshKey]);

  const handlePaymentSuccess = async () => {
    setStatusMessage({ type: 'success', text: 'Payment method added successfully!' });
    setShowAddForm(false);
    setRefreshKey((k) => k + 1);
    
    // Reload payment methods to get the new one
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    const updatedMethods = data || [];
    setPaymentMethods(updatedMethods);
    setHasPaymentMethods(updatedMethods.length > 0);

    // If we have a rideId, complete the payment intent
    if (rideId && updatedMethods.length > 0) {
      const defaultMethod = updatedMethods.find(m => m.is_default) || updatedMethods[0];
      
      if (defaultMethod) {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

          const paymentResponse = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              rideId: rideId,
              paymentMethodId: defaultMethod.stripe_payment_method_id
            }),
          });

          if (paymentResponse.ok) {
            // Redirect to ride page
            setTimeout(() => {
              navigate(returnTo || `/rider/ride/${rideId}`);
            }, 1500);
          } else {
            setStatusMessage({ 
              type: 'error', 
              text: 'Payment method added, but failed to authorize payment. Please try again.' 
            });
          }
        } catch (error) {
          console.error('Error creating payment intent:', error);
          setStatusMessage({ 
            type: 'error', 
            text: 'Payment method added, but failed to authorize payment. Please try again.' 
          });
        }
      }
    }
  };

  const handleContinueBooking = () => {
    if (rideId && returnTo) {
      // If we have a rideId, go to ride page
      navigate(returnTo);
    } else {
      // Otherwise go back to previous page
      navigate(-1);
    }
  };

  return (
    <Layout title="Payment Methods">
      <div className="max-w-2xl mx-auto space-y-6">
        {rideId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="text-blue-600 mt-0.5" size={20} />
              <div>
                <p className="text-blue-800 font-medium">Complete Your Booking</p>
                <p className="text-blue-700 text-sm mt-1">
                  Add a payment method to complete your ride request.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {statusMessage && (
          <div
            className={`${
              statusMessage.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            } border px-4 py-3 rounded-lg`}
          >
            <div className="flex items-center justify-between">
              <span>{statusMessage.text}</span>
              {hasPaymentMethods && statusMessage.type === 'success' && (
                <Button
                  onClick={handleContinueBooking}
                  size="sm"
                  className="ml-4"
                >
                  Continue Booking →
                </Button>
              )}
            </div>
          </div>
        )}

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Saved Cards</h3>
            {!showAddForm && (
              <Button onClick={() => setShowAddForm(true)}>
                Add Payment Method
              </Button>
            )}
          </div>

          {showAddForm ? (
            <PaymentMethodForm
              onSuccess={handlePaymentSuccess}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <PaymentMethodsList key={refreshKey} />
          )}
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <CreditCard className="text-blue-600 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-blue-900">Secure Payments</h4>
              <p className="text-sm text-blue-700 mt-1">
                Your payment information is encrypted and securely stored by Stripe.
                World Cup Transport never sees your full card details.
              </p>
            </div>
          </div>
        </Card>

        {/* Continue Booking Button - Always visible when payment methods exist */}
        {!showAddForm && hasPaymentMethods && (
          <Button
            onClick={handleContinueBooking}
            fullWidth
            size="lg"
            className="mt-4"
          >
            Continue Booking →
          </Button>
        )}
      </div>
    </Layout>
  );
}
