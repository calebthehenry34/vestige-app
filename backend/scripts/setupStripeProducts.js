import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function setupStripeProducts() {
  try {
    // Create or get beta product
    let betaProduct = await stripe.products.create({
      name: 'Beta Access',
      description: 'Early access to all features during beta period',
      metadata: {
        tier: 'beta_tier'
      }
    });

    console.log('Created Beta Product:', betaProduct.id);

    // Create price for beta product (free)
    let betaPrice = await stripe.prices.create({
      product: betaProduct.id,
      unit_amount: 0, // Free
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        tier: 'beta_tier'
      }
    });

    console.log('Created Beta Price:', betaPrice.id);
    console.log('\nAdd these to your .env file:');
    console.log(`STRIPE_BETA_PRICE_ID=${betaPrice.id}`);
    
  } catch (error) {
    console.error('Error setting up Stripe products:', error);
  }
}

setupStripeProducts();
