import React, { useState, useRef } from 'react';
import { BrightnessRegular, ContrastRegular, ColorRegular } from '@fluentui/react-icons';

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
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const filtersContainerRef = useRef(null);

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
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const filter = filters.find(f => f.name === selectedFilter)?.filter || '';
      await onSave({ 
        filter, 
        adjustments: {
          brightness: adjustments.brightness,
          contrast: adjustments.contrast,
          saturation: adjustments.saturation
        }
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Error saving image:', error);
    } finally {
      setLoading(false);
    }
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

      {/* Filters Section */}
      <div className="bg-[#1a1a1a] p-4">
        <h3 className="text-white text-sm mb-2">Filters</h3>
        <div className="relative">
          <button
            onClick={() => handleFilterScroll('left')}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 p-2 rounded-full text-white"
          >
            ←
          </button>
          <div
            ref={filtersContainerRef}
            className="flex overflow-x-auto hide-scrollbar space-x-4 relative"
          >
            {filters.map(filter => (
              <div
                key={filter.name}
                onClick={() => setSelectedFilter(filter.name)}
                className={`flex-shrink-0 cursor-pointer ${
                  selectedFilter === filter.name ? 'border-2 border-[#ae52e3]' : ''
                }`}
              >
                <div className="w-20 h-20 relative">
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
      <div className="bg-[#1a1a1a] p-4">
        <h3 className="text-white text-sm mb-2">Adjustments</h3>
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveAdjustment(activeAdjustment === 'brightness' ? null : 'brightness')}
            className={`p-2 rounded-full ${
              activeAdjustment === 'brightness' ? 'bg-[#ae52e3]' : 'bg-[#262626]'
            }`}
          >
            <BrightnessRegular className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={() => setActiveAdjustment(activeAdjustment === 'contrast' ? null : 'contrast')}
            className={`p-2 rounded-full ${
              activeAdjustment === 'contrast' ? 'bg-[#ae52e3]' : 'bg-[#262626]'
            }`}
          >
            <ContrastRegular className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={() => setActiveAdjustment(activeAdjustment === 'saturation' ? null : 'saturation')}
            className={`p-2 rounded-full ${
              activeAdjustment === 'saturation' ? 'bg-[#ae52e3]' : 'bg-[#262626]'
            }`}
          >
            <ColorRegular className="w-6 h-6 text-white" />
          </button>
        </div>

        {activeAdjustment && (
          <div className="mt-4">
            <input
              type="range"
              min="0"
              max="200"
              value={adjustments[activeAdjustment]}
              onChange={(e) => handleAdjustmentChange(activeAdjustment, parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-white text-xs mt-1">
              <span>0%</span>
              <span>{adjustments[activeAdjustment]}%</span>
              <span>200%</span>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="bg-[#1a1a1a] p-4">
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-[#ae52e3] text-white py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Next'}
        </button>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg">
          Changes saved successfully!
        </div>
      )}
    </div>
  );
};

export default ImageEditor;
