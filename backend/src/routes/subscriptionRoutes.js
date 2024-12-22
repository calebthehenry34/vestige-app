import express from 'express';
import { createStripeCustomer, setupBetaSubscription, getSubscriptionStatus } from '../controllers/subscriptionController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Protected routes (require authentication)
router.post('/create-customer', auth, createStripeCustomer); // Initialize beta access after registration
router.post('/beta-subscription', auth, setupBetaSubscription); // Grant beta access at end of onboarding
router.get('/status', auth, getSubscriptionStatus); // Get user's beta access status

export default router;
