import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaUser, FaLock, FaBell, FaSpinner, FaCheck, 
  FaTimes, FaUpload, FaTrash, FaCamera 
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { supabase } from '../../utils/supabase';

interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  profile_image?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  order_updates: boolean;
  marketing_emails: boolean;
  delivery_reminders: boolean;
}

const Account: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  
  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    full_name: '',
    phone: '',
    email: '',
    profile_image: '',
    address: '',
    city: '',
    postal_code: '',
    country: ''
  });
  
  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Notification state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    order_updates: true,
    marketing_emails: false,
    delivery_reminders: true
  });
  
  // Load user data on component mount
  useEffect(() => {
    fetchUserProfile();
  }, []);
  
  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error(t('common.authError'));
        return;
      }
      
      // Fetch profile data
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setProfile({
          id: data.id,
          full_name: data.full_name || '',
          phone: data.phone || '',
          email: data.email || user.email || '',
          profile_image: data.profile_image,
          address: data.address || '',
          city: data.city || '',
          postal_code: data.postal_code || '',
          country: data.country || ''
        });
        
        // Load notification settings
        if (data.notification_settings) {
          setNotificationSettings(data.notification_settings);
        }
      }
      
    } catch (error) {
      console.error('Error loading user profile:', error);
      toast.error(t('account.errorLoadingProfile'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          postal_code: profile.postal_code,
          country: profile.country,
          updated_at: new Date()
        })
        .eq('id', profile.id);
        
      if (error) throw error;
      
      toast.success(t('account.profileUpdated'));
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('account.errorUpdatingProfile'));
    } finally {
      setIsSaving(false);
    }
  };
  
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error(t('account.passwordsDoNotMatch'));
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error(t('account.passwordTooShort'));
      return;
    }
    
    setIsSaving(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast.success(t('account.passwordUpdated'));
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(t('account.errorUpdatingPassword'));
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleNotificationUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          notification_settings: notificationSettings,
          updated_at: new Date()
        })
        .eq('id', profile.id);
        
      if (error) throw error;
      
      toast.success(t('account.notificationUpdated'));
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error(t('account.errorUpdatingNotifications'));
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${profile.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    setImageUploading(true);
    
    try {
      // Upload image to storage
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get the URL for the uploaded image
      const { data } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);
        
      if (data) {
        // Update profile with the new image URL
        const { error: updateError } = await supabase
          .from('users')
          .update({
            profile_image: data.publicUrl,
            updated_at: new Date()
          })
          .eq('id', profile.id);
          
        if (updateError) throw updateError;
        
        // Update local state with the new image
        setProfile({
          ...profile,
          profile_image: data.publicUrl
        });
        
        toast.success(t('account.profileImageUpdated'));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(t('account.errorUploadingImage'));
    } finally {
      setImageUploading(false);
    }
  };
  
  const handleRemoveImage = async () => {
    if (!profile.profile_image) return;
    
    setImageUploading(true);
    
    try {
      // Update profile to remove the image
      const { error } = await supabase
        .from('users')
        .update({
          profile_image: null,
          updated_at: new Date()
        })
        .eq('id', profile.id);
        
      if (error) throw error;
      
      // Update local state
      setProfile({
        ...profile,
        profile_image: ''
      });
      
      toast.success(t('account.profileImageRemoved'));
    } catch (error) {
      console.error('Error removing profile image:', error);
      toast.error(t('account.errorRemovingImage'));
    } finally {
      setImageUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="text-indigo-600 dark:text-indigo-400 animate-spin text-2xl" />
      </div>
    );
  }

  return (
    <div className="container mx-auto pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center mb-4">
          <FaUser className="text-xl mr-2 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t('account.title')}
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {t('account.subtitle')}
        </p>
      </motion.div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 mb-6">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center px-4 py-3 font-medium whitespace-nowrap border-b-2 transition-colors duration-300 ${
              activeTab === 'profile'
                ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FaUser className="mr-2" />
            {t('account.profile')}
          </button>
          
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center px-4 py-3 font-medium whitespace-nowrap border-b-2 transition-colors duration-300 ${
              activeTab === 'security'
                ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FaLock className="mr-2" />
            {t('account.security')}
          </button>
          
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center px-4 py-3 font-medium whitespace-nowrap border-b-2 transition-colors duration-300 ${
              activeTab === 'notifications'
                ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FaBell className="mr-2" />
            {t('account.notifications')}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-midnight-800 rounded-xl shadow-sm border border-gray-100 dark:border-stone-700/20 p-6">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col md:flex-row gap-8 mb-6">
              {/* Profile Image */}
              <div className="flex flex-col items-center">
                <div className="relative w-40 h-40 mb-4">
                  <div className="w-40 h-40 rounded-full bg-gray-200 dark:bg-midnight-700 flex items-center justify-center overflow-hidden">
                    {profile.profile_image ? (
                      <img 
                        src={profile.profile_image} 
                        alt={profile.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FaUser className="h-20 w-20 text-gray-400 dark:text-gray-600" />
                    )}
                    
                    {imageUploading && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
                        <FaSpinner className="text-white animate-spin text-2xl" />
                      </div>
                    )}
                  </div>
                  
                  <div className="absolute bottom-0 right-0">
                    <label className="w-10 h-10 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors duration-300">
                      <FaCamera />
                      <input 
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={imageUploading}
                      />
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <button
                    onClick={handleRemoveImage}
                    disabled={!profile.profile_image || imageUploading}
                    className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors duration-300 ${
                      profile.profile_image && !imageUploading
                        ? 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <FaTrash /> {t('account.removeImage')}
                  </button>
                </div>
              </div>
              
              {/* Profile Form */}
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {t('account.personalInfo')}
                </h2>
                
                <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('account.fullName')}
                    </label>
                    <input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-stone-600/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 dark:bg-midnight-700"
                      required
                    />
                  </div>
                  
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('account.email')}
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-200 dark:border-stone-600/20 rounded-lg bg-gray-50 dark:bg-midnight-600 cursor-not-allowed"
                    />
                  </div>
                  
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('account.phone')}
                    </label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({...profile, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-stone-600/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 dark:bg-midnight-700"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('account.address')}
                    </label>
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) => setProfile({...profile, address: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-stone-600/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 dark:bg-midnight-700"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('account.city')}
                    </label>
                    <input
                      type="text"
                      value={profile.city}
                      onChange={(e) => setProfile({...profile, city: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-stone-600/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 dark:bg-midnight-700"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('account.postalCode')}
                    </label>
                    <input
                      type="text"
                      value={profile.postal_code}
                      onChange={(e) => setProfile({...profile, postal_code: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-stone-600/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 dark:bg-midnight-700"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('account.country')}
                    </label>
                    <select
                      value={profile.country}
                      onChange={(e) => setProfile({...profile, country: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-stone-600/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 dark:bg-midnight-700"
                    >
                      <option value="">-- {t('account.selectCountry')} --</option>
                      <option value="FR">France</option>
                      <option value="DE">Germany</option>
                      <option value="ES">Spain</option>
                      <option value="IT">Italy</option>
                      <option value="UK">United Kingdom</option>
                    </select>
                  </div>
                  
                  <div className="col-span-2 mt-4">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors duration-300 flex items-center justify-center"
                    >
                      {isSaving ? (
                        <>
                          <FaSpinner className="animate-spin mr-2" />
                          {t('account.saving')}
                        </>
                      ) : (
                        <>
                          <FaCheck className="mr-2" />
                          {t('account.saveChanges')}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Security Tab */}
        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('account.passwordSettings')}
            </h2>
            
            <form onSubmit={handlePasswordUpdate} className="max-w-md space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('account.currentPassword')}
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-stone-600/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 dark:bg-midnight-700"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('account.newPassword')}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-stone-600/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 dark:bg-midnight-700"
                  required
                  minLength={8}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('account.passwordRequirements')}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('account.confirmPassword')}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-stone-600/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 dark:bg-midnight-700"
                  required
                  minLength={8}
                />
              </div>
              
              <div className="mt-6">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors duration-300 flex items-center justify-center"
                >
                  {isSaving ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      {t('account.updating')}
                    </>
                  ) : (
                    <>
                      <FaLock className="mr-2" />
                      {t('account.updatePassword')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
        
        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('account.notificationSettings')}
            </h2>
            
            <form onSubmit={handleNotificationUpdate} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {t('account.emailNotifications')}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('account.emailNotificationsDesc')}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.email_notifications}
                      onChange={() => setNotificationSettings({
                        ...notificationSettings,
                        email_notifications: !notificationSettings.email_notifications
                      })}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors duration-300 ${
                      notificationSettings.email_notifications
                        ? 'bg-indigo-600 dark:bg-indigo-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}>
                      <div className={`w-5 h-5 rounded-full bg-white transform transition-transform duration-300 ${
                        notificationSettings.email_notifications
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}></div>
                    </div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {t('account.orderUpdates')}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('account.orderUpdatesDesc')}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.order_updates}
                      onChange={() => setNotificationSettings({
                        ...notificationSettings,
                        order_updates: !notificationSettings.order_updates
                      })}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors duration-300 ${
                      notificationSettings.order_updates
                        ? 'bg-indigo-600 dark:bg-indigo-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}>
                      <div className={`w-5 h-5 rounded-full bg-white transform transition-transform duration-300 ${
                        notificationSettings.order_updates
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}></div>
                    </div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {t('account.marketingEmails')}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('account.marketingEmailsDesc')}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.marketing_emails}
                      onChange={() => setNotificationSettings({
                        ...notificationSettings,
                        marketing_emails: !notificationSettings.marketing_emails
                      })}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors duration-300 ${
                      notificationSettings.marketing_emails
                        ? 'bg-indigo-600 dark:bg-indigo-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}>
                      <div className={`w-5 h-5 rounded-full bg-white transform transition-transform duration-300 ${
                        notificationSettings.marketing_emails
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}></div>
                    </div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {t('account.deliveryReminders')}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('account.deliveryRemindersDesc')}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.delivery_reminders}
                      onChange={() => setNotificationSettings({
                        ...notificationSettings,
                        delivery_reminders: !notificationSettings.delivery_reminders
                      })}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors duration-300 ${
                      notificationSettings.delivery_reminders
                        ? 'bg-indigo-600 dark:bg-indigo-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}>
                      <div className={`w-5 h-5 rounded-full bg-white transform transition-transform duration-300 ${
                        notificationSettings.delivery_reminders
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}></div>
                    </div>
                  </label>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors duration-300 flex items-center justify-center"
                >
                  {isSaving ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      {t('account.saving')}
                    </>
                  ) : (
                    <>
                      <FaCheck className="mr-2" />
                      {t('account.savePreferences')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Account; 