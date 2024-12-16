import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  TextInput,
  Button,
  InlineNotification,
  Theme,
} from '@carbon/react';
import {
  EyeRegular,
  EyeOffRegular
} from '@fluentui/react-icons';
import GradientBackground from '../../components/GradientBackground';
import { API_URL } from '../../config';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    verificationCode: ''
  });
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [usernameStatus, setUsernameStatus] = useState({ valid: false, message: '' });

  // Validate email domain
  const isValidEmail = (email) => {
    if (!email) return false;
    if (email.endsWith('.internal')) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Check username availability with debounce
  useEffect(() => {
    const checkUsername = async () => {
      if (formData.username.length < 3) {
        setUsernameStatus({ valid: false, message: 'Username must be at least 3 characters' });
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/check-username?username=${formData.username}`);
        const data = await response.json();
        
        setUsernameStatus({
          valid: data.available,
          message: data.reason || (data.available ? 'Username is available' : 'Username is not available')
        });
      } catch (error) {
        setUsernameStatus({ valid: false, message: 'Error checking username' });
      }
    };

    const timeoutId = setTimeout(() => {
      if (formData.username) {
        checkUsername();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.username]);

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate email
      if (!isValidEmail(formData.email)) {
        throw new Error('Invalid email address');
      }

      // Validate username
      if (!usernameStatus.valid) {
        throw new Error(usernameStatus.message);
      }

      const response = await fetch(`${API_URL}/api/auth/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: formData.email })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send verification code');

      setStep(2);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setResendDisabled(true);
      let timeLeft = 60;
      setResendTimer(timeLeft);

      const interval = setInterval(() => {
        timeLeft -= 1;
        setResendTimer(timeLeft);
        if (timeLeft === 0) {
          clearInterval(interval);
          setResendDisabled(false);
        }
      }, 1000);

      const response = await fetch(`${API_URL}/api/auth/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: formData.email })
      });

      if (!response.ok) {
        throw new Error('Failed to resend code');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Ensure verification code is 6 digits
      if (!/^\d{6}$/.test(formData.verificationCode)) {
        throw new Error('Please enter a valid 6-digit code');
      }

      // First verify the code
      console.log('Sending verification code:', {
        email: formData.email,
        code: formData.verificationCode
      });

      const verifyResponse = await fetch(`${API_URL}/api/auth/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          code: formData.verificationCode
        })
      });

      const verifyData = await verifyResponse.json();
      console.log('Verification response:', verifyData);

      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Invalid verification code');
      }

      // Then register the user
      const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password
        })
      });

      const data = await registerResponse.json();

      if (!registerResponse.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      await login(data.token, data.user);
      navigate('/onboarding');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Theme theme="g100">
      <GradientBackground>
        <div className="w-full max-w-md px-6 py-8 mx-auto">
          <div className="bg-[#262626] rounded-lg shadow-xl">
            <div className="px-8 pt-8 pb-6">
              <h1 className="text-2xl md:text-3xl font-medium text-white mb-8">
                {step === 1 ? 'Create Account' : 'Verify Email'}
              </h1>

              {error && (
                <InlineNotification
                  kind="error"
                  title="Error"
                  subtitle={error}
                  hideCloseButton
                  className="mb-6"
                />
              )}

              {step === 1 ? (
                <form onSubmit={handleInitialSubmit} className="space-y-6">
                  <TextInput
                    id="email"
                    labelText="Email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    invalid={formData.email && !isValidEmail(formData.email)}
                    invalidText="Please enter a valid email address"
                    style={{
                      backgroundColor: '#262626',
                      borderBottom: '1px solid #525252',
                      color: 'white',
                      width: '100%',
                      paddingLeft: '3px',
                      padding:'5px',
                      outline: 'none',
                      marginTop: '10px'
                    }}
                    className="[&_.cds--label]:text-white [&_input]:text-white [&_input:focus]:outline-none"
                  />

                  <TextInput
                    id="username"
                    labelText="Username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                    invalid={formData.username.length >= 3 && !usernameStatus.valid}
                    invalidText={usernameStatus.message}
                    style={{
                      backgroundColor: '#262626',
                      borderBottom: '1px solid #525252',
                      color: 'white',
                      width: '100%',
                      paddingLeft: '3px',
                      padding:'5px',
                      outline: 'none',
                      marginTop: '10px'
                    }}
                    className="[&_.cds--label]:text-white [&_input]:text-white [&_input:focus]:outline-none"
                  />

                  <div className="relative">
                    <TextInput
                      id="password"
                      labelText="Password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      style={{
                        backgroundColor: '#262626',
                        borderBottom: '1px solid #525252',
                        color: 'white',
                        width: '100%',
                        paddingLeft: '3px',
                        outline: 'none',
                        marginTop: '10px',
                        padding:'5px',
                      }}
                      className="[&_.cds--label]:text-white [&_input]:text-white [&_input:focus]:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-8 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOffRegular size={20} /> : <EyeRegular size={20} />}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !isValidEmail(formData.email) || !usernameStatus.valid}
                    style={{
                      backgroundColor: '#0f62fe',
                      minHeight: '48px',
                      borderRadius: '5px',
                      outline: 'none'
                    }}
                  >
                    {loading ? 'Creating Account...' : 'Continue'}
                  </Button>
                </form>
              ) : (
                <div className="space-y-6">
                  <p className="text-gray-400">
                    We sent a verification code to {formData.email}
                  </p>

                  <TextInput
                    id="verification-code"
                    labelText="Verification Code"
                    required
                    value={formData.verificationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setFormData({ ...formData, verificationCode: value });
                    }}
                    maxLength={6}
                    style={{
                      backgroundColor: '#262626',
                      border: '1px solid #525252',
                      color: 'white',
                      width: '100%',
                      padding:'20px',
                      fontSize:'22px',
                      paddingLeft: '3px',
                      borderRadius: '5px',
                      textAlign: 'center',
                      letterSpacing: '5px'
                    }}
                    className="[&_.cds--label]:text-white [&_input]:text-white [&_input:focus]:outline-none"
                  />

                  <Button
                    onClick={handleVerification}
                    className="w-full"
                    disabled={loading || formData.verificationCode.length !== 6}
                    style={{
                      backgroundColor: '#0f62fe',
                      minHeight: '48px',
                      borderRadius: '5px',
                      outline: 'none'
                    }}
                  >
                    {loading ? 'Verifying...' : 'Verify'}
                  </Button>

                  <div className="flex flex-col gap-2 text-center">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-[#4589ff] hover:text-[#0f62fe]"
                    >
                      Use a different email
                    </button>
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendDisabled}
                      className="text-[#4589ff] hover:text-[#0f62fe] disabled:text-gray-500"
                    >
                      {resendDisabled 
                        ? `Resend code in ${resendTimer}s` 
                        : 'Resend verification code'
                      }
                    </button>
                  </div>
                </div>
              )}

              <div className="text-center text-sm mt-6">
                <Link 
                  to="/login" 
                  className="text-[#4589ff] hover:text-[#0f62fe]"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </GradientBackground>
    </Theme>
  );
};

export default Register;
