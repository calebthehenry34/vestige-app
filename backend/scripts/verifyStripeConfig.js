import stripe from '../src/config/stripe.js';

async function verifyStripeConfiguration() {
  try {
    console.log('Verifying Stripe configuration...');
    
    // Verify beta price exists
    const price = await stripe.prices.retrieve(process.env.STRIPE_BETA_PRICE_ID);
    console.log('\nBeta Price Configuration:');
    console.log('------------------------');
    console.log('Price ID:', price.id);
    console.log('Product:', price.product);
    console.log('Active:', price.active);
    console.log('Currency:', price.currency);
    console.log('Type:', price.type);
    console.log('Unit amount:', price.unit_amount);
    
    console.log('\nConfiguration verified successfully!');
  } catch (error) {
    if (error.code === 'resource_missing') {
      console.error('\nError: The specified beta price ID does not exist in Stripe.');
      console.error('Please create a price in Stripe and update STRIPE_BETA_PRICE_ID');
    } else {
      console.error('\nError verifying Stripe configuration:', error.message);
    }
    process.exit(1);
  }
}

verifyStripeConfiguration();
