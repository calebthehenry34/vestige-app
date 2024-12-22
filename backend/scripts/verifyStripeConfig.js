import stripe from '../src/config/stripe.js';

async function verifyStripeConfiguration() {
  try {
    console.log('Verifying Stripe configuration...');
    
    // Verify Stripe connection
    await stripe.customers.list({ limit: 1 });
    
    console.log('\nConfiguration verified successfully!');
  } catch (error) {
    console.error('\nError verifying Stripe configuration:', error.message);
    process.exit(1);
  }
}

verifyStripeConfiguration();
