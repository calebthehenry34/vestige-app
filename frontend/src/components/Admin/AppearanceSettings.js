import React, { useState } from 'react';
import { ChromePicker } from 'react-color';
import { API_URL } from '../../config';

const AppearanceSettings = () => {
  const [theme, setTheme] = useState({
    primary: '#3B82F6',
    secondary: '#1D4ED8',
    background: '#F3F4F6',
    text: '#111827'
  });
  const [selectedFont, setSelectedFont] = useState('Inter');
  const [uploadLimits, setUploadLimits] = useState({
    image: 5, // MB
    video: 100, // MB
    text: 5000 // characters
  });

  const handleColorChange = (color, type) => {
    setTheme(prev => ({
      ...prev,
      [type]: color.hex
    }));
  };

  const handleSaveTheme = async () => {
    try {
      await fetch(API_URL + '/api/admin/appearance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ theme, font: selectedFont, uploadLimits })
      });
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Appearance Settings</h2>

      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Theme Colors</h3>
          <div className="grid grid-cols-2 gap-6">
            {Object.entries(theme).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </label>
                <ChromePicker
                  color={value}
                  onChange={(color) => handleColorChange(color, key)}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4">Font Settings</h3>
          <select
            value={selectedFont}
            onChange={(e) => setSelectedFont(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="Inter">Inter</option>
            <option value="Roboto">Roboto</option>
            <option value="Open Sans">Open Sans</option>
          </select>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4">Upload Limits</h3>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(uploadLimits).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {key.charAt(0).toUpperCase() + key.slice(1)} Limit
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setUploadLimits(prev => ({
                    ...prev,
                    [key]: parseInt(e.target.value)
                  }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSaveTheme}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;