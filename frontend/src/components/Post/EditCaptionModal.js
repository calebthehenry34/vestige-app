import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { API_URL } from '../../config';

const EditCaptionModal = ({ post, onClose, onUpdate }) => {
  const [caption, setCaption] = useState(post?.caption || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const previousCaptionRef = useRef(post?.caption || '');
  const mounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleCancel = useCallback(() => {
    if (loading) return;
    
    // If there are unsaved changes, confirm before closing
    if (caption.trim() !== previousCaptionRef.current.trim()) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [loading, caption, onClose]);

  // Reset error when caption changes
  useEffect(() => {
    if (error) setError('');
  }, [caption, error]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [handleCancel]);

  const validateCaption = (text) => {
    if (!text.trim()) {
      return 'Caption cannot be empty';
    }
    if (text.length > 2200) {
      return 'Caption must be less than 2200 characters';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    const trimmedCaption = caption.trim();
    
    // Skip if no changes
    if (trimmedCaption === previousCaptionRef.current.trim()) {
      onClose();
      return;
    }

    // Validate
    const validationError = validateCaption(trimmedCaption);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Optimistic update
      const optimisticPost = {
        ...post,
        caption: trimmedCaption
      };
      onUpdate?.(optimisticPost);

      const response = await fetch(`${API_URL}/api/posts/${post._id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ caption: trimmedCaption })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update caption');
      }

      if (mounted.current) {
        onUpdate?.(data);
        onClose();
      }
    } catch (err) {
      console.error('Error updating caption:', err);
      if (mounted.current) {
        setError(err.message || 'Failed to update caption. Please try again.');
        // Revert optimistic update
        onUpdate?.({
          ...post,
          caption: previousCaptionRef.current
        });
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  // Handle click outside to close
  const modalRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleCancel();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleCancel]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={modalRef}
        className={`bg-white dark:bg-zinc-800 rounded-lg p-6 max-w-lg w-full mx-4`}
      >
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Edit Caption</h2>
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className={`w-full p-3 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 dark:text-white mb-1 ${
                error ? 'border-red-500' : ''
              }`}
              rows="4"
              placeholder="Write a caption..."
              maxLength={2200}
              disabled={loading}
              autoFocus
            />
            <div className="flex justify-between items-center mb-4">
              <span className={`text-xs ${error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                {error || `${caption.length}/2200 characters`}
              </span>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              disabled={loading || caption.trim() === previousCaptionRef.current.trim()}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

EditCaptionModal.propTypes = {
  post: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    caption: PropTypes.string
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func
};

export default EditCaptionModal;
