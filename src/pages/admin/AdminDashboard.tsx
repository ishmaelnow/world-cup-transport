import { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/fare';
import type { Database } from '../../lib/database.types';
import { Users, Car, DollarSign, TrendingUp, MapPin, Clock } from 'lucide-react';

type Ride = Database['public']['Tables']['rides']['Row'];
type DriverProfile = Database['public']['Tables']['driver_profiles']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type DriverApplication = Database['public']['Tables']['driver_applications']['Row'];

interface Metrics {
  totalRides: number;
  completedRides: number;
  activeRides: number;
  totalDrivers: number;
  onlineDrivers: number;
  totalRevenue: number;
  completionRate: number;
}

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalRides: 0,
    completedRides: 0,
    activeRides: 0,
    totalDrivers: 0,
    onlineDrivers: 0,
    totalRevenue: 0,
    completionRate: 0,
  });
  const [rides, setRides] = useState<Ride[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [earnings, setEarnings] = useState<any[]>([]);
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'rides' | 'drivers' | 'applications' | 'verification' | 'payments'>('overview');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadMetrics(), loadRides(), loadDrivers(), loadProfiles(), loadEarnings(), loadApplications()]);
    setLoading(false);
  };

  const loadApplications = async () => {
    const { data, error } = await supabase
      .from('driver_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading applications:', error);
      alert(`Error loading applications: ${error.message}`);
      setApplications([]);
      return;
    }

    console.log('Loaded applications:', data);
    setApplications(data || []);
  };

  const loadMetrics = async () => {
    const { data: allRides } = await supabase
      .from('rides')
      .select('status, fare_final, fare_estimate');

    const { data: allDrivers } = await supabase
      .from('driver_profiles')
      .select('is_available');

    if (allRides && allDrivers) {
      const completed = allRides.filter((r) => r.status === 'completed');
      const active = allRides.filter((r) =>
        ['accepted', 'arriving', 'in_progress'].includes(r.status)
      );
      const totalRevenue = completed.reduce(
        (sum, r) => sum + (r.fare_final || r.fare_estimate || 0),
        0
      );

      setMetrics({
        totalRides: allRides.length,
        completedRides: completed.length,
        activeRides: active.length,
        totalDrivers: allDrivers.length,
        onlineDrivers: allDrivers.filter((d) => d.is_available).length,
        totalRevenue,
        completionRate: allRides.length > 0 ? (completed.length / allRides.length) * 100 : 0,
      });
    }
  };

  const loadRides = async () => {
    const { data } = await supabase
      .from('rides')
      .select('*')
      .order('requested_at', { ascending: false })
      .limit(50);

    setRides(data || []);
  };

  const loadDrivers = async () => {
    const { data } = await supabase
      .from('driver_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    setDrivers(data || []);
  };

  const loadProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*');

    if (data) {
      const profileMap = data.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, Profile>);
      setProfiles(profileMap);
    }
  };

  const loadEarnings = async () => {
    const { data } = await supabase
      .from('earnings')
      .select('*, ride:rides(pickup_address, dropoff_address)')
      .order('created_at', { ascending: false });

    setEarnings(data || []);
  };

  const handleDeactivateUser = async (userId: string, isActive: boolean) => {
    const action = isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this driver?`)) return;

    const { error } = await supabase
      .from('driver_profiles')
      .update({ is_active: !isActive })
      .eq('user_id', userId);

    if (error) {
      alert(`Failed to ${action} driver`);
      return;
    }

    loadDrivers();
  };

  const handleApplicationReview = async (
    applicationId: string,
    status: 'approved' | 'rejected',
    reason?: string
  ) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Auth error:', userError);
        alert('Authentication error. Please log out and log back in.');
        return;
      }

      const updateData: any = {
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      };

      if (status === 'rejected' && reason) {
        updateData.rejection_reason = reason;
      }

      console.log('Updating application:', applicationId, 'with data:', updateData);

      const { data, error } = await supabase
        .from('driver_applications')
        .update(updateData)
        .eq('id', applicationId)
        .select();

      if (error) {
        console.error('Update error:', error);
        alert(`Failed to update application: ${error.message}\n\nCheck browser console for details.`);
        return;
      }

      console.log('Update successful:', data);

      // Reload data
      await loadApplications();
      await loadDrivers();
      
      alert(`Application ${status} successfully!`);
    } catch (err: any) {
      console.error('Unexpected error:', err);
      alert(`Unexpected error: ${err.message}`);
    }
  };

  const handleVerification = async (
    driverId: string,
    status: 'approved' | 'rejected',
    notes: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('driver_profiles')
      .update({
        verification_status: status,
        verification_notes: notes || null,
        verified_at: status === 'approved' ? new Date().toISOString() : null,
        verified_by: status === 'approved' ? user.id : null,
      })
      .eq('id', driverId);

    if (error) {
      alert('Failed to update verification status');
      return;
    }

    await supabase.from('notifications').insert({
      user_id: drivers.find((d) => d.id === driverId)?.user_id,
      title: status === 'approved' ? 'Driver Application Approved' : 'Driver Application Rejected',
      message:
        status === 'approved'
          ? 'Your driver application has been approved. You can now start accepting rides!'
          : `Your driver application has been rejected. ${notes}`,
      type: 'verification',
    });

    loadDrivers();
  };

  const handlePayoutUpdate = async (earningId: string, newStatus: 'paid' | 'processing') => {
    const { error } = await supabase
      .from('earnings')
      .update({
        status: newStatus,
        paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
      })
      .eq('id', earningId);

    if (error) {
      alert('Failed to update payout status');
      return;
    }

    if (newStatus === 'paid') {
      const earning = earnings.find((e) => e.id === earningId);
      if (earning) {
        await supabase.from('notifications').insert({
          user_id: earning.driver_id,
          title: 'Payment Processed',
          message: `Your payment of ${formatCurrency(earning.amount)} has been processed.`,
          type: 'payment',
        });
      }
    }

    loadEarnings();
  };

  const filteredRides =
    statusFilter === 'all' ? rides : rides.filter((r) => r.status === statusFilter);

  if (loading) {
    return (
      <Layout title="Admin Dashboard">
        <div className="text-center py-12">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Admin Dashboard">
      <div className="space-y-6">
        <div className="flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('rides')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'rides'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Rides
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'drivers'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Drivers
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === 'applications'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Applications
            {applications.filter((a) => a.status === 'pending').length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {applications.filter((a) => a.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'verification'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Verification
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'payments'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Payments & Earnings
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Car className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Rides</p>
                    <p className="text-2xl font-bold">{metrics.totalRides}</p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="text-green-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold">{metrics.completedRides}</p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Users className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Online Drivers</p>
                    <p className="text-2xl font-bold">
                      {metrics.onlineDrivers}/{metrics.totalDrivers}
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <DollarSign className="text-yellow-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-semibold mb-4">Active Rides</h3>
                {metrics.activeRides === 0 ? (
                  <p className="text-gray-500 text-center py-8">No active rides</p>
                ) : (
                  <div className="space-y-2">
                    {rides
                      .filter((r) => ['accepted', 'arriving', 'in_progress'].includes(r.status))
                      .slice(0, 5)
                      .map((ride) => (
                        <div key={ride.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {ride.pickup_address.split(',')[0]} →{' '}
                                {ride.dropoff_address.split(',')[0]}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Status: {ride.status.replace('_', ' ').toUpperCase()}
                              </div>
                            </div>
                            <div className="text-sm font-semibold">
                              {formatCurrency(ride.fare_estimate)}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </Card>

              <Card>
                <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Completion Rate</span>
                      <span className="font-semibold">{metrics.completionRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${metrics.completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Driver Availability</span>
                      <span className="font-semibold">
                        {metrics.totalDrivers > 0
                          ? ((metrics.onlineDrivers / metrics.totalDrivers) * 100).toFixed(1)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${
                            metrics.totalDrivers > 0
                              ? (metrics.onlineDrivers / metrics.totalDrivers) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">Average Fare</div>
                    <div className="text-2xl font-bold">
                      {metrics.completedRides > 0
                        ? formatCurrency(metrics.totalRevenue / metrics.completedRides)
                        : '$0.00'}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {activeTab === 'rides' && (
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">All Rides</h3>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Status</option>
                <option value="matching">Matching</option>
                <option value="accepted">Accepted</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Route
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fare
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRides.map((ride) => (
                    <tr key={ride.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {ride.pickup_address.split(',').slice(0, 2).join(',')}
                          </div>
                          <div className="text-gray-500 text-xs">
                            → {ride.dropoff_address.split(',').slice(0, 2).join(',')}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            ride.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : ride.status === 'canceled'
                              ? 'bg-red-100 text-red-800'
                              : ride.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {ride.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {formatCurrency(ride.fare_final || ride.fare_estimate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(ride.requested_at).toLocaleDateString()}{' '}
                        {new Date(ride.requested_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'applications' && (
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Driver Applications</h3>
              <div className="text-sm text-gray-500">
                Total: {applications.length} | Pending: {applications.filter((a) => a.status === 'pending').length}
              </div>
            </div>
            
            {applications.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 font-medium">⚠️ No applications found</p>
                <p className="text-yellow-700 text-sm mt-2">
                  This could mean:
                </p>
                <ul className="text-yellow-700 text-sm mt-1 ml-4 list-disc">
                  <li>No driver applications have been submitted yet</li>
                  <li>RLS policies may be blocking access (check browser console)</li>
                  <li>Your admin role may not be set correctly</li>
                </ul>
                <p className="text-yellow-700 text-sm mt-2">
                  <strong>To test:</strong> Logout, sign up as a Driver, submit an application, then login back as admin.
                </p>
              </div>
            )}

            <div className="mb-6">
              <h4 className="text-md font-semibold mb-3 text-yellow-700">
                Pending Applications ({applications.filter((a) => a.status === 'pending').length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Applicant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Vehicle
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        License Info
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Applied Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {applications
                      .filter((a) => a.status === 'pending')
                      .map((app) => {
                        const profile = profiles[app.user_id];
                        return (
                          <tr key={app.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  {profile?.full_name || 'Unknown'}
                                </div>
                                <div className="text-gray-500 text-xs">{profile?.phone || 'No phone'}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm">
                                <div className="text-gray-900">
                                  {app.vehicle_year} {app.vehicle_make} {app.vehicle_model}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {app.vehicle_color} • {app.license_plate}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm">
                                <div className="text-gray-900">DL: {app.drivers_license}</div>
                                <div className="text-gray-500 text-xs">Ins: {app.insurance_policy}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {new Date(app.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex space-x-2">
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`Approve driver application for ${profile?.full_name}?`)) {
                                      handleApplicationReview(app.id, 'approved');
                                    }
                                  }}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => {
                                    const reason = prompt(
                                      'Enter rejection reason (required):',
                                      'Please provide additional documentation.'
                                    );
                                    if (reason) {
                                      handleApplicationReview(app.id, 'rejected', reason);
                                    }
                                  }}
                                >
                                  Reject
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {applications.filter((a) => a.status === 'pending').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No pending applications
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8">
              <h4 className="text-md font-semibold mb-3">Application History</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Applicant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Vehicle
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Reviewed Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {applications
                      .filter((a) => a.status !== 'pending')
                      .map((app) => {
                        const profile = profiles[app.user_id];
                        return (
                          <tr key={app.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">
                                {profile?.full_name || 'Unknown'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900">
                                {app.vehicle_make} {app.vehicle_model}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  app.status === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {app.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {app.reviewed_at
                                ? new Date(app.reviewed_at).toLocaleDateString()
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {app.rejection_reason || '-'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {applications.filter((a) => a.status !== 'pending').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No reviewed applications yet
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'drivers' && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">All Drivers</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Driver
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Trips
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Rating
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {drivers.map((driver) => {
                    const profile = profiles[driver.user_id];
                    return (
                      <tr key={driver.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {profile?.full_name || profile?.id || 'Unknown'}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {profile?.phone || 'No phone'}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {driver.vehicle_make} {driver.vehicle_model}
                          </div>
                          <div className="text-xs text-gray-500">{driver.vehicle_plate}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                driver.is_available ? 'bg-green-500' : 'bg-gray-400'
                              }`}
                            ></span>
                            <span className="text-sm">
                              {driver.is_available ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          {!driver.is_active && (
                            <span className="text-xs text-red-600">Deactivated</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">{driver.total_trips}</td>
                        <td className="px-4 py-3 text-sm">⭐ {driver.rating_avg.toFixed(1)}</td>
                        <td className="px-4 py-3">
                          <Button
                            variant={driver.is_active ? 'danger' : 'success'}
                            size="sm"
                            onClick={() => handleDeactivateUser(driver.user_id, driver.is_active)}
                          >
                            {driver.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'verification' && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Driver Verification</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Driver
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      License
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {drivers
                    .filter((d) => d.verification_status === 'pending')
                    .map((driver) => {
                      const profile = profiles[driver.user_id];
                      return (
                        <tr key={driver.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                {profile?.full_name || 'Unknown'}
                              </div>
                              <div className="text-gray-500 text-xs">{profile?.phone}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              <div className="text-gray-900">
                                {driver.vehicle_year} {driver.vehicle_make} {driver.vehicle_model}
                              </div>
                              <div className="text-gray-500 text-xs">{driver.vehicle_plate}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">{driver.license_number}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              PENDING
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex space-x-2">
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => {
                                  const notes = prompt(
                                    'Add approval notes (optional):'
                                  );
                                  handleVerification(driver.id, 'approved', notes || '');
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  const notes = prompt(
                                    'Add rejection reason (required):',
                                    'Please provide additional documentation.'
                                  );
                                  if (notes) {
                                    handleVerification(driver.id, 'rejected', notes);
                                  }
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {drivers.filter((d) => d.verification_status === 'pending').length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No pending driver verifications
                </div>
              )}
            </div>

            <div className="mt-8">
              <h4 className="text-md font-semibold mb-3">Verified Drivers</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Driver
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Verified Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {drivers
                      .filter((d) => d.verification_status !== 'pending')
                      .map((driver) => {
                        const profile = profiles[driver.user_id];
                        return (
                          <tr key={driver.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">
                                {profile?.full_name || 'Unknown'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  driver.verification_status === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {driver.verification_status?.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {driver.verified_at
                                ? new Date(driver.verified_at).toLocaleDateString()
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {driver.verification_notes || '-'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <DollarSign className="text-green-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Earnings</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(earnings.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0))}
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Clock className="text-yellow-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pending Payouts</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(
                        earnings
                          .filter((e) => e.status === 'pending')
                          .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
                      )}
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <DollarSign className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Platform Fees</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(
                        earnings.reduce((sum, e) => sum + parseFloat(e.platform_fee || 0), 0)
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <Card>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Earnings Management</h3>
                <div className="flex space-x-2">
                  <span className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-full">
                    {earnings.filter((e) => e.status === 'pending').length} Pending
                  </span>
                  <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                    {earnings.filter((e) => e.status === 'processing').length} Processing
                  </span>
                  <span className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">
                    {earnings.filter((e) => e.status === 'paid').length} Paid
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Driver
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Ride
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Platform Fee
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {earnings.map((earning) => {
                      const driver = drivers.find((d) => d.id === earning.driver_id);
                      const driverProfile = driver ? profiles[driver.user_id] : null;
                      return (
                        <tr key={earning.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">
                              {driverProfile?.full_name || driver?.driver_name || 'Unknown'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-600">
                              {earning.ride ? (
                                <>
                                  {earning.ride.pickup_address.split(',')[0]} →{' '}
                                  {earning.ride.dropoff_address.split(',')[0]}
                                </>
                              ) : (
                                'N/A'
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-gray-900">
                              {formatCurrency(earning.amount)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-600">
                              {formatCurrency(earning.platform_fee)}
                            </div>
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
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(earning.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex space-x-2">
                              {earning.status === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={() => handlePayoutUpdate(earning.id, 'processing')}
                                >
                                  Process
                                </Button>
                              )}
                              {earning.status === 'processing' && (
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handlePayoutUpdate(earning.id, 'paid')}
                                >
                                  Mark Paid
                                </Button>
                              )}
                              {earning.status === 'paid' && (
                                <span className="text-xs text-green-600">
                                  Paid on {new Date(earning.paid_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {earnings.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No earnings records found
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
