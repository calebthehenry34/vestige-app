import { SUBSCRIPTION_TIERS } from '../config/stripe.js';
import User from '../models/User.js';

// Initialize user for beta access (called after registration/first onboarding step)
export const createStripeCustomer = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // User is already initialized
    if (user.subscriptionStatus === 'active' && user.subscriptionTier === SUBSCRIPTION_TIERS.BETA) {
      return res.status(400).json({ message: 'User is already initialized for beta access' });
    }

    // Grant immediate beta access
    user.subscriptionStatus = 'active';
    user.subscriptionTier = SUBSCRIPTION_TIERS.BETA;
    await user.save();

    res.json({
      message: 'Beta access granted successfully'
    });
  } catch (error) {
    console.error('Error initializing user for beta:', error);
    res.status(500).json({ 
      message: 'Failed to initialize user for beta',
      error: error.message 
    });
  }
};

// Grant beta access (called at end of onboarding)
export const setupBetaSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check for existing beta access
    if (user.subscriptionStatus === 'active' && user.subscriptionTier === SUBSCRIPTION_TIERS.BETA) {
      return res.status(400).json({ message: 'User already has beta access' });
    }

    // Grant beta access
    user.subscriptionStatus = 'active';
    user.subscriptionTier = SUBSCRIPTION_TIERS.BETA;
    await user.save();

    res.json({
      message: 'Beta access granted successfully',
      subscription: {
        status: 'active',
        tier: SUBSCRIPTION_TIERS.BETA
      }
    });
  } catch (error) {
    console.error('Error in setupBetaSubscription:', error);
    
    // Handle specific error cases
    if (error.code === 'resource_missing') {
      return res.status(400).json({ 
        message: 'Invalid Stripe configuration',
        error: 'Beta subscription price not found'
      });
    }

    res.status(500).json({ 
      message: 'Failed to create beta subscription',
      error: error.message 
    });
  }
};

export const getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      status: user.subscriptionStatus,
      tier: user.subscriptionTier
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ 
      message: 'Failed to fetch subscription status',
      error: error.message 
    });
  }
};
