import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

if (!process.env.STRIPE_BETA_PRICE_ID) {
  throw new Error('STRIPE_BETA_PRICE_ID environment variable is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' // Using latest stable API version
});

export const SUBSCRIPTION_TIERS = {
  BETA: 'beta_tier',
  PRO: 'pro_tier'
};

export const createCustomer = async (email, username, firstName, lastName) => {
  try {
    return await stripe.customers.create({
      email,
      name: `${firstName || ''} ${lastName || ''}`.trim() || username,
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
    // Verify the beta price exists before attempting to create subscription
    try {
      await stripe.prices.retrieve(process.env.STRIPE_BETA_PRICE_ID);
    } catch (error) {
      if (error.code === 'resource_missing') {
        console.error('Beta price ID not found in Stripe');
        error.message = 'Beta subscription price not configured';
        throw error;
      }
      throw error;
    }

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
