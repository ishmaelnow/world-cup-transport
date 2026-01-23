import { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/fare';
import type { Database } from '../../lib/database.types';
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';

type Earning = Database['public']['Tables']['earnings']['Row'];
type Ride = Database['public']['Tables']['rides']['Row'];

interface EarningWithRide extends Earning {
  ride?: Ride;
}

export function DriverEarnings() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<EarningWithRide[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [paidEarnings, setPaidEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadEarnings();
    }
  }, [user]);

  const loadEarnings = async () => {
    if (!user) return;

    const { data: driverProfile } = await supabase
      .from('driver_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!driverProfile) return;

    const { data: earningsData } = await supabase
      .from('earnings')
      .select('*, ride:rides(*)')
      .eq('driver_id', driverProfile.id)
      .order('created_at', { ascending: false });

    if (earningsData) {
      setEarnings(earningsData as EarningWithRide[]);

      const total = earningsData.reduce((sum, e) => sum + Number(e.amount), 0);
      const pending = earningsData
        .filter((e) => e.status === 'pending')
        .reduce((sum, e) => sum + Number(e.amount), 0);
      const paid = earningsData
        .filter((e) => e.status === 'paid')
        .reduce((sum, e) => sum + Number(e.amount), 0);

      setTotalEarnings(total);
      setPendingEarnings(pending);
      setPaidEarnings(paid);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Layout title="My Earnings">
        <div className="text-center py-12">Loading earnings...</div>
      </Layout>
    );
  }

  return (
    <Layout title="My Earnings">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalEarnings)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="text-yellow-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(pendingEarnings)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Paid Out</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(paidEarnings)}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <h3 className="text-lg font-semibold mb-4">Earnings History</h3>
          {earnings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No earnings yet. Complete rides to start earning!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Route
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fare
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Platform Fee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Your Earnings
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {earnings.map((earning) => (
                    <tr key={earning.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(earning.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {earning.ride ? (
                          <div className="text-gray-900">
                            <div className="font-medium">
                              {earning.ride.pickup_address.split(',').slice(0, 2).join(',')}
                            </div>
                            <div className="text-xs text-gray-500">
                              → {earning.ride.dropoff_address.split(',').slice(0, 2).join(',')}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {earning.ride
                          ? formatCurrency(earning.ride.fare_final || earning.ride.fare_estimate)
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        -{formatCurrency(Number(earning.platform_fee))}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-green-600">
                        {formatCurrency(Number(earning.amount))}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            earning.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : earning.status === 'processing'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {earning.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <TrendingUp className="text-blue-600 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-blue-900">Payment Information</h4>
              <p className="text-sm text-blue-700 mt-1">
                Earnings are processed weekly. Pending earnings will be paid out every Monday.
                Platform fee is 20% of the total fare.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
