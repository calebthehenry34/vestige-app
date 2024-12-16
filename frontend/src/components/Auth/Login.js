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

    const response = await fetch(`${API_URL}/api/auth/login`, {
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
        <div className="px-6 h-screen flex items-center justify-center ">
          <div className="w-full max-w-lg bg-black rounded-lg shadow-xl login-card">
            <div>
              <div className="card-header">
              <h1 className="flex items-center justify-left font-headlines text-3xl md:text-3xl text-white mt-25">
              <img src="/logos/logo.svg" alt="Logo" className="mr-3 h-5 w-auto"/>Login</h1>
                </div>
              <form onSubmit={handleSubmit} className="space-y-6 px-8 pt-8 pb-6">
                <div className=" font-medium space-y-4 mt-20">
                  <TextInput
                    id="email"
                    labelText="Email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      backgroundColor: '#000',
                      borderBottom: '1px solid #525252',
                      color: '#f1f1f2',
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
                        backgroundColor: '#000',
                        borderBottom: '1px solid #525252',
                        color: '#f1f1f2',
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
                      className="absolute right-2 top-9 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOffRegular size={20} /> : <EyeRegular size={20} />}
                    </button>
                  </div>
                </div>

                <div className="text-left">
                  <Link to="/forgot-password" className=" font-medium text-white text-xs hover:text-[#f1f1f2]">
                    Forgot password?
                  </Link>
                </div>

                {error && (
                <div className="mb-6 p-4 flex items-start gap-1 rounded-lg">
                  <ErrorBoundary className="text-[#c9083b] flex-shrink-0" />
                  <div>
                    <p className="font-medium font-sm text-[#c9083b]">Error: {error}</p><p className="font-sm text-[#c9083b]"></p>
                  </div>
                </div>
              )}

                <Button
                  type="submit"
                  className="button-border w-full font-headlines"
                  disabled={loading}
                  size="xl"
                  style={{
                    minHeight: '60px',
                  }}
                >
                  {loading ? 'Signing in...' : 'Continue'}
                </Button>
                <p className="text-sm text-gray-400 mt-35 text-center">
                  {' '}
                  <Link to="/register" className="text-[#f1f1f2] font-medium text-sm hover:text-[#0f62fe]">
                    Create an account
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
    </Theme>
  );
};

export default Login;
