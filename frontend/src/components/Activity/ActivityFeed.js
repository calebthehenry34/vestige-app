import React, { useState } from 'react';

const ActivityFeed = () => {
  const [activeTab, setActiveTab] = useState('all');

  const mockActivities = [
    {
      id: 1,
      type: 'follow',
      user: {
        username: 'jane_doe',
        profilePicture: '/api/placeholder/40/40'
      },
      timestamp: '2h',
      isFollowing: false
    },
    {
      id: 2,
      type: 'like',
      user: {
        username: 'john_smith',
        profilePicture: '/api/placeholder/40/40'
      },
      post: {
        image: '/api/placeholder/60/60'
      },
      timestamp: '3h'
    },
    {
      id: 3,
      type: 'comment',
      user: {
        username: 'sarah_parker',
        profilePicture: '/api/placeholder/40/40'
      },
      post: {
        image: '/api/placeholder/60/60'
      },
      comment: 'This is amazing! 🔥',
      timestamp: '5h'
    }
  ];

  const renderActivity = (activity) => {
    switch (activity.type) {
      case 'follow':
        return (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <img
                src={activity.user.profilePicture}
                alt={activity.user.username}
                className="w-10 h-10 rounded-full mr-3"
              />
              <div>
                <span className="font-semibold">{activity.user.username}</span>
                <span className="ml-1">started following you.</span>
                <div className="text-gray-500 text-sm">{activity.timestamp}</div>
              </div>
            </div>
            <button className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold text-sm hover:bg-blue-600">
              Follow
            </button>
          </div>
        );

      case 'like':
        return (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center flex-1">
              <img
                src={activity.user.profilePicture}
                alt={activity.user.username}
                className="w-10 h-10 rounded-full mr-3"
              />
              <div className="flex-1">
                <span className="font-semibold">{activity.user.username}</span>
                <span className="ml-1">liked your post.</span>
                <div className="text-gray-500 text-sm">{activity.timestamp}</div>
              </div>
            </div>
            <img
              src={activity.post.image}
              alt="Post"
              className="w-12 h-12 object-cover"
            />
          </div>
        );

      case 'comment':
        return (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center flex-1">
              <img
                src={activity.user.profilePicture}
                alt={activity.user.username}
                className="w-10 h-10 rounded-full mr-3"
              />
              <div className="flex-1">
                <span className="font-semibold">{activity.user.username}</span>
                <span className="ml-1">commented: </span>
                <span>{activity.comment}</span>
                <div className="text-gray-500 text-sm">{activity.timestamp}</div>
              </div>
            </div>
            <img
              src={activity.post.image}
              alt="Post"
              className="w-12 h-12 object-cover"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          className={`px-8 py-4 font-semibold ${
            activeTab === 'all' ? 'border-b-2 border-black' : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          className={`px-8 py-4 font-semibold ${
            activeTab === 'follows' ? 'border-b-2 border-black' : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('follows')}
        >
          Follows
        </button>
      </div>

      {/* Activity List */}
      <div className="divide-y">
        {mockActivities
          .filter(activity => activeTab === 'all' || activity.type === 'follow')
          .map(activity => (
            <div key={activity.id}>
              {renderActivity(activity)}
            </div>
          ))}
      </div>
    </div>
  );
};

export default ActivityFeed;