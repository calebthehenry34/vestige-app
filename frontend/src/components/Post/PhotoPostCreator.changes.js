/**
 * PhotoPostCreator.js Changes
 * Line numbers reference the original file
 */

// Line 1: Add missing imports
import { useCallback, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// Lines 15-20: Add loading state and error handling
const PhotoPostCreator = ({ onBack, onPublish, user }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

// Lines 984-994: Fix missing img tag in reorder modal
// Replace the entire motion.div content with:
<motion.div
  key={img.preview}
  drag
  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
  dragElastic={1}
  className={`relative aspect-square rounded-lg overflow-hidden cursor-move
    ${currentImageIndex === idx ? 'ring-2 ring-pink-500' : ''}`}
  whileDrag={{
    scale: 1.1,
    zIndex: 50,
    transition: { duration: 0.2 }
  }}
  onDragEnd={/* existing onDragEnd handler */}
  data-image-index={idx}
>
  <img
    src={img.preview}
    alt={`Preview of uploaded post ${idx + 1} - Click and drag to reorder`}
    className="w-full h-full object-cover pointer-events-none"
    onError={(e) => {
      console.error('Error loading thumbnail:', e);
      setError('Failed to load image thumbnail');
    }}
  />
  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
    <span className="text-white text-sm">#{idx + 1}</span>
  </div>
</motion.div>

// Line 249: Fix horizontal scrolling in filter controls
// Replace:
<div className="flex    gap-6 py-4 px-2">
// With:
<div className="flex gap-6 py-4 px-2">

// Line 456: Memoize handleFilterChange
const handleFilterChange = useCallback((type, value, preset = null) => {
  if (preset) {
    setImageFilters(preset);
    setImages(prev => prev.map((img, idx) => 
      idx === currentImageIndex 
        ? { ...img, filters: preset }
        : img
    ));
    return;
  }

  const adjustedValue = Number(value) + 100;
  const newFilters = {
    ...imageFilters,
    [type]: adjustedValue
  };
  
  setImageFilters(newFilters);
  setImages(prev => prev.map((img, idx) => 
    idx === currentImageIndex 
      ? { ...img, filters: newFilters }
      : img
  ));
}, [currentImageIndex, imageFilters]);

// Line 600: Add loading indicator during image processing
// Add before handlePublish function:
const LoadingOverlay = () => (
  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
  </div>
);

// Line 620: Update handlePublish with loading state
const handlePublish = async () => {
  try {
    setIsProcessing(true);
    setError(null);
    // ... existing processing code ...
    await onPublish({
      type: 'photo',
      images: processedImages,
      caption: formatCaption(caption),
      location
    });
  } catch (err) {
    setError('Failed to publish post. Please try again.');
    console.error('Publish error:', err);
  } finally {
    setIsProcessing(false);
  }
};

// Line 700: Add error display
// Add after the main content div:
{error && (
  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-4">
    <p className="text-red-500 text-sm">{error}</p>
  </div>
)}

// Line 800: Add accessibility improvements to controls
// Update the adjustment controls:
<button
  onClick={() => setActiveAdjustment(activeAdjustment === name ? null : name)}
  className={`p-3 rounded-full ${
    activeAdjustment === name ? 'bg-white/20' : 'bg-white/5'
  } hover:bg-white/10 transition-colors`}
  aria-label={`Adjust ${name}`}
  aria-pressed={activeAdjustment === name}
>
  <div className="text-white/70">{icon}</div>
</button>

// Line 900: Add loading overlay during processing
// Add before the closing div of the main component:
{isProcessing && <LoadingOverlay />}
