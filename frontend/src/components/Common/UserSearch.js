// src/components/Common/UserSearch.js
import React from 'react';
import { PersonRegular, DismissRegular } from '@fluentui/react-icons';

const UserSearch = ({ onTagUser, onRemoveTag, taggedUsers }) => {
  return (
    <div className="space-y-2">
      <div className="relative">
        <PersonRegular className="absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Tag people..."
          className="w-full pl-10 p-3 rounded-lg border bg-transparent"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {taggedUsers.map(user => (
          <span key={user.id} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            {user.username}
            <button onClick={() => onRemoveTag(user.id)}>
              <DismissRegular className="w-4 h-4" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default UserSearch;