// src/components/Common/LocationAutocomplete.js
import React from 'react';
import { LocationLiveFilled } from '@fluentui/react-icons';

const LocationAutocomplete = ({ onSelectLocation }) => {
  return (
    <div className="relative">
      <div className="flex items-center">
        <LocationLiveFilled className="absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Add location..."
          className="w-full pl-10 p-3 rounded-lg border bg-transparent"
          onChange={(e) => onSelectLocation(e.target.value)}
        />
      </div>
    </div>
  );
};

export default LocationAutocomplete;