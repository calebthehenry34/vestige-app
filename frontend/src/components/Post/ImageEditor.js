import React, { useState, useRef } from 'react';
import { WeatherSunnyRegular, CircleRegular, ColorFillRegular, WeatherMoonRegular } from '@fluentui/react-icons';

const filters = [
  { name: 'Normal', filter: '' },
  { name: 'Clarendon', filter: 'saturate(1.2) contrast(1.2)' },
  { name: 'Gingham', filter: 'sepia(0.15) contrast(1.1)' },
  { name: 'Moon', filter: 'grayscale(1)' },
  { name: 'Lark', filter: 'brightness(1.1) saturate(1.1)' },
  { name: 'Reyes', filter: 'sepia(0.3) brightness(1.1)' },
  { name: 'Juno', filter: 'saturate(1.3) contrast(1.1)' },
  { name: 'Slumber', filter: 'sepia(0.2) brightness(1.05)' },
  { name: 'Crema', filter: 'sepia(0.25) brightness(1.15)' },
  { name: 'Ludwig', filter: 'saturate(1.2) contrast(1.05)' },
  { name: 'Aden', filter: 'sepia(0.2) brightness(1.15) saturate(1.1)' },
  { name: 'Perpetua', filter: 'brightness(1.05) saturate(1.1)' }
];

const ImageEditor = ({ image, onSave }) => {
  const [activeTab, setActiveTab] = useState('filters');
  const [selectedFilter, setSelectedFilter] = useState('Normal');
  const [adjustments, setAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    temperature: 100
  });
  const filtersContainerRef = useRef(null);

  if (!image || typeof image !== 'string') {
    console.error('Invalid image format provided to ImageEditor');
    return null;
  }

  const handleFilterScroll = (direction) => {
    if (filtersContainerRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      filtersContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleAdjustmentChange = (type, value) => {
    setAdjustments(prev => ({
      ...prev,
      [type]: value
    }));
    // Auto-save adjustments
    const filter = filters.find(f => f.name === selectedFilter)?.filter || '';
    onSave({ 
      filter, 
      adjustments: {
        ...adjustments,
        [type]: value
      }
    });
  };

  const handleFilterSelect = (filterName) => {
    setSelectedFilter(filterName);
    // Auto-save filter
    const filter = filters.find(f => f.name === filterName)?.filter || '';
    onSave({ 
      filter, 
      adjustments
    });
  };

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Tabs */}
      <div className="flex border-b border-[#333333]">
        <button
          onClick={() => setActiveTab('filters')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'filters' 
              ? 'text-[#ae52e3] border-b-2 border-[#ae52e3]' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Filters
        </button>
        <button
          onClick={() => setActiveTab('adjustments')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'adjustments' 
              ? 'text-[#ae52e3] border-b-2 border-[#ae52e3]' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Adjustments
        </button>
      </div>

      {/* Image Preview */}
      <div className="flex-1 relative">
        <img
          src={image}
          alt="Preview"
          className="w-full h-full object-contain"
          style={{
            filter: `
              ${filters.find(f => f.name === selectedFilter)?.filter || ''}
              brightness(${adjustments.brightness}%)
              contrast(${adjustments.contrast}%)
              saturate(${adjustments.saturation}%)
              sepia(${adjustments.temperature > 100 ? (adjustments.temperature - 100) / 100 : 0})
              hue-rotate(${adjustments.temperature < 100 ? (100 - adjustments.temperature) * 0.5 : 0}deg)
            `
          }}
        />
      </div>

      {/* Bottom Controls */}
      <div className="bg-[#1a1a1a] border-t border-[#333333]">
        {activeTab === 'filters' ? (
          /* Filters Section */
          <div className="p-4">
            <div className="relative">
              <button
                onClick={() => handleFilterScroll('left')}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 p-2 rounded-full text-white"
              >
                ←
              </button>
              <div
                ref={filtersContainerRef}
                className="flex overflow-x-auto hide-scrollbar space-x-4 relative px-8"
              >
                {filters.map(filter => (
                  <div
                    key={filter.name}
                    onClick={() => handleFilterSelect(filter.name)}
                    className={`flex-shrink-0 cursor-pointer ${
                      selectedFilter === filter.name ? 'border-2 border-[#ae52e3]' : ''
                    }`}
                  >
                    <div className="w-16 h-16 relative">
                      <img
                        src={image}
                        alt={filter.name}
                        className="w-full h-full object-cover"
                        style={{ filter: filter.filter }}
                      />
                    </div>
                    <p className="text-white text-xs text-center mt-1">{filter.name}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleFilterScroll('right')}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 p-2 rounded-full text-white"
              >
                →
              </button>
            </div>
          </div>
        ) : (
          /* Adjustments Section */
          <div className="p-4 space-y-4">
            {/* Brightness */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <WeatherSunnyRegular className="w-5 h-5 text-white" />
                  <span className="text-sm text-white">Brightness</span>
                </div>
                <span className="text-white text-xs w-8">{adjustments.brightness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={adjustments.brightness}
                onChange={(e) => handleAdjustmentChange('brightness', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Contrast */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CircleRegular className="w-5 h-5 text-white" />
                  <span className="text-sm text-white">Contrast</span>
                </div>
                <span className="text-white text-xs w-8">{adjustments.contrast}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={adjustments.contrast}
                onChange={(e) => handleAdjustmentChange('contrast', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Saturation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ColorFillRegular className="w-5 h-5 text-white" />
                  <span className="text-sm text-white">Saturation</span>
                </div>
                <span className="text-white text-xs w-8">{adjustments.saturation}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={adjustments.saturation}
                onChange={(e) => handleAdjustmentChange('saturation', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <WeatherMoonRegular className="w-5 h-5 text-white" />
                  <span className="text-sm text-white">Temperature</span>
                </div>
                <span className="text-white text-xs w-8">{adjustments.temperature}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={adjustments.temperature}
                onChange={(e) => handleAdjustmentChange('temperature', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageEditor;
