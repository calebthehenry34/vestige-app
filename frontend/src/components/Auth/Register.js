import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useDebounce from '../../hooks/useDebounce';
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
import { API_URL } from '../../config';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    general: ''
  });
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    verificationCode: ''
  });
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [usernameStatus, setUsernameStatus] = useState({ valid: false, message: '' });
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // Debounced form values
  const debouncedEmail = useDebounce(formData.email, 500);
  const debouncedPassword = useDebounce(formData.password, 500);
  const debouncedConfirmPassword = useDebounce(formData.confirmPassword, 500);

  // Enhanced email validation
  const validateEmail = (email) => {
    if (!email) return "Email is required";
    if (email.endsWith('.internal')) return "This email domain is not allowed";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address (e.g., user@example.com)";
    return "";
  };

  // Enhanced password validation
  const validatePassword = (password) => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number";
    return "";
  };

  // Validate passwords match
  const validatePasswordMatch = (password, confirmPassword) => {
    if (!confirmPassword) return "Please confirm your password";
    if (password !== confirmPassword) return "Passwords do not match";
    return "";
  };

  // Effect for debounced email validation
  useEffect(() => {
    if (debouncedEmail) {
      const emailError = validateEmail(debouncedEmail);
      setErrors(prev => ({ ...prev, email: emailError }));
    }
  }, [debouncedEmail]);

  // Effect for debounced password validation
  useEffect(() => {
    if (debouncedPassword) {
      const passwordError = validatePassword(debouncedPassword);
      setErrors(prev => ({ ...prev, password: passwordError }));
    }
  }, [debouncedPassword]);

  // Effect for debounced password match validation
  useEffect(() => {
    if (debouncedPassword && debouncedConfirmPassword) {
      const matchError = validatePasswordMatch(debouncedPassword, debouncedConfirmPassword);
      setErrors(prev => ({ ...prev, confirmPassword: matchError }));
    }
  }, [debouncedPassword, debouncedConfirmPassword]);

  const validateUsername = async (username) => {
    setIsCheckingUsername(true);
    
    // Basic format validation
    const format = /^[a-zA-Z0-9._]{3,20}$/;
    if (!format.test(username)) {
      setUsernameStatus({
        valid: false,
        message: 'Username must be 3-20 characters and can only contain letters, numbers, dots, and underscores'
      });
      setIsCheckingUsername(false);
      return;
    }

    // Check for consecutive special characters
    if (username.includes('..') || username.includes('__') || username.includes('._') || username.includes('_.')) {
      setUsernameStatus({
        valid: false,
        message: 'Special characters cannot be consecutive'
      });
      setIsCheckingUsername(false);
      return;
    }

    // Check if username starts or ends with special characters
    if (username.startsWith('.') || username.startsWith('_') || 
        username.endsWith('.') || username.endsWith('_')) {
      setUsernameStatus({
        valid: false,
        message: 'Username cannot start or end with special characters'
      });
      setIsCheckingUsername(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/check-username?username=${username}`);
      const data = await response.json();

      if (!data.available) {
        setUsernameStatus({
          valid: false,
          message: 'Username is already taken'
        });
      } else {
        setUsernameStatus({
          valid: true,
          message: 'Username is available'
        });
      }
    } catch (error) {
      setUsernameStatus({
        valid: false,
        message: 'Error checking username availability'
      });
    }
    
    setIsCheckingUsername(false);
  };

  // Debounced username validation
  const debouncedUsername = useDebounce(formData.username, 500);
  useEffect(() => {
    if (debouncedUsername.length >= 3) {
      validateUsername(debouncedUsername);
    } else if (debouncedUsername) {
      setUsernameStatus({ valid: false, message: 'Username must be at least 3 characters long' });
    } else {
      setUsernameStatus({ valid: false, message: '' });
    }
  }, [debouncedUsername]);

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase();
    setFormData({ ...formData, username: value });
  };

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      general: ''
    });

    try {
      // Validate all fields
      const emailError = validateEmail(formData.email);
      const passwordError = validatePassword(formData.password);
      const confirmPasswordError = validatePasswordMatch(formData.password, formData.confirmPassword);

      if (emailError || passwordError || confirmPasswordError || !usernameStatus.valid) {
        setErrors({
          email: emailError,
          username: !usernameStatus.valid ? usernameStatus.message : '',
          password: passwordError,
          confirmPassword: confirmPasswordError,
          general: 'Please fix all errors before continuing'
        });
        return;
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
      setErrors(prev => ({ ...prev, general: error.message }));
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
      setErrors(prev => ({ ...prev, general: error.message }));
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      general: ''
    });
    
    try {
      // Ensure verification code is 6 digits
      if (!/^\d{6}$/.test(formData.verificationCode)) {
        throw new Error('Please enter a valid 6-digit code');
      }

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

      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Invalid verification code');
      }

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
      setErrors(prev => ({ ...prev, general: error.message }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Theme theme="g100">
      <div className="px-6 h-screen flex items-center justify-center">
        <div className="w-full max-w-lg bg-black rounded-lg shadow-xl login-card">
          <div>
            <div className="card-header">
              <h1 className="flex items-center justify-left font-headlines text-3xl md:text-3xl text-white mt-25">
                <img src="/logos/logo.svg" alt="Logo" className="mr-3 h-5 w-auto"/> {step === 1 ? 'Signup' : 'Verify Email'}
              </h1>
            </div>
            
            {errors.general && (
              <InlineNotification
                kind="error"
                title="Error"
                subtitle={errors.general}
                className="mb-4"
              />
            )}

            {step === 1 ? (
              <form onSubmit={handleInitialSubmit} className="space-y-6 px-8 pt-8 pb-6">
                <TextInput
                  id="email"
                  labelText="Email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  invalid={!!errors.email}
                  invalidText={errors.email}
                  style={{
                    backgroundColor: '#000',
                    borderBottom: '1px solid #525252',
                    color: 'white',
                    width: '100%',
                    paddingLeft: '3px',
                    padding: '5px',
                    outline: 'none',
                    marginTop: '10px'
                  }}
                  className="[&_.cds--label]:text-white [&_input]:text-white [&_input:focus]:outline-none"
                />

                <div>
                  <TextInput
                    id="username"
                    labelText="Username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleUsernameChange}
                    invalid={formData.username.length >= 3 && (!usernameStatus.valid || !!errors.username)}
                    invalidText={errors.username || usernameStatus.message}
                    style={{
                      backgroundColor: '#000',
                      borderBottom: '1px solid #525252',
                      color: 'white',
                      width: '100%',
                      paddingLeft: '3px',
                      padding: '5px',
                      outline: 'none',
                      marginTop: '10px'
                    }}
                    className="[&_.cds--label]:text-white [&_input]:text-white [&_input:focus]:outline-none"
                  />
                  {!isCheckingUsername && usernameStatus.message && (
                    <p className={`text-sm mt-1 ${usernameStatus.valid ? 'text-green-500' : 'text-red-500'}`}>
                      {usernameStatus.message}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <TextInput
                    id="password"
                    labelText="Password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    invalid={!!errors.password}
                    invalidText={errors.password}
                    style={{
                      backgroundColor: '#000',
                      borderBottom: '1px solid #525252',
                      color: 'white',
                      width: '100%',
                      paddingLeft: '3px',
                      outline: 'none',
                      marginTop: '10px',
                      padding: '5px',
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

                <div className="relative">
                  <TextInput
                    id="confirm-password"
                    labelText="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    invalid={!!errors.confirmPassword}
                    invalidText={errors.confirmPassword}
                    style={{
                      backgroundColor: '#000',
                      borderBottom: '1px solid #525252',
                      color: 'white',
                      width: '100%',
                      paddingLeft: '3px',
                      outline: 'none',
                      marginTop: '10px',
                      padding: '5px',
                    }}
                    className="[&_.cds--label]:text-white [&_input]:text-white [&_input:focus]:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-8 text-gray-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOffRegular size={20} /> : <EyeRegular size={20} />}
                  </button>
                </div>

                <Button
                  type="submit"
                  className="button-border w-full font-headlines"
                  disabled={loading || !!errors.email || !usernameStatus.valid || !!errors.password || !!errors.confirmPassword}
                  style={{
                    minHeight: '60px',
                    borderRadius: '5px',
                    outline: 'none'
                  }}
                >
                  {loading ? 'Creating Account...' : 'Continue'}
                </Button>
              </form>
            ) : (
              <div className="space-y-6 px-8 pt-8 pb-6 align-center">
                <p className="text-gray-400">
                  We sent a verification code to {formData.email}
                </p>

                <TextInput
                  id="verification-code"
                  labelText=""
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
                    padding: '20px',
                    fontSize: '30px',
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
                    backgroundColor: '#ae52e3',
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
                    className="text-[#f1f1f2] hover:text-[#ae52e3]"
                  >
                    Use a different email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendDisabled}
                    className="text-[#f1f1f2] hover:text-[#ae52e3] disabled:text-gray-500"
                  >
                    {resendDisabled 
                      ? `Resend code in ${resendTimer}s` 
                      : 'Resend verification code'
                    }
                  </button>
                </div>
              </div>
            )}

            <div className="text-center mb-25 text-sm mt-6">
              <Link 
                to="/login" 
                className="text-[#f1f1f2] hover:text-[#f1f1f2]"
              >
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Theme>
  );
};

export default Register;
