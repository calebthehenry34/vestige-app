import stripe, { createCustomer, createBetaSubscription, SUBSCRIPTION_TIERS } from '../config/stripe.js';
import User from '../models/User.js';

// Create Stripe customer (called after user registration/first onboarding step)
export const createStripeCustomer = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't create duplicate customers
    if (user.stripeCustomerId) {
      return res.status(400).json({ message: 'User already has a Stripe customer ID' });
    }

    const customer = await createCustomer(user.email, user.username, user.firstName, user.lastName);
    user.stripeCustomerId = customer.id;
    await user.save();

    res.json({
      message: 'Stripe customer created successfully',
      customerId: customer.id
    });
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    res.status(500).json({ 
      message: 'Failed to create Stripe customer',
      error: error.message 
    });
  }
};

// Setup subscription (called at end of onboarding)
export const setupBetaSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify customer exists in Stripe
    if (!user.stripeCustomerId) {
      return res.status(400).json({ 
        message: 'User does not have a Stripe customer ID. Complete registration first.' 
      });
    }

    // Check for existing subscription
    if (user.subscriptionStatus === 'active' && user.subscriptionTier === SUBSCRIPTION_TIERS.BETA) {
      return res.status(400).json({ message: 'User already has an active beta subscription' });
    }

    // Create beta subscription
    const subscription = await createBetaSubscription(user.stripeCustomerId);

    // Update user subscription status
    user.subscriptionStatus = 'active';
    user.subscriptionTier = SUBSCRIPTION_TIERS.BETA;
    user.trialEndsAt = new Date(subscription.trial_end * 1000);
    await user.save();

    res.json({
      message: 'Beta subscription activated successfully',
      subscription: {
        status: subscription.status,
        trialEnd: subscription.trial_end,
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

    if (!user.stripeCustomerId) {
      return res.json({
        status: 'inactive',
        tier: null,
        trialEndsAt: null
      });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1
    });

    const subscription = subscriptions.data[0];

    res.json({
      status: user.subscriptionStatus,
      tier: user.subscriptionTier,
      trialEndsAt: user.trialEndsAt,
      subscription: subscription ? {
        status: subscription.status,
        trialEnd: subscription.trial_end,
        currentPeriodEnd: subscription.current_period_end
      } : null
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ 
      message: 'Failed to fetch subscription status',
      error: error.message 
    });
  }
};

// Webhook handler for Stripe events
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.trial_will_end':
        // Handle trial ending soon
        await handleTrialWillEnd(event.data.object);
        break;
      case 'customer.subscription.deleted':
        // Handle subscription cancellation
        await handleSubscriptionCancelled(event.data.object);
        break;
      case 'customer.subscription.updated':
        // Handle subscription updates
        await handleSubscriptionUpdated(event.data.object);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

async function handleTrialWillEnd(subscription) {
  const user = await User.findOne({ stripeCustomerId: subscription.customer });
  if (user) {
    // You could send an email notification here
    console.log(`Trial ending soon for user ${user.email}`);
  }
}

async function handleSubscriptionCancelled(subscription) {
  const user = await User.findOne({ stripeCustomerId: subscription.customer });
  if (user) {
    user.subscriptionStatus = 'inactive';
    user.subscriptionTier = null;
    user.trialEndsAt = null;
    await user.save();
  }
}

async function handleSubscriptionUpdated(subscription) {
  const user = await User.findOne({ stripeCustomerId: subscription.customer });
  if (user) {
    user.subscriptionStatus = subscription.status;
    if (subscription.trial_end) {
      user.trialEndsAt = new Date(subscription.trial_end * 1000);
    }
    await user.save();
  }
}
