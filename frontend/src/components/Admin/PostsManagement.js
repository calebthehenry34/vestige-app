import React, { useState, useEffect } from 'react';
import {
  ImageRegular,
  VideoRegular,
  DocumentTextRegular
} from '@fluentui/react-icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { API_URL } from '../../config';

const PostsManagement = () => {
  const [postStats, setPostStats] = useState({
    images: { count: 0, size: 0 },
    videos: { count: 0, duration: 0, size: 0 },
    text: { count: 0, wordCount: 0 }
  });

  useEffect(() => {
    fetchPostStats();
  }, []);

  const fetchPostStats = async () => {
    try {
      const response = await fetch(API_URL + '/api/admin/posts/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setPostStats(data);
    } catch (error) {
      console.error('Error fetching post stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold">Content Management</h3>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <ImageRegular className="w-8 h-8 text-blue-500" />
              <h4 className="mt-2 text-lg font-medium">Image Posts</h4>
            </div>
            <span className="text-3xl font-bold">{postStats.images.count}</span>
          </div>
          <p className="mt-2 text-gray-600">
            Total Size: {(postStats.images.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <VideoRegular className="w-8 h-8 text-blue-500" />
              <h4 className="mt-2 text-lg font-medium">Video Posts</h4>
            </div>
            <span className="text-3xl font-bold">{postStats.videos.count}</span>
          </div>
          <p className="mt-2 text-gray-600">
            Total Duration: {Math.floor(postStats.videos.duration / 60)} minutes
          </p>
          <p className="text-gray-600">
            Total Size: {(postStats.videos.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <DocumentTextRegular className="w-8 h-8 text-blue-500" />
              <h4 className="mt-2 text-lg font-medium">Text Posts</h4>
            </div>
            <span className="text-3xl font-bold">{postStats.text.count}</span>
          </div>
          <p className="mt-2 text-gray-600">
            Total Words: {postStats.text.wordCount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Content Type Chart */}
      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <h4 className="text-lg font-medium mb-4">Content Distribution</h4>
        <div className="h-64">
          <BarChart
            data={[
              { 
                type: 'Images',
                count: postStats.images.count
              },
              {
                type: 'Videos',
                count: postStats.videos.count
              },
              {
                type: 'Text',
                count: postStats.text.count
              }
            ]}
            width={500}
            height={300}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="type" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3B82F6" />
          </BarChart>
        </div>
      </div>
    </div>
  );
};

export default PostsManagement;