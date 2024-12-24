import React, { useState, useEffect, useCallback } from 'react';
import { PostSkeleton } from '../Common/Skeleton';
import Post from '../Post/post';
import { API_URL } from '../../config';
import PostCreator from '../Post/PostCreator';
const Feed = ({ onRefreshNeeded }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPostCreator, setShowPostCreator] = useState(false);
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/posts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      const data = await response.json();
      setPosts(data.posts);
      setError(null);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (onRefreshNeeded) {
      onRefreshNeeded(fetchPosts);
    }
  }, [onRefreshNeeded, fetchPosts]);

  const handlePostCreated = async () => {
    await fetchPosts();
    setShowPostCreator(false);
  };

  const handleDelete = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setPosts(posts.filter(post => post._id !== postId));
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  return (
    <>
      <div className="max-w-xl mx-auto relative mb-28">
        {/* Loading State */}
        {loading && (
          <div className="space-y-6">
            {[...Array(3)].map((_, index) => (
              <PostSkeleton key={index} />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center text-red-500 p-4">
            {error}
          </div>
        )}

        {/* Posts */}
        {!loading && !error && (
          <>
            {/* Post Creator Modal */}
            <PostCreator
              isOpen={showPostCreator}
              onClose={() => setShowPostCreator(false)}
              onPostCreated={handlePostCreated}
            />

            <div className="space-y-6">
              {posts.map((post) => (
                <Post
                  key={post._id}
                  post={post}
                  onDelete={handleDelete}
                  onRefresh={(updatedPost) => {
                    // Only update the specific post in the posts array
                    setPosts(prevPosts => 
                      prevPosts.map(p => 
                        p._id === updatedPost._id ? updatedPost : p
                      )
                    );
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Feed;
