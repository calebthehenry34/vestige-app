// frontend/src/components/Admin/BackupManagement.js
import React, { useState, useEffect } from 'react';
import { CloudArrowDownRegular, CloudArrowUpRegular } from '@fluentui/react-icons';
import { API_URL } from '../../config';


const BackupManagement = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      const response = await fetch(API_URL + '/api/admin/backups', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setBackups(data);
    } catch (error) {
      console.error('Error fetching backups:', error);
    }
  };

  const createBackup = async () => {
    setLoading(true);
    try {
      await fetch('API_URL + /api/admin/backups/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchBackups();
    } catch (error) {
      console.error('Error creating backup:', error);
    } finally {
      setLoading(false);
    }
  };

  const restoreBackup = async (backupId) => {
    if (window.confirm('Are you sure you want to restore this backup? Current data will be replaced.')) {
      setLoading(true);
      try {
        await fetch(API_URL + '/api/admin/backups/restore/' + backupId, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (error) {
      console.error('Error restoring backup:', error);
    } finally {
      setLoading(false);
    }
  }
};

return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Backup Management</h3>
        <button
          onClick={createBackup}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <CloudArrowUpRegular className="mr-2" />
          Create New Backup
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {backups.map((backup) => (
              <tr key={backup.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(backup.createdAt).toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {(backup.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {backup.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    backup.status === 'completed' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {backup.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => restoreBackup(backup.id)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Restore
                  </button>
                    <a
                    href={backup.downloadUrl}
                    className="text-green-600 hover:text-green-900"
                    download 
                    >
                    <CloudArrowDownRegular className="inline-block" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Backup Settings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="text-lg font-medium mb-4">Backup Settings</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Automatic Backup Frequency
            </label>
            <select className="w-full p-2 border rounded">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Retention Period (days)
            </label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              min="1"
              max="365"
              defaultValue={30}
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="compressBackups"
              className="rounded text-blue-600"
            />
            <label htmlFor="compressBackups" className="ml-2 text-sm text-gray-700">
              Compress backups to save storage space
            </label>
          </div>
        </div>
      </div>

      {/* Restore Progress */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-center">Processing backup...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupManagement;