import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Theme,
  Button,
  Checkbox,
  Tile,
  TextArea
} from '@carbon/react';
import { ErrorFilled} from '@carbon/icons-react';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';

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

  const handleImageUpload = (e) => {
    const file = e.target?.files?.[0];
    if (file) {
      setFormData({ ...formData, profilePicture: file });
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.profilePicture || !formData.bio) {
        setError('All fields are required');
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
  
      // Update user context with all the new data
      await updateUser({ 
        ...user,
        bio: formData.bio,
        profilePicture: data.user.profilePicture, // Use the filename from server response
        onboardingComplete: true
      });
  
      // Also update localStorage
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
          <div className="max-w-[250px] mx-auto "> 
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
        <div className={`max-w-[400px] mx-auto px-4 py-8 rounded-lg onboard-card`}>
          {error && (
            <div className="text-white mb-6 p-4 flex items-start gap-3">
              <ErrorFilled className="text-[#da1e28] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Error</p>
                <p>Failed to complete onboarding</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="font-headlines text-2xl font-md text-center text-white mb-10">Set Up Your Profile</h2>
              <label htmlFor="profile-upload" className="cursor-pointer">
                <div className="w-64 h-64 mx-auto bg-[#262626] rounded-lg flex items-center justify-center hover:bg-[#333333] transition-colors">
                  {previewUrl ? (
                    <img 
                      src={previewUrl} 
                      alt="Profile preview" 
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#525252] flex items-center justify-center">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                        <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#A8A8A8"/>
                      </svg>
                    </div>
                  )}
                </div>
              </label>
              <div className="space-y-1">
                <p className="font-medium text-md text-gray-400 text-center">{formData.username}</p>
              </div>

              <input
                type="file"
                id="profile-upload"
                accept=".jpg,.png,.gif"
                onChange={handleImageUpload}
                className="hidden"
              />

              <TextArea
                id="bio"
                labelText="Introduce yourself"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                style={{
                  backgroundColor: '#000',
                  borderBottom: '1px solid #525252',
                  color: 'white',
                  minHeight: '100px',
                  marginTop:'10px',
                  paddingTop: '10px',
                  paddingBottom: '5px',
                  paddingLeft: '3px',
                }}
                placeholder="Less is more. In this case, use less than 150 words."
                maxLength={150}
                enableCounter={true}
                required
              />
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
                <div className="space-y-4 ">
                  <p className="font-medium text-gray-200">
                    Welcome to Vestige beta! You currently have access to all features 
                    free of charge while we're in beta testing. <br></br><br></br>Please remember that features may not work as expected
                    and we need your help. <br></br><br></br>If you find a problem, email support@vestigeapp.com and we'll fix it.
                  </p>
                </div>
              </Tile>
            </div>
          )}

          <div className="flex flex-col space-y-4 mt-8 text-white button-borderbutton-border">
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
        </div>
      </div>
    </Theme>
  );
};

export default OnboardingFlow;
