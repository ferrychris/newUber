import React, { useState } from 'react';
import { User, Settings, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';

const DriverSettings: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Load user profile data
  React.useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, phone')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setFirstName(data.first_name || '');
          setLastName(data.last_name || '');
          setPhoneNumber(data.phone || '');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile information');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfile();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phoneNumber,
          updated_at: new Date()
        })
        .eq('id', user?.id);
        
      if (error) throw error;
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast.success('Password updated successfully');
      setShowChangePassword(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white mb-6">Account Settings</h1>
      
      {/* Profile Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <User className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-semibold text-white">Profile Information</h2>
        </div>
        
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="First Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="Last Name"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="Phone Number"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isLoading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>
      
      {/* Security Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="h-6 w-6 text-green-500" />
          <h2 className="text-xl font-semibold text-white">Security</h2>
        </div>
        
        {!showChangePassword ? (
          <button
            onClick={() => setShowChangePassword(true)}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
          >
            Change Password
          </button>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="New Password"
                minLength={6}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="Confirm Password"
                minLength={6}
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowChangePassword(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
      
      {/* Preferences Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="h-6 w-6 text-purple-500" />
          <h2 className="text-xl font-semibold text-white">Preferences</h2>
        </div>
        
        <p className="text-gray-400">
          Notification and app settings will be available soon.
        </p>
      </div>
    </div>
  );
};

export default DriverSettings;
