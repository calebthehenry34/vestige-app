import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  TextInput,
  Button,
  Theme,
  ErrorBoundary
} from '@carbon/react';
import {
  EyeRegular,
  EyeOffRegular
} from '@fluentui/react-icons';
import GradientBackground from '../../components/GradientBackground';
import { API_URL } from '../../config';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    console.log('Attempting login with:', {
      email: formData.email,
      hasPassword: !!formData.password
    });

    const response = await fetch('https://vestige-app.onrender.com/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password
      })
    });

    const data = await response.json();
    console.log('Login response:', data);

    if (!response.ok) {
      throw new Error(data.error || data.details || 'Login failed');
    }

    await login(data.token, data.user);
    navigate('/');
  } catch (error) {
    console.error('Login error details:', error);
    setError(error.message || 'Login failed. Please try again.');
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
              <h1 className="text-2xl md:text-3xl font-medium text-white mb-8">Login</h1>
              
              {error && (
                <div className="bg-white mb-6 p-4 flex items-start gap-3 rounded-lg">
                  <ErrorBoundary className="text-[#da1e28] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Error:</p>
                    <p>{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
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
                      outline: 'none',
                      padding:'5px',
                    }}
                    className="[&_.cds--label]:text-white [&_input]:text-white [&_input:focus]:outline-none"
                  />

                  <div className="relative pt-4">
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
                </div>

                <div className="text-right">
                  <Link to="/forgot-password" className="text-[#4589ff] text-sm hover:text-[#0f62fe]">
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  size="lg"
                  style={{
                    backgroundColor: '#0f62fe',
                    minHeight: '48px',
                    borderRadius: '5px',
                    outline: 'none'
                  }}
                >
                  {loading ? 'Signing in...' : 'Continue'}
                </Button>

                <p className="text-sm text-gray-400 text-center">
                  {' '}
                  <Link to="/register" className="text-[#4589ff] text-sm hover:text-[#0f62fe]">
                    Create an account
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </GradientBackground>
    </Theme>
  );
};

export default Login;
