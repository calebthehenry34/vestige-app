import express from 'express';
import { createStripeCustomer, setupBetaSubscription, getSubscriptionStatus, handleStripeWebhook } from '../controllers/subscriptionController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Protected routes (require authentication)
// Create customer after registration/first onboarding step
router.post('/create-customer', auth, createStripeCustomer);
// Setup subscription at end of onboarding
router.post('/beta-subscription', auth, setupBetaSubscription);
router.get('/status', auth, getSubscriptionStatus);

// Webhook endpoint (no auth required, verified by Stripe signature)
router.post('/webhook', handleStripeWebhook);

export default router;
