// frontend/src/components/Admin/SecurityManagement.js
import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';

const SecurityManagement = () => {
  const [blacklist, setBlacklist] = useState({
    ips: [],
    emails: []
  });
  const [newEntry, setNewEntry] = useState({ type: 'ip', value: '', reason: '' });
  const [loading, setLoading] = useState(true);

  const fetchBlacklist = async () => {
    try {
      const response = await fetch(API_URL + '/api/admin/blacklist', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setBlacklist(data);
    } catch (error) {
      console.error('Error fetching blacklist:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch('API_URL + /api/admin/blacklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newEntry)
      });
      setNewEntry({ type: 'ip', value: '', reason: '' });
      fetchBlacklist();
    } catch (error) {
      console.error('Error adding to blacklist:', error);
    }
  };

  const handleRemove = async (id) => {
    try {
      await fetch(`API_URL + /api/admin/blacklist/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchBlacklist();
    } catch (error) {
      console.error('Error removing from blacklist:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Security Management</h2>

      {/* Add to Blacklist Form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Add to Blacklist</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex space-x-4">
            <select
              value={newEntry.type}
              onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
              className="rounded-md border p-2"
            >
              <option value="ip">IP Address</option>
              <option value="email">Email</option>
            </select>
            <input
              type={newEntry.type === 'email' ? 'email' : 'text'}
              value={newEntry.value}
              onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
              placeholder={`Enter ${newEntry.type}`}
              className="flex-1 rounded-md border p-2"
              required
            />
            <input
              type="text"
              value={newEntry.reason}
              onChange={(e) => setNewEntry({ ...newEntry, reason: e.target.value })}
              placeholder="Reason"
              className="flex-1 rounded-md border p-2"
              required
            />
            <button
              type="submit"
              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
            >
              Add
            </button>
          </div>
        </form>
      </div>

      {/* Blacklisted Items */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Blacklisted Items</h3>
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-2">IP Addresses</h4>
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blacklist.ips.map(item => (
                  <tr key={item._id}>
                    <td className="px-6 py-4">{item.value}</td>
                    <td className="px-6 py-4">{item.reason}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleRemove(item._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-medium mb-2">Emails</h4>
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blacklist.emails.map(item => (
                  <tr key={item._id}>
                    <td className="px-6 py-4">{item.value}</td>
                    <td className="px-6 py-4">{item.reason}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleRemove(item._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityManagement;