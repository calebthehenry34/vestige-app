import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Theme, Button, Checkbox, } from '@carbon/react';
import { ErrorFilled, Add } from '@carbon/icons-react';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';
import ProfileImageEditor from './ProfileImageEditor';
import styles from './OnboardingFlow.module.css';

const StepIndicator = ({ step, label }) => (
  <div className="flex-1 text-center">
    <div className="px-4 py-2">
      <span className="text-white/60 text-sm">Step {step}:</span>
      <span className="text-white ml-1 text-sm font-medium">{label}</span>
    </div>
  </div>
);

const OnboardingFlow = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slideDirection, setSlideDirection] = useState('');
  const [formData, setFormData] = useState({
    profilePicture: null,
    username: user?.username || '',
    bio: '',
    acceptedGuidelines: false
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showImageEditor, setShowImageEditor] = useState(false);

  // Auto-dismiss error after 3 seconds
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
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
        setShowImageEditor(true);
      };
      reader.readAsDataURL(file);
    }
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

  const handleNext = () => {
    if (step === 1) {
      if (!formData.profilePicture || !formData.bio) {
        setError('Profile picture and bio are required');
        return;
      }
    }
    
    setError('');
    if (step < 4) {
      setSlideDirection(styles.slideLeft);
      setTimeout(() => {
        setStep(step + 1);
        setSlideDirection(styles.slideCurrent);
      }, 300);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      const formDataToSend = new FormData();
      if (!formData.profilePicture || !formData.bio) {
        throw new Error('Missing required profile information');
      }
  
      formDataToSend.append('profilePicture', formData.profilePicture);
      formDataToSend.append('bio', formData.bio);
      formDataToSend.append('onboardingComplete', 'true');
  
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
  
      const response = await fetch(API_URL + '/api/profile/complete-onboarding', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete onboarding');
      }
  
      const data = await response.json();
  
      await updateUser({ 
        ...user,
        bio: formData.bio,
        profilePicture: data.user.profilePicture,
        onboardingComplete: true
      });
  
      const currentUserData = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...currentUserData,
        bio: formData.bio,
        profilePicture: data.user.profilePicture,
        onboardingComplete: true
      }));
  
      navigate('/');
    } catch (error) {
      console.error('Onboarding error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderNavigation = () => (
    <div className="p-6 border-b border-[#333333] flex items-center gap-4">
      <StepIndicator step={step} label={getStepLabel()} />
      <Button
        onClick={step < 4 ? handleNext : handleComplete}
        disabled={loading || (step === 2 && !formData.acceptedGuidelines)}
        style={{
          backgroundColor: '#ae52e3',
          minHeight: '44px',
          borderRadius: '5px',
          minWidth: '140px',
          padding: '0 24px'
        }}
      >
        {step < 4 ? 'Continue' : (loading ? 'Completing...' : 'Got It!')}
      </Button>
    </div>
  );

  const getStepLabel = () => {
    switch (step) {
      case 1: return "Setup Profile";
      case 2: return "Community Guidelines";
      case 3: return "Choose Plan";
      case 4: return "Complete Setup";
      default: return "";
    }
  };

  const renderCard = () => {
    const cardClass = `${styles.card} ${slideDirection} rounded-2xl`;

    if (step === 1) {
      return (
        <div className={cardClass}>
          {showImageEditor && previewUrl ? (
            <ProfileImageEditor
              image={previewUrl}
              onSave={handleImageSave}
              onBack={() => setShowImageEditor(false)}
            />
          ) : (
            <div className="relative h-full">
              <div className="absolute inset-0">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={formData.username || 'Profile'}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center rounded-2xl">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-[#525252] flex items-center justify-center mx-auto">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                          <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#A8A8A8"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
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
                  <Add className="w-8 h-8 text-white" />
                </button>
              </div>

              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60 pointer-events-none rounded-2xl" />
              
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

    if (step === 2) {
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
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className={cardClass}>
          <div className="relative h-full bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] p-6 rounded-2xl">
            <div className="h-full flex flex-col">
              <div className="w-full max-w-md mx-auto space-y-6">
                <div className="text-left mb-8">
                  <h2 className="text-2xl font-headlines text-white mb-2">Free Beta Access</h2>
                  <p className="text-gray-400">Get early access to all features during our beta period</p>
                </div>
                <div className="bg-black/30 rounded-lg p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#ae52e3] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/>
                        </svg>
                      </div>
                      <span className="text-white">Full access to all features</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#ae52e3] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/>
                        </svg>
                      </div>
                      <span className="text-white">Early adopter benefits</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#ae52e3] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/>
                        </svg>
                      </div>
                      <span className="text-white">Help shape the future</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={cardClass}>
        <div className="relative h-full bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] p-6 rounded-2xl">
          <div className="h-full flex flex-col">
            <div className="w-full space-y-6">
              <div className="bg-black/30 rounded-lg p-6">
                <div className="space-y-4">
                  <p className="font-medium text-gray-200">
                    Welcome to Vestige beta! You currently have access to all features 
                    free of charge while we're in beta testing. <br/><br/>
                    Please remember that features may not work as expected
                    and we need your help. <br/><br/>
                    If you find a problem, email support@vestigeapp.com and we'll fix it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Theme theme="g100">
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-headlines">
        <div className="w-[85vw] h-[80vh] bg-[#262626] rounded-2xl flex flex-col">
          {renderNavigation()}
          <div className={styles.cardContainer}>
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
