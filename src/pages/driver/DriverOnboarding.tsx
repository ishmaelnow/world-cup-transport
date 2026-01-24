import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Card } from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database, VehicleType } from '../../lib/database.types';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

type ApplicationStatus = Database['public']['Tables']['driver_applications']['Row'];

export function DriverOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [existingApplication, setExistingApplication] = useState<ApplicationStatus | null>(null);
  const [formData, setFormData] = useState({
    driver_name: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_color: '',
    license_plate: '',
    drivers_license: '',
    insurance_policy: '',
    vehicle_type: '' as VehicleType | '',
  });

  useEffect(() => {
    checkExistingApplication();
    
    // Subscribe to application status changes
    if (user) {
      const channel = supabase
        .channel('driver-application-status')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'driver_applications',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            const updatedApp = payload.new as ApplicationStatus;
            if (updatedApp.status === 'approved') {
              // Check if profile was created
              await checkExistingApplication();
            } else {
              setExistingApplication(updatedApp);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const checkExistingApplication = async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileData) {
      navigate('/driver');
      return;
    }

    const { data: applicationData } = await supabase
      .from('driver_applications')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (applicationData) {
      setExistingApplication(applicationData);
      
      // If approved but no profile yet, wait a moment and check again
      if (applicationData.status === 'approved') {
        setTimeout(async () => {
          const { data: profileCheck } = await supabase
            .from('driver_profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (profileCheck) {
            navigate('/driver');
          }
        }, 2000);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({ full_name: formData.driver_name })
        .eq('id', user.id);

      const { error } = await supabase.from('driver_applications').insert({
        user_id: user.id,
        vehicle_make: formData.vehicle_make,
        vehicle_model: formData.vehicle_model,
        vehicle_year: parseInt(formData.vehicle_year),
        vehicle_color: formData.vehicle_color,
        license_plate: formData.license_plate,
        drivers_license: formData.drivers_license,
        insurance_policy: formData.insurance_policy,
        vehicle_type: formData.vehicle_type || null,
      });

      if (error) throw error;

      alert('Application submitted successfully! You will be notified once an admin reviews your application.');
      await checkExistingApplication();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      alert(error.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  if (existingApplication) {
    const statusConfig = {
      pending: {
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        title: 'Application Pending Review',
        message: 'Your driver application is being reviewed by our team. You will be notified once a decision is made.',
      },
      approved: {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        title: 'Application Approved',
        message: 'Congratulations! Your application has been approved. Redirecting to driver dashboard...',
      },
      rejected: {
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        title: 'Application Not Approved',
        message: existingApplication.rejection_reason || 'Your application was not approved. Please contact support for more information.',
      },
    };

    const config = statusConfig[existingApplication.status];
    const Icon = config.icon;

    return (
      <Layout title="Driver Application Status">
        <div className="max-w-2xl mx-auto">
          <Card>
            <div className={`${config.bgColor} p-6 rounded-lg`}>
              <div className="flex items-start gap-4">
                <Icon className={`${config.color} w-8 h-8 flex-shrink-0`} />
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {config.title}
                  </h2>
                  <p className="text-gray-700 mb-4">{config.message}</p>

                  <div className="space-y-2 text-sm text-gray-600">
                    <p>Submitted: {new Date(existingApplication.created_at).toLocaleDateString()}</p>
                    {existingApplication.reviewed_at && (
                      <p>Reviewed: {new Date(existingApplication.reviewed_at).toLocaleDateString()}</p>
                    )}
                  </div>

                  {existingApplication.status === 'pending' && (
                    <div className="mt-4">
                      <Button variant="secondary" onClick={() => navigate('/rider')}>
                        Return to Rider Dashboard
                      </Button>
                    </div>
                  )}

                  {existingApplication.status === 'approved' && (
                    <div className="mt-4 space-y-2">
                      <Button 
                        onClick={async () => {
                          // Check if profile exists, if not wait a moment
                          const { data: profileCheck } = await supabase
                            .from('driver_profiles')
                            .select('*')
                            .eq('user_id', user?.id)
                            .maybeSingle();
                          
                          if (profileCheck) {
                            navigate('/driver');
                          } else {
                            alert('Driver profile is being created. Please wait a moment and try again, or refresh the page.');
                            window.location.reload();
                          }
                        }}
                        fullWidth
                      >
                        Go to Driver Dashboard
                      </Button>
                      <Button 
                        variant="secondary" 
                        onClick={() => window.location.reload()}
                        fullWidth
                      >
                        Refresh Page
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Apply to Become a Driver">
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Driver Application</h2>
            <p className="text-gray-600">
              Complete the form below to apply to become a driver. Your application will be reviewed by our team.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              value={formData.driver_name}
              onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
              placeholder="John Doe"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Vehicle Make"
                value={formData.vehicle_make}
                onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
                placeholder="Toyota"
                required
              />
              <Input
                label="Vehicle Model"
                value={formData.vehicle_model}
                onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                placeholder="Camry"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Vehicle Year"
                type="number"
                value={formData.vehicle_year}
                onChange={(e) => setFormData({ ...formData, vehicle_year: e.target.value })}
                placeholder="2020"
                min="1900"
                max={new Date().getFullYear() + 1}
                required
              />
              <Input
                label="Vehicle Color"
                value={formData.vehicle_color}
                onChange={(e) => setFormData({ ...formData, vehicle_color: e.target.value })}
                placeholder="Silver"
                required
              />
            </div>

            <Select
              label="Vehicle Type"
              value={formData.vehicle_type}
              onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value as VehicleType | '' })}
              options={[
                { value: '', label: 'Select Vehicle Type' },
                { value: 'sedan', label: 'Sedan' },
                { value: 'standard', label: 'Standard' },
                { value: 'suv', label: 'SUV' },
              ]}
              required
            />

            <Input
              label="License Plate"
              value={formData.license_plate}
              onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
              placeholder="ABC1234"
              required
            />

            <Input
              label="Driver's License Number"
              value={formData.drivers_license}
              onChange={(e) => setFormData({ ...formData, drivers_license: e.target.value })}
              placeholder="DL123456789"
              required
            />

            <Input
              label="Insurance Policy Number"
              value={formData.insurance_policy}
              onChange={(e) => setFormData({ ...formData, insurance_policy: e.target.value })}
              placeholder="INS123456789"
              required
            />

            <div className="pt-4">
              <Button type="submit" fullWidth size="lg" disabled={loading}>
                {loading ? 'Submitting Application...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
