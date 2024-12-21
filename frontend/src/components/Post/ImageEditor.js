import React, { useState, useRef } from 'react';
import { WeatherSunnyRegular, CircleRegular, ColorFillRegular } from '@fluentui/react-icons';

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
  const [selectedFilter, setSelectedFilter] = useState('Normal');
  const [adjustments, setAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100
  });
  const [activeAdjustment, setActiveAdjustment] = useState(null);
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
            `
          }}
        />
      </div>

      {/* Bottom Controls */}
      <div className="bg-[#1a1a1a] border-t border-[#333333]">
        {/* Filters Section */}
        <div className="p-4 pb-2">
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

        {/* Adjustments Section */}
        <div className="p-4 pt-2">
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveAdjustment(activeAdjustment === 'brightness' ? null : 'brightness')}
                className={`p-2 rounded-full ${
                  activeAdjustment === 'brightness' ? 'bg-[#ae52e3]' : 'bg-[#262626]'
                }`}
              >
                <WeatherSunnyRegular className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => setActiveAdjustment(activeAdjustment === 'contrast' ? null : 'contrast')}
                className={`p-2 rounded-full ${
                  activeAdjustment === 'contrast' ? 'bg-[#ae52e3]' : 'bg-[#262626]'
                }`}
              >
                <CircleRegular className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => setActiveAdjustment(activeAdjustment === 'saturation' ? null : 'saturation')}
                className={`p-2 rounded-full ${
                  activeAdjustment === 'saturation' ? 'bg-[#ae52e3]' : 'bg-[#262626]'
                }`}
              >
                <ColorFillRegular className="w-5 h-5 text-white" />
              </button>
            </div>

            {activeAdjustment && (
              <div className="flex-1 flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={adjustments[activeAdjustment]}
                  onChange={(e) => handleAdjustmentChange(activeAdjustment, parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-white text-xs w-8">{adjustments[activeAdjustment]}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
