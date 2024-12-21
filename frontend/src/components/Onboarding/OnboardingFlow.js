import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Theme, Checkbox } from '@carbon/react';
import { ErrorFilled, Add, ArrowRight, Reset } from '@carbon/icons-react';
import { useAuth } from '../../context/AuthContext';
import { useStripe } from '../../context/StripeContext';
import { API_URL } from '../../config';
import ProfileImageEditor from './ProfileImageEditor';
import UserSuggestions from '../Explore/UserSuggestions';
import styles from './OnboardingFlow.module.css';

const StepIndicator = ({ label }) => (
  <div className="text-gray-200 text-sm font-medium">
    {label}
  </div>
);

const OnboardingFlow = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slideDirection, setSlideDirection] = useState('');
  const [nextStep, setNextStep] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    city: '',
    state: '',
    profilePicture: null,
    username: user?.username || '',
    bio: '',
    acceptedGuidelines: false
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showImageEditor, setShowImageEditor] = useState(false);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleImageUpload = (e) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
      setShowImageEditor(true);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = (e) => {
    e.stopPropagation();
    document.getElementById('profile-upload')?.click();
  };

  const handleImageSave = async ({ croppedImage }) => {
    try {
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
      
      setFormData(prev => ({ ...prev, profilePicture: file }));
      setPreviewUrl(croppedImage);
      setShowImageEditor(false);
    } catch (error) {
      console.error('Error saving cropped image:', error);
      setError('Failed to process image');
    }
  };

  const handleBioChange = (e) => {
    const textarea = e.target;
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
    const lines = Math.floor(textarea.scrollHeight / lineHeight);
    
    if (lines <= 2) {
      setFormData(prev => ({ ...prev, bio: textarea.value }));
    }
  };

  const { setupBetaSubscription } = useStripe();

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.city || !formData.state) {
        setError('All fields are required');
        return;
      }
    }

    if (step === 2) {
      if (!formData.profilePicture || !formData.bio) {
        setError('Profile picture and bio are required');
        return;
      }
    }

    if (step === 4) {
      try {
        setLoading(true);
        await setupBetaSubscription();
      } catch (error) {
        setError(error.message || 'Failed to setup beta subscription');
        return;
      } finally {
        setLoading(false);
      }
    }
    
    setError('');
    if (step < 5) {
      setSlideDirection(styles.slideLeft);
      const nextStepValue = step + 1;
      setNextStep(nextStepValue);
      setTimeout(() => {
        setStep(nextStepValue);
        setSlideDirection(styles.slideNext);
      }, 300);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setSlideDirection(styles.slideRight);
      const prevStepValue = step - 1;
      setNextStep(prevStepValue);
      setTimeout(() => {
        setStep(prevStepValue);
        setSlideDirection(styles.slideNext);
      }, 300);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      setError('');

      if (!formData.profilePicture || !formData.bio) {
        throw new Error('Missing required profile information');
      }
  
      const formDataToSend = new FormData();
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('dateOfBirth', formData.dateOfBirth);
      formDataToSend.append('city', formData.city);
      formDataToSend.append('state', formData.state);
      formDataToSend.append('profilePicture', formData.profilePicture);
      formDataToSend.append('bio', formData.bio);
      formDataToSend.append('onboardingComplete', 'true');
  
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Sending onboarding request to:', `${API_URL}/api/profile/complete-onboarding`);
      
      const response = await fetch(`${API_URL}/api/profile/complete-onboarding`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: formDataToSend,
        mode: 'cors'
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);
  
      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || 'Failed to complete onboarding';
        } catch (e) {
          errorMessage = responseText || 'Failed to complete onboarding';
        }
        throw new Error(errorMessage);
      }
  
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Invalid response from server');
      }
  
      // Update user context with all the new information
      await updateUser({ 
        ...user,
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        city: formData.city,
        state: formData.state,
        bio: formData.bio,
        profilePicture: data.user.profilePicture,
        onboardingComplete: true
      });
  
      // Update local storage with all the new information
      const currentUserData = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...currentUserData,
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        city: formData.city,
        state: formData.state,
        bio: formData.bio,
        profilePicture: data.user.profilePicture,
        onboardingComplete: true
      }));
  
      // Navigate to home
      navigate('/');
    } catch (error) {
      console.error('Onboarding error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStepLabel = () => {
    switch (step) {
      case 1: return "Basic Info";
      case 2: return "Setup Profile";
      case 3: return "Guidelines";
      case 4: return "Choose Plan";
      case 5: return "Complete Setup";
      default: return "";
    }
  };

  const renderNavigation = () => (
    <div className="card-header p-6 border-b border-[#262626] grid grid-cols-3 items-center">
      <div className="flex items-center">
        <img src="/logos/logo.svg" alt="Vestige" className="h-8" />
      </div>
      <div className="flex text-xs justify-center">
        <StepIndicator label={getStepLabel()} />
      </div>
      <div className="flex justify-end">
        <button
          onClick={step < 5 ? handleNext : handleComplete}
          disabled={loading || (step === 3 && !formData.acceptedGuidelines)}
          className="w-10 h-10 rounded-md border-2 border-[#262626] bg-transparent hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <ArrowRight className="w-5 h-5 text-gray" />
          )}
        </button>
      </div>
    </div>
  );

  const renderBackButton = () => {
    if (step === 1) return null;
    
    return (
      <button
        onClick={handleBack}
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white/60 hover:text-white transition-colors"
      >
        Back
      </button>
    );
  };

  const renderStepContent = (currentStep) => {
    const cardClass = `${styles.card} rounded-2xl`;

    if (currentStep === 1) {
      return (
        <div className={cardClass}>
          <div className="relative h-full bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] p-6 rounded-2xl">
            <div className="h-full flex flex-col">
              <div className="w-full max-w-2xl mx-auto space-y-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white mb-2">First Name</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full px-4 py-2 bg-black/30 text-white border border-white/30 focus:border-white rounded-lg focus:outline-none"
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <label className="block text-white mb-2">Last Name</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full px-4 py-2 bg-black/30 text-white border border-white/30 focus:border-white rounded-lg focus:outline-none"
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-white mb-2">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      className="w-full px-4 py-2 bg-black/30 text-white border border-white/30 focus:border-white rounded-lg focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white mb-2">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-4 py-2 bg-black/30 text-white border border-white/30 focus:border-white rounded-lg focus:outline-none"
                        placeholder="Enter city"
                      />
                    </div>
                    <div>
                      <label className="block text-white mb-2">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full px-4 py-2 bg-black/30 text-white border border-white/30 focus:border-white rounded-lg focus:outline-none"
                        placeholder="Enter state"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {renderBackButton()}
          </div>
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className={cardClass}>
          {showImageEditor && previewUrl ? (
            <ProfileImageEditor
              image={previewUrl}
              onSave={handleImageSave}
              onBack={() => setShowImageEditor(false)}
            />
          ) : (
            <div className="w-full h-full relative">
              {/* Background/Image Layer */}
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={formData.username || 'Profile'}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center rounded-2xl">
                  <div className="w-20 h-20 rounded-full bg-[#525252] flex items-center justify-center">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                      <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#A8A8A8"/>
                    </svg>
                  </div>
                </div>
              )}

              {/* Upload Button Layer */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
                <input
                  type="file"
                  id="profile-upload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  onClick={(e) => e.stopPropagation()}
                  className="hidden"
                />
                <button 
                  onClick={handleUploadClick}
                  className="w-16 h-16 rounded-full bg-black/50 hover:bg-black/70 cursor-pointer transition-colors flex items-center justify-center"
                >
                  {previewUrl ? (
                    <Reset className="w-8 h-8 text-white" />
                  ) : (
                    <Add className="w-8 h-8 text-white" />
                  )}
                </button>
              </div>

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60 pointer-events-none rounded-2xl" />
              
              {/* Content Layer */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex justify-between items-start">
                  <h1 className="text-2xl font-headlines text-white">{formData.username}</h1>
                </div>
                
                <div className="mt-4">
                  <textarea
                    value={formData.bio}
                    onChange={handleBioChange}
                    placeholder="Write a short bio..."
                    className="w-full px-0 py-1 bg-transparent text-white border-b border-white/30 focus:border-white resize-none focus:outline-none text-md"
                    rows={2}
                    style={{
                      overflow: 'hidden',
                      lineHeight: '1.5'
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (currentStep === 3) {
      return (
        <div className={cardClass}>
          <div className="relative h-full bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] p-6 rounded-2xl">
            <div className="h-full flex flex-col">
              <div className="w-full space-y-6">
                <div className="bg-black/30 rounded-lg p-6">
                  <div className="text-white">
                    <h4 className="font-medium mb-4">Our Community Standards</h4>
                    <ul className="font-medium space-y-4 text-gray-300">
                      <li>Be respectful and kind to others</li>
                      <li>No hate speech or bullying</li>
                      <li>Protect your privacy and others'</li>
                      <li>Share appropriate content only</li>
                    </ul>
                  </div>
                </div>
                <div className="pt-4">
                  <Checkbox
                    labelText={<span style={{ color: 'white' }}>I agree to follow the community guidelines</span>}
                    id="guidelines"
                    checked={formData.acceptedGuidelines}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      acceptedGuidelines: e.target.checked 
                    })}
                  />
                </div>
              </div>
            </div>
            {renderBackButton()}
          </div>
        </div>
      );
    }

    if (currentStep === 4) {
      return (
        <div className={cardClass}>
          <div className="relative h-full bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] p-6 rounded-2xl">
            <div className="h-full flex flex-col">
              <div className="w-full max-w-2xl mx-auto space-y-6">
                <div className="flex flex-col gap-4">
                  {/* Beta Access Plan */}
                  <div className={`${styles.pricingCard} ${styles.active} p-8`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-headlines text-white mb-1">Beta Access</h3>
                        <p className="text-gray-400 text-sm">Early adopter benefits</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">Free</div>
                        <p className="text-gray-400 text-sm">Limited time</p>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Plan */}
                  <div className={`${styles.pricingCard} ${styles.disabled} p-8`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-headlines text-white mb-1">Monthly</h3>
                        <p className="text-gray-400 text-sm">Full access</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">$7.99<span className="text-gray-400 text-sm">/mo</span></div>
                        <p className="text-gray-400 text-sm">Coming soon</p>
                      </div>
                    </div>
                  </div>

                  {/* Annual Plan */}
                  <div className={`${styles.pricingCard} ${styles.disabled} p-8`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-headlines text-white mb-1">Annual</h3>
                        <p className="text-gray-400 text-sm">Save 22%</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">$74.99<span className="text-gray-400 text-sm">/yr</span></div>
                        <p className="text-gray-400 text-sm">Coming soon</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {renderBackButton()}
          </div>
        </div>
      );
    }

    return (
      <div className={cardClass}>
        <div className="relative h-full bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] p-6 rounded-2xl">
          <div className="h-full flex flex-col">
            <UserSuggestions />
          </div>
          {renderBackButton()}
        </div>
      </div>
    );
  };

  const renderCard = () => {
    return (
      <>
        <div className={`${styles.cardContainer} ${slideDirection}`}>
          {renderStepContent(step)}
        </div>
        {nextStep && (
          <div className={`${styles.cardContainer} ${styles.slideNext}`} style={{ zIndex: -1 }}>
            {renderStepContent(nextStep)}
          </div>
        )}
      </>
    );
  };

  return (
    <Theme theme="g100">
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-headlines">
        <div className="w-[85vw] h-[80vh] bg-[#262626] rounded-2xl flex flex-col">
          {renderNavigation()}
          <div className="flex-1 relative overflow-hidden">
            {renderCard()}
          </div>

          {error && (
            <div className="fixed bottom-4 left-4 right-4 bg-red-500/90 text-white p-4 rounded-lg backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <ErrorFilled className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Error</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Theme>
  );
};

export default OnboardingFlow;
