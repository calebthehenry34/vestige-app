// frontend/src/components/Admin/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ChartMultipleFilled,
  ContactCardGroupFilled,
  ShieldErrorFilled,
  DocumentCatchUpFilled,
  FilmstripImageFilled,
  PaintBrushFilled,
  DocumentFlowchartFilled,
  ArrowCircleUpLeftRegular,
} from '@fluentui/react-icons';
import Overview from './Overview';
import UserManagement from './UserManagement';
import SecurityManagement from './SecurityManagement';
import PostsManagement from './PostsManagement';
import AppearanceSettings from './AppearanceSettings';
import BackupManagement from './BackupManagement';
import Reports from './Reports';
import { API_URL } from '../../config';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const renderContent = () => {
    switch(activeTab) {
      case 'overview':
        return <Overview analytics={analytics} />;
      case 'posts':
        return <PostsManagement />;
      case 'users':
        return <UserManagement />;
      case 'security':
        return <SecurityManagement />;
      case 'settings':
        return <AppearanceSettings />;
      case 'backup':
        return <BackupManagement />;
      case 'reports':
        return <Reports />;
      default:
        return <Overview analytics={analytics} />;
    }
  };
  

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    
    fetchAnalytics();
  }, [user, navigate]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(API_URL + '/api/admin/analytics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

    
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg h-screen fixed">
          <div className="p-4">
            <h2 className="text-xl font-bold text-gray-800">Admin Dashboard</h2>
          </div>
          <nav className="mt-4">
          {[
              { id: 'overview', icon: <ChartMultipleFilled />, label: 'Overview' },
              { id: 'posts', icon: <FilmstripImageFilled />, label: 'Posts Management' },
              { id: 'users', icon: <ContactCardGroupFilled />, label: 'User Management' },
              { id: 'security', icon: <ShieldErrorFilled />, label: 'Security' },
              { id: 'settings', icon: <PaintBrushFilled />, label: 'Appearance Settings' },
              { id: 'backup', icon: <DocumentCatchUpFilled />, label: 'Backups' },
              { id: 'reports', icon: <DocumentFlowchartFilled />, label: 'Reports' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center w-full p-3 rounded-lg ${
                  activeTab === item.id 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </button>
            ))}
            <div className="absolute bottom-0 w-full p-4 border-t">
             <button
               onClick={() => navigate('/')}
               className="w-full flex items-center p-4 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg"
             >
               <ArrowCircleUpLeftRegular className="mr-3" />
               Return to App
             </button>
           </div>
          </nav>
        </div>

        

        {/* Main Content */}
        <div className="ml-64 flex-1 p-8">
        {renderContent()}

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;