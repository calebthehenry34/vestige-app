import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' // Using latest stable API version
});

export const SUBSCRIPTION_TIERS = {
  BETA: 'beta_tier',
  PRO: 'pro_tier'
};

export const createCustomer = async (email, name) => {
  try {
    return await stripe.customers.create({
      email,
      name,
      metadata: {
        tier: SUBSCRIPTION_TIERS.BETA
      }
    });
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
};

export const createBetaSubscription = async (customerId) => {
  try {
    // For beta users, we'll create a subscription with a 100% off coupon
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: process.env.STRIPE_BETA_PRICE_ID }],
      trial_period_days: 30, // 30-day trial period
      metadata: {
        tier: SUBSCRIPTION_TIERS.BETA
      }
    });
    
    return subscription;
  } catch (error) {
    console.error('Error creating beta subscription:', error);
    throw error;
  }
};

export const getCustomerSubscriptions = async (customerId) => {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      expand: ['data.default_payment_method']
    });
    return subscriptions.data;
  } catch (error) {
    console.error('Error fetching customer subscriptions:', error);
    throw error;
  }
};

export default stripe;
