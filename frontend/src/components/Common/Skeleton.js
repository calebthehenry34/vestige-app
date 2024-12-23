import React from 'react';

export const NotificationSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center space-x-4 flex-grow">
        <div className="w-12 h-12 rounded-xl bg-gray-700 flex-shrink-0"></div>
        <div className="flex flex-col flex-grow space-y-2">
          <div className="h-4 w-24 bg-gray-700 rounded"></div>
          <div className="h-3 w-32 bg-gray-700 rounded"></div>
          <div className="h-2 w-16 bg-gray-700 rounded"></div>
        </div>
      </div>
      <div className="w-12 h-12 bg-gray-700 rounded-xl ml-4 flex-shrink-0"></div>
    </div>
  </div>
);

export const SinglePostSkeleton = () => (
  <div className="fixed inset-0 z-[100] flex flex-col bg-black">
    {/* Header */}
    <div className="p-4 flex justify-between items-center border-b border-gray-800">
      <div className="flex items-center">
        <div className="h-8 w-8 rounded-full bg-gray-700"></div>
        <div className="ml-3 h-4 w-24 bg-gray-700 rounded"></div>
      </div>
      <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
    </div>

    {/* Main Content */}
    <div className="flex-1 flex flex-col md:flex-row min-h-0">
      {/* Media Section */}
      <div className="w-full md:w-7/12 bg-black flex items-center justify-center">
        <div className="w-full aspect-square bg-gray-800"></div>
      </div>

      {/* Info Section */}
      <div className="w-full md:w-5/12 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="flex justify-between mb-4">
            <div className="flex space-x-4">
              <div className="w-6 h-6 bg-gray-700 rounded"></div>
              <div className="w-6 h-6 bg-gray-700 rounded"></div>
            </div>
            <div className="w-6 h-6 bg-gray-700 rounded"></div>
          </div>
          <div className="h-4 w-20 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 w-3/4 bg-gray-700 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const PostSkeleton = () => (
  <div className="min-h-screen bg-black text-white p-4">
    {/* Top Navigation */}
    <div className="flex justify-between items-center mb-6">
      <div className="w-8 h-8 bg-[#ae52e3]"></div>
      <div className="w-8 h-8 bg-white rounded"></div>
    </div>

    {/* Welcome Text */}
    <div className="mb-6">
      <div className="text-xl font-medium mb-2">Good morning, username</div>
      <div className="text-gray-400 text-sm mb-1">You have XX unread notifications</div>
      <div className="text-gray-400 text-sm">You have XX follow requests</div>
    </div>

    {/* Placeholder Images */}
    <div className="space-y-4">
      <div className="w-full aspect-square bg-[#1a1a1a] rounded-lg"></div>
      <div className="w-full aspect-square bg-[#1a1a1a] rounded-lg"></div>
    </div>
  </div>
);

export const UserSuggestionSkeleton = () => (
  <div className="flex items-center p-4 animate-pulse">
    <div className="h-10 w-10 rounded-full bg-gray-700"></div>
    <div className="ml-3 flex-grow">
      <div className="h-4 w-24 bg-gray-700 rounded mb-1"></div>
      <div className="h-3 w-32 bg-gray-700 rounded"></div>
    </div>
    <div className="h-8 w-20 bg-gray-700 rounded"></div>
  </div>
);
