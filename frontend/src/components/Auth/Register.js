import React, { useState } from 'react';
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
    password: '',
    verificationCode: ''
  });
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(API_URL + '/api/auth/send-verification', {
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

      const response = await fetch(API_URL + '/api/auth/send-verification', {
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
      // First verify the code
      console.log('Sending verification code:', {
        email: formData.email,
        code: formData.verificationCode
      });

      
      const verifyResponse = await fetch(API_URL + '/api/auth/verify-code', {
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
        throw new Error('Invalid verification code');
      }

      // Then register the user
      const registerResponse = await fetch(API_URL + '/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
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
                    disabled={loading}
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
                    disabled={loading}
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