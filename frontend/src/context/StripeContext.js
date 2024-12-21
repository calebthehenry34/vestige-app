import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { API_URL } from '../config';

const StripeContext = createContext();

export const useStripe = () => {
  const context = useContext(StripeContext);
  if (!context) {
    throw new Error('useStripe must be used within a StripeProvider');
  }
  return context;
};

export const StripeProvider = ({ children }) => {
  const [stripePromise, setStripePromise] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize Stripe
    const stripe = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);
    setStripePromise(stripe);
  }, []);

  const setupBetaSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/api/subscriptions/beta-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to setup beta subscription');
      }

      const data = await response.json();
      setSubscriptionStatus(data.subscription);
      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/api/subscriptions/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch subscription status');
      }

      const data = await response.json();
      setSubscriptionStatus(data);
      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    stripePromise,
    subscriptionStatus,
    loading,
    error,
    setupBetaSubscription,
    getSubscriptionStatus
  };

  return (
    <StripeContext.Provider value={value}>
      {children}
    </StripeContext.Provider>
  );
};

export default StripeContext;
