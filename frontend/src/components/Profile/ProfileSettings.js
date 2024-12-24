import React, { useState } from 'react';
import {
  PersonRegular,
  DeleteRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
  PeopleRegular,
  ShieldRegular,
  LockClosedRegular,
  VirtualNetworkFilled,
  PresenceBlockedRegular,
  PersonSquareCheckmarkRegular,
  MoneyRegular,
  ChartMultipleRegular,
  DocumentRegular,
  ShareRegular,
} from '@fluentui/react-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';
import { getProfileImageUrl } from '../../utils/imageUtils';

const ProfileSettings = () => {
  const [uploading, setUploading] = useState(false);
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    links: ['', '', ''],
    theme: 'light',
    isAdmin: user?.isAdmin || false
  });
  
  const { theme, toggleTheme } = useTheme();

  const navigationItems = [
    { id: 'profile', icon: <PersonRegular />, label: 'Profile Details' },
    { id: 'security', icon: <ShieldRegular />, label: 'Security' },
    { id: 'privacy', icon: <LockClosedRegular />, label: 'Privacy' },
    { id: 'subscription', icon: <MoneyRegular />, label: 'Subscription' },
    { id: 'affiliate', icon: <ShareRegular />, label: 'Affiliate Program' },
    { id: 'analytics', icon: <ChartMultipleRegular />, label: 'Analytics' },
    { id: 'sessions', icon: <VirtualNetworkFilled />, label: 'Sessions' },
    { id: 'followers', icon: <PeopleRegular />, label: 'Manage Followers' },
    { id: 'blocked', icon: <PresenceBlockedRegular />, label: 'Blocked Users' },
    { id: 'verification', icon: <PersonSquareCheckmarkRegular />, label: 'Verification' },
    { id: 'about', icon: <DocumentRegular />, label: 'About' }
  ];

  const handleSave = async () => {
    try {
      const response = await fetch(`${API_URL}/api/profile/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Update error:', errorData);
        throw new Error(errorData.error || 'Failed to update profile');
      }
  
      const data = await response.json();
      console.log('Profile update success:', data);
      
      updateUser({ ...user, ...data.user });
      alert('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    }
  };

const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      setUploading(true);
  
      const formData = new FormData();
      formData.append('profilePicture', file);
  
      const response = await fetch(`${API_URL}/api/users/profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
  
      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
      }
  
      const data = await response.json();
      // Update the user state with the new profile picture
      const updatedUser = {
        ...user,
        profilePicture: data.profilePicture
      };
      
      updateUser(updatedUser);
      console.log('Profile picture updated:', getProfileImageUrl(data.profilePicture, user?.username));
  
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [followers, setFollowers] = useState([
    { id: 1, username: 'user1', avatar: '/placeholder.jpg' },
    { id: 2, username: 'user2', avatar: '/placeholder.jpg' }
  ]);
  const [selectedFollowers, setSelectedFollowers] = useState([]);
  const [dateRange, setDateRange] = useState('30');
  const [subscriptionStatus, setSubscriptionStatus] = useState('active');
  const [taxInfoUploaded, setTaxInfoUploaded] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    profileVisits: 1234,
    engagementRate: 8.5,
    totalLikes: 5678,
    totalComments: 890,
    totalSaves: 123,
    totalShares: 456
  });

  const subscriptionData = {
    plan: 'Beta',
    status: 'Active',
    nextBilling: null,
    amount: 'Free'
  };

  return (
    <div className={`min-h-screen ${theme === 'dark-theme' ? 'bg-black' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Desktop Sidebar */}
          <div className="block">
            <div className={`sticky top-20 rounded-lg shadow-lg p-4 ${
              theme === 'dark-theme' ? 'bg-gray-900' : 'bg-white'
            }`}>
              <h2 className={`text-xl font-semibold mb-4 ${
                theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
              }`}>Settings</h2>
              <nav className="space-y-2">
                {navigationItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center w-full p-3 rounded-lg transition-colors ${
                      activeTab === item.id 
                        ? theme === 'dark-theme'
                          ? 'bg-gray-800 text-blue-400'
                          : 'bg-blue-50 text-blue-600'
                        : theme === 'dark-theme'
                          ? 'text-gray-300 hover:bg-gray-800'
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="md:col-span-3">
            <div className={`rounded-lg shadow-lg p-6 ${
              theme === 'dark-theme' ? 'bg-gray-900' : 'bg-white'
            }`}>
              {/* Profile Content */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h3 className={`text-xl font-semibold ${
                    theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
                  }`}>Profile Details</h3>

                  {/* Profile Picture Upload */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                      <div className="relative">
                        <img
                          src={getProfileImageUrl(user?.profilePicture, user?.username)}
                          alt={user?.username || 'Profile'}
                          className="w-100 h-100 rounded-md object-cover"
                          onError={(e) => {
                            console.log('Profile image load error:', e.target.src);
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'User')}`;
                            e.target.onError = null;
                          }}
                        />
                        {uploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-md">
                            <div className="animate-spin rounded-md h-8 w-8 border-t-2 border-b-2 border-white"></div>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className={`px-4 py-2 rounded-lg cursor-pointer ${
                          theme === 'dark-theme'
                            ? 'bg-gray-800 hover:bg-gray-800'
                            : 'bg-black hover:bg-blue-600'
                        } text-white`}>
                          Change Photo
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageChange}
                            disabled={uploading}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium ${
                        theme === 'dark-theme' ? 'text-gray-300' : 'text-gray-700'
                      } mb-2`}>Username</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          theme === 'dark-theme'
                            ? 'bg-gray-800 border-gray-700 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } `}
                      />
                    </div>

                    {/* Theme Toggle */}
                    <div className="space-y-2">
                      <label className={`block text-sm font-medium ${
                        theme === 'dark-theme' ? 'text-gray-300' : 'text-gray-700'
                      }`}>Theme</label>
                      <div className="flex space-x-4">
                        <button
                          onClick={() => toggleTheme('light-theme')}
                          className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                            theme === 'light-theme'
                              ? 'bg-blue-500 text-white border-blue-600'
                              : theme === 'dark-theme'
                                ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          <WeatherSunnyRegular className="w-5 h-5 mr-2" />
                          Light
                        </button>
                        <button
                          onClick={() => toggleTheme('dark-theme')}
                          className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                            theme === 'dark-theme'
                              ? 'bg-blue-500 text-white border-blue-600'
                              : theme === 'dark-theme'
                                ? 'bg-gray-800 text-gray-300 border-gray-700'
                                : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          <WeatherMoonRegular className="w-5 h-5 mr-2" />
                          Dark
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-6">
                    <button
                      onClick={handleSave}
                      className={`px-6 py-2 rounded-lg w-full ${
                        theme === 'dark-theme'
                          ? 'bg-gray-900 hover:bg-white-700 text-white'
                          : 'bg-black-500 hover:bg-white-600 text-black'
                      }`}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* Followers Tab */}
              {activeTab === 'followers' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold">Manage Followers</h3>
                    {selectedFollowers.length > 0 && (
                      <button
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        onClick={() => {/* Handle bulk remove */}}
                      >
                        Remove Selected ({selectedFollowers.length})
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {followers.map(follower => (
                      <div
                        key={follower.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            className="rounded text-blue-600"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFollowers([...selectedFollowers, follower.id]);
                              } else {
                                setSelectedFollowers(selectedFollowers.filter(id => id !== follower.id));
                              }
                            }}
                          />
                          <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                          <span className="font-medium">{follower.username}</span>
                        </div>
                        <button
                          className="text-red-600 hover:text-red-800"
                          onClick={() => {/* Handle remove */}}
                        >
                          <DeleteRegular />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

                  {/* Subscription Tab */}
                  {activeTab === 'subscription' && (
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold">Beta Access</h3>
                      
                      {/* Current Plan */}
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h4 className="text-lg font-medium">Current Plan: {subscriptionData.plan}</h4>
                            <p className="text-gray-600">Status: {subscriptionData.status}</p>
                          </div>
                          <span className="text-2xl font-bold text-green-600">{subscriptionData.amount}</span>
                        </div>
                        <p className="text-gray-600">
                          You have full access to all features during our beta period. Thank you for being an early adopter!
                        </p>
                      </div>
                    </div>
                  )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold">Analytics</h3>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="px-4 py-2 border rounded-lg"
                    >
                      <option value="30">Last 30 Days</option>
                      <option value="60">Last 60 Days</option>
                      <option value="90">Last 90 Days</option>
                      <option value="180">Last 180 Days</option>
                      <option value="365">Last 365 Days</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  {/* Profile Visits */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-lg p-6">
                      <h4 className="text-lg font-medium mb-2">Profile Visits</h4>
                      <p className="text-3xl font-bold text-blue-600">
                        {analyticsData.profileVisits.toLocaleString()}
                      </p>
                    </div>
                    <div className="border rounded-lg p-6">
                      <h4 className="text-lg font-medium mb-2">Engagement Rate</h4>
                      <p className="text-3xl font-bold text-blue-600">
                        {analyticsData.engagementRate}%
                      </p>
                    </div>
                  </div>

                  {/* Detailed Metrics */}
                  <div className="border rounded-lg p-6">
                    <h4 className="text-lg font-medium mb-4">Total Interactions</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Likes</span>
                        <span className="font-medium">{analyticsData.totalLikes.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Comments</span>
                        <span className="font-medium">{analyticsData.totalComments.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Saves</span>
                        <span className="font-medium">{analyticsData.totalSaves.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shares</span>
                        <span className="font-medium">{analyticsData.totalShares.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* About Tab */}
              {activeTab === 'about' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold">About</h3>
                  
                  <div className="space-y-4">
                    <div className="border rounded-lg p-6">
                      <h4 className="text-lg font-medium mb-4">Content Policy</h4>
                      <div className="prose max-w-none">
                        <p className="text-gray-600">
                          Our content policy guidelines help maintain a safe and respectful environment...
                        </p>
                      </div>
                    </div>

                    <div className="border rounded-lg p-6">
                      <h4 className="text-lg font-medium mb-4">Privacy Policy</h4>
                      <div className="prose max-w-none">
                        <p className="text-gray-600">
                          We take your privacy seriously. Learn how we collect and protect your data...
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Affiliate Tab */}
              {activeTab === 'affiliate' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold">Affiliate Program</h3>

                  <div className="bg-white border rounded-lg p-6">
                    <h4 className="text-lg font-medium mb-2">Your Affiliate Rate</h4>
                    <p className="text-3xl font-bold text-blue-600 mb-4">5.00%</p>
                    <p className="text-gray-600 mb-4">
                      Earn 5.00% for each new user who signs up using your referral link.
                    </p>

                    {/* Referral Link */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Referral Link
                      </label>
                      <div className="flex">
                        <input
                          type="text"
                          readOnly
                          value={`https://vestige.com/ref/${123456}`}
                          className="flex-1 px-3 py-2 border rounded-l-lg bg-white"
                        />
                        <button 
                          onClick={() => navigator.clipboard.writeText(`https://vestige.com/ref/${123456}`)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    {/* Tax Information */}
                    <div className="border-t pt-6">
                      <h4 className="text-lg font-medium mb-2">Tax Information</h4>
                      {!taxInfoUploaded ? (
                        <div>
                          <p className="text-gray-600 mb-4">
                            Please upload your tax information to receive affiliate payments.
                            This information is stored securely and used for tax purposes only.
                          </p>
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Upload Tax Documents
                          </button>
                        </div>
                      ) : (
                        <div className="text-green-600">
                          Tax information verified ✓
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
