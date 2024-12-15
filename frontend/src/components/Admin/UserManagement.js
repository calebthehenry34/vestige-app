// frontend/src/components/Admin/UserManagement.js
import React, { useState, useEffect } from 'react';
import { 
  DeleteRegular, 
  DismissSquareRegular,
  SearchRegular, 
  EditRegular, 
  AddRegular,
  DismissRegular
} from '@fluentui/react-icons';
import { API_URL } from '../../config';

const UserManagement = () => {
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    role: 'user',
    password: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUserDetails = async (userId) => {
    try {
      const response = await fetch(API_URL + '/api/admin/users/' + userId + '/details', {        
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setUserDetails(data);
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };
  
  const fetchUsers = async () => {
    try {
      const response = await fetch(API_URL + '/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : data.users || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await fetch(API_URL + '/api/admin/users/' + userId, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleSuspend = async (userId) => {
    try {
      await fetch(API_URL + '/api/admin/users/' + userId + '/suspend', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchUsers();
    } catch (error) {
      console.error('Error suspending user:', error);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URL + '/api/admin/users/' + selectedUser._id, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });
      
      if (!response.ok) throw new Error('Failed to update user');
      
      setShowEditModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('API_URL + /api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: editForm.username,
          email: editForm.email,
          role: editForm.role,
          password: editForm.password // Add this
        })
      });
      
      if (!response.ok) throw new Error('Failed to create user');
      
      setShowAddModal(false);
      setEditForm({ username: '', email: '', role: 'user', password: '' });
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handlePasswordReset = async (userId) => {
    try {
      const response = await fetch(`API_URL + /api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
  
      if (!response.ok) throw new Error('Failed to send reset link');
  
      alert('Password reset link has been sent to the user\'s email');
    } catch (error) {
      console.error('Error sending reset link:', error);
      alert('Failed to send reset link');
    }
  };
  
  const handlePasswordChange = async (userId, newPassword) => {
    try {
      if (!editForm.password) {
        alert('Please enter a new password');
        return;
      }

      const response = await fetch(`API_URL + /api/admin/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: editForm.password })
      });
      


      if (!response.ok) throw new Error('Failed to update password');
  
      alert('Password has been updated successfully');
      setEditForm(prev => ({ ...prev, password: '' }));
    } catch (error) {
      console.error('Error updating password:', error);
      alert('Failed to update password');
    }
  };
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Management</h2>
        <button
          onClick={() => {
            setEditForm({ username: '', email: '', role: 'user' });
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
        >
          <AddRegular className="w-5 h-5 mr-2" />
          Add User
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Search users..."
          className="w-full px-4 py-2 pl-10 border rounded-lg"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <SearchRegular className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center">
                  No users found
                </td>
              </tr>
              
            ) : (
              filteredUsers.map(user => (
                <React.Fragment key={user._id}>
                <tr onClick={() => {
                    if (expandedUserId === user._id) {
                          setExpandedUserId(null);
                          setUserDetails(null);
                   } else {
                          setExpandedUserId(user._id);
                          fetchUserDetails(user._id);
                  }
               }} 
               
               className="cursor-pointer hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200">
                        {user.profilePicture && (
                          <img
                            src={user.profilePicture}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.role || 'User'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setEditForm({
                          username: user.username,
                          email: user.email,
                          role: user.role || 'user'
                        });
                        setShowEditModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <EditRegular className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleSuspend(user._id)}
                      className="text-yellow-600 hover:text-yellow-900 mr-4"
                    >
                      <DismissSquareRegular className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(user._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <DeleteRegular className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
                {expandedUserId === user._id && (
      <tr>
        <td colSpan="5" className="bg-gray-50 border-b">
          <div className="p-4">
            {userDetails ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-700">Profile Information</h4>
                  <p className="text-sm">Bio: {userDetails.bio || 'No bio provided'}</p>
                  <p className="text-sm">Location: {userDetails.location || 'Not specified'}</p>
                  <p className="text-sm">Website: {userDetails.website || 'Not provided'}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-700">Account Statistics</h4>
                  <p className="text-sm">Followers: {userDetails.followerCount}</p>
                  <p className="text-sm">Following: {userDetails.followingCount}</p>
                  <p className="text-sm">Posts: {userDetails.postCount}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-700">Account Details</h4>
                  <p className="text-sm">Created: {new Date(userDetails.createdAt).toLocaleString()}</p>
                  <p className="text-sm">Last Active: {new Date(userDetails.lastActive).toLocaleString()}</p>
                  <p className="text-sm">IP Address: {userDetails.lastIpAddress}</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
        </td>
      </tr>
    )}
  </React.Fragment>
)))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
    <div className="bg-white rounded-lg p-6 w-96">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Edit User</h3>
        <button onClick={() => setShowEditModal(false)}>
          <DismissRegular className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={handleEdit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Username</label>
          <input
            type="text"
            value={editForm.username}
            onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select
            value={editForm.role}
            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
          </select>
        </div>

        {/* Password Management Section */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Password Management</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Set New Password</label>
              <div className="mt-1 flex space-x-2">
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Enter new password"
                  className="block w-full rounded-lg border-gray-300 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => handlePasswordChange(selectedUser._id, editForm.password)}
                  disabled={!editForm.password}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
                >
                  Update
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Or Send Reset Link</label>
              <button
                type="button"
                onClick={() => handlePasswordReset(selectedUser._id)}
                className="mt-1 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Send Password Reset Email
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 border-t pt-4">
          <button
            type="button"
            onClick={() => setShowEditModal(false)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add New User</h3>
              <button onClick={() => setShowAddModal(false)}>
                <DismissRegular className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>

              <div>
  <label className="block text-sm font-medium text-gray-700">Password</label>
  <input
    type="password"
    value={editForm.password}
    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm"
    required
  />
</div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;