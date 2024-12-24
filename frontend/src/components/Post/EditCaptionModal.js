import React, { useState } from 'react';
import { API_URL } from '../../config';

const EditCaptionModal = ({ post, onClose, onUpdate }) => {
  const [caption, setCaption] = useState(post?.caption || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/posts/${post._id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ caption })
      });

      if (!response.ok) {
        throw new Error('Failed to update caption');
      }

      const updatedPost = await response.json();
      onUpdate?.(updatedPost);
      onClose();
    } catch (error) {
      console.error('Error updating caption:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white dark:bg-zinc-800 rounded-lg p-6 max-w-lg w-full mx-4`}>
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Edit Caption</h2>
        <form onSubmit={handleSubmit}>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full p-3 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 dark:text-white mb-4"
            rows="4"
            placeholder="Write a caption..."
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCaptionModal;
