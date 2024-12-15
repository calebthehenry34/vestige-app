// components/Profile/SavedPosts.js
import React from 'react';
import { Link } from 'react-router-dom';
import { HeartRegular, ChatRegular } from '@fluentui/react-icons';

const SavedPosts = ({ savedPosts = [] }) => {
  if (!savedPosts.length) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 px-4">Saved Posts</h2>
        <div className="text-center py-8 text-gray-500">
          No saved posts yet
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4 px-4">Saved Posts</h2>
      <div className="grid grid-cols-3 gap-1">
        {savedPosts.map(post => (
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
    </div>
  );
};

export default SavedPosts;