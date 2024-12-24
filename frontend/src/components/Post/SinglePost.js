import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeftRegular } from '@fluentui/react-icons';
import { API_URL } from '../../config';
import { getMediaUrl } from '../../utils/imageUtils';
import SinglePostView from './SinglePostView';

const SinglePost = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/posts/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server error:', errorData);
          throw new Error(`Failed to fetch post: ${response.status} ${errorData.error || ''}`);
        }

        const data = await response.json();
        if (!data) {
          throw new Error('No data received from server');
        }
        console.log('Received post data:', data);
        // Extract the first post from the array if data is an array
        const postData = Array.isArray(data) ? data[0] : data;
        setPost(postData);
        setError(null);
      } catch (err) {
        console.error('Error fetching post:', err.message);
        setError(`Failed to load post: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  useEffect(() => {
    if (post) {
      // Log post data for debugging
      console.log('Post data:', post);
      if (post.media) {
        console.log('Media URL:', getMediaUrl(post.media));
      }
    }
  }, [post]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col h-screen bg-[#C5B358]">
        <div className="p-4">
          <button 
            onClick={() => window.history.back()} 
            className="text-white hover:opacity-80"
          >
            <ChevronLeftRegular className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col h-screen bg-[#C5B358]">
        <div className="p-4">
          <button 
            onClick={() => window.history.back()} 
            className="text-white hover:opacity-80"
          >
            <ChevronLeftRegular className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white text-center">
            <p className="mb-4">{error}</p>
            <button 
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black">
      <SinglePostView post={post} />
    </div>
  );
};

export default SinglePost;
