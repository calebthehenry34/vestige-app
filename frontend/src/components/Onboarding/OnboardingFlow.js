import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Theme, Button, Checkbox, Tile } from '@carbon/react';
import { ErrorFilled } from '@carbon/icons-react';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';
import ImageEditor from '../Post/ImageEditor';

const OnboardingFlow = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    profilePicture: null,
    username: user?.username || '',
    bio: '',
    acceptedGuidelines: false
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showImageEditor, setShowImageEditor] = useState(false);

  const handleImageUpload = (e) => {
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

  const handleImageSave = async ({ croppedImage }) => {
    try {
      // Convert base64 to blob for upload
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

  const handleNext = () => {
    if (step === 1) {
      if (!formData.profilePicture || !formData.bio) {
        setError('Profile picture and bio are required');
        return;
      }
      
      if (formData.bio.length > 150) {
        setError('Bio must be 150 characters or less');
        return;
      }
    }
    
    setError('');
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
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
      console.log('Onboarding complete:', data);
  
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

  return (
    <Theme theme="g100">
      <div className="h-screen bg-black">
        {/* Progress Steps */}
        <div className="w-full bg-[#262626] px-4 py-3">
          <div className="max-w-[250px] mx-auto"> 
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <div className={`flex items-center ${step >= 1 ? 'text-white' : ''}`}>
                <div className={`font-headlines w-2 h-2 rounded-full mr-2 ${step >= 1 ? 'bg-[#ae52e3]' : 'bg-gray-500'}`} />
                Profile
              </div>
              <div className={`flex items-center ${step >= 2 ? 'text-white' : ''}`}>
                <div className={`font-headlines w-2 h-2 rounded-full mr-2 ${step >= 2 ? 'bg-[#ae52e3]' : 'bg-gray-500'}`} />
                Guidelines
              </div>
              <div className={`flex items-center ${step >= 3 ? 'text-white' : ''}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${step >= 3 ? 'bg-[#ae52e3]' : 'bg-gray-500'}`} />
                Complete
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[400px] mx-auto px-4 py-8 rounded-lg onboard-card">
          {error && (
            <div className="text-white mb-6 p-4 flex items-start gap-3">
              <ErrorFilled className="text-[#da1e28] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="font-headlines text-2xl font-md text-center text-white mb-10">Set Up Your Profile</h2>
              
              {showImageEditor && previewUrl ? (
                <ImageEditor
                  image={previewUrl}
                  onSave={handleImageSave}
                  onBack={() => setShowImageEditor(false)}
                />
              ) : (
                <>
                  <label htmlFor="profile-upload" className="cursor-pointer block">
                    <div className="w-full h-full mx-auto bg-[#262626] flex items-center justify-center hover:bg-[#333333] transition-colors overflow-hidden">
                      {previewUrl ? (
                        <img 
                          src={previewUrl} 
                          alt="Profile preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-[#525252] flex items-center justify-center">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                            <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#A8A8A8"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-center text-gray-400 mt-2">Click to upload profile picture</p>
                  </label>

                  <input
                    type="file"
                    id="profile-upload"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  <div className="space-y-4 mt-8">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-400">
                        Username
                      </label>
                      <p className="text-white text-lg">{formData.username}</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-400">
                        Bio
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Write a short bio..."
                        className="w-full h-24 px-4 py-3 bg-[#262626] text-white rounded-lg resize-none focus:ring-2 focus:ring-[#ae52e3] focus:outline-none"
                        maxLength={150}
                      />
                      <p className="text-sm text-gray-400 text-right">
                        {formData.bio.length}/150
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="font-headlines text-center text-2xl font-md text-white">Community Guidelines</h2>
              <Tile className="bg-[#262626] rounded-md p-6">
                <div className="text-white">
                  <h4 className="font-medium mb-4">Our Community Standards</h4>
                  <ul className="font-medium space-y-2 text-gray-400">
                    <li>Be respectful and kind to others</li>
                    <li>No hate speech or bullying</li>
                    <li>Protect your privacy and others'</li>
                    <li>Share appropriate content only</li>
                  </ul>
                </div>
              </Tile>
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
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="font-headlines text-center text-2xl font-md text-white">You're All Set!</h2>
              <Tile className="bg-[#262626] rounded-md p-6">
                <div className="space-y-4">
                  <p className="font-medium text-gray-200">
                    Welcome to Vestige beta! You currently have access to all features 
                    free of charge while we're in beta testing. <br></br><br></br>Please remember that features may not work as expected
                    and we need your help. <br></br><br></br>If you find a problem, email support@vestigeapp.com and we'll fix it.
                  </p>
                </div>
              </Tile>
            </div>
          )}

          {!showImageEditor && (
            <div className="flex flex-col space-y-4 mt-8 text-white button-border">
              {step < 3 ? (
                <Button
                  onClick={handleNext}
                  disabled={loading || (step === 2 && !formData.acceptedGuidelines)}
                  style={{
                    width: '100%',
                    backgroundColor: '#ae52e3',
                    minHeight: '60px',
                    borderRadius: '5px'
                  }}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={loading}
                  style={{
                    width: '100%',
                    backgroundColor: '#ae52e3',
                    minHeight: '60px',
                    borderRadius: '5px'
                  }}
                >
                  {loading ? 'Completing...' : 'Got It!'}
                </Button>
              )}
              {step > 1 && (
                <Button
                  kind="secondary"
                  onClick={handleBack}
                  disabled={loading}
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    borderRadius: '5px'
                  }}
                >
                  Back
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Theme>
  );
};

export default OnboardingFlow;
