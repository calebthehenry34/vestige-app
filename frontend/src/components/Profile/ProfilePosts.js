// components/Profile/ProfilePosts.js
import React, { useState } from 'react';
import { GridRegular, ListRegular, HeartRegular, ChatRegular } from '@fluentui/react-icons';
import { Link } from 'react-router-dom';

const ProfilePosts = ({ posts = [] }) => {  // Added default empty array
  const [isGridView, setIsGridView] = useState(true);

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No posts yet</p>
      </div>
    );
  }

  return (
    <div>
      {/* Layout Toggle */}
      <div className="flex justify-between items-center mb-4 px-4">
        <h2 className="text-xl font-semibold">Posts</h2>
        <button 
          onClick={() => setIsGridView(!isGridView)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {isGridView ? <ListRegular className="w-6 h-6" /> : <GridRegular className="w-6 h-6" />}
        </button>
      </div>

      {/* Grid View */}
      {isGridView ? (
        <div className="grid grid-cols-3 gap-1">
          {posts.map(post => (
            <Link 
              key={post._id}
              to={`/post/${post._id}`}
              className="relative aspect-square group"
            >
              <img
                src={post.media}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = '/api/placeholder/400/400';
                  e.target.onError = null;
                }}
              />
              {/* Hover Overlay */}
              <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/50 flex items-center justify-center space-x-6 transition-opacity">
                <div className="flex items-center text-white">
                  <HeartRegular className="w-6 h-6 mr-2" />
                  <span>{post.likes?.length || 0}</span>
                </div>
                <div className="flex items-center text-white">
                  <ChatRegular className="w-6 h-6 mr-2" />
                  <span>{post.comments?.length || 0}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        // Single Post Layout
        <div className="space-y-4 px-4">
          {posts.map(post => (
            <div key={post._id} className="bg-white rounded-lg shadow">
              <div className="aspect-square">
                <img
                  src={post.media}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = '/api/placeholder/400/400';
                    e.target.onError = null;
                  }}
                />
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <HeartRegular className="w-6 h-6 mr-2" />
                      <span>{post.likes?.length || 0}</span>
                    </div>
                    <div className="flex items-center">
                      <ChatRegular className="w-6 h-6 mr-2" />
                      <span>{post.comments?.length || 0}</span>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-800">{post.caption}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfilePosts;