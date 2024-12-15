import React from 'react';
import { BeakerRegular } from '@fluentui/react-icons';

const Chat = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 pt-20">
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <BeakerRegular className="w-16 h-16 mx-auto text-blue-500" />
          <h2 className="text-2xl font-semibold text-gray-800">Coming Soon!</h2>
          <p className="text-gray-600 max-w-md">
            Our chat feature is currently under development. We're working hard to bring you a secure and seamless messaging experience with end to end encryption.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chat;