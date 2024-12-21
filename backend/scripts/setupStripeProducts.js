import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function setupStripeProducts() {
  try {
    // Create beta product
    console.log('Creating Beta Product...');
    const betaProduct = await stripe.products.create({
      name: 'Beta Access',
      description: 'Early access to all features during beta period',
      metadata: {
        tier: 'beta_tier'
      }
    });
    console.log('Created Beta Product:', betaProduct.id);

    // Create price for beta product (free)
    console.log('Creating Beta Price...');
    const betaPrice = await stripe.prices.create({
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

    // Create pro product
    console.log('\nCreating Pro Product...');
    const proProduct = await stripe.products.create({
      name: 'Pro Access',
      description: 'Full access to all premium features',
      metadata: {
        tier: 'pro_tier'
      }
    });
    console.log('Created Pro Product:', proProduct.id);

    // Create monthly price for pro product ($7.99/month)
    console.log('Creating Pro Monthly Price...');
    const proMonthlyPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 799, // $7.99
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        tier: 'pro_tier',
        interval: 'month'
      }
    });
    console.log('Created Pro Monthly Price:', proMonthlyPrice.id);

    // Create yearly price for pro product ($74.99/year)
    console.log('Creating Pro Yearly Price...');
    const proYearlyPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 7499, // $74.99
      currency: 'usd',
      recurring: {
        interval: 'year'
      },
      metadata: {
        tier: 'pro_tier',
        interval: 'year'
      }
    });
    console.log('Created Pro Yearly Price:', proYearlyPrice.id);

    // Print environment variables
    console.log('\nAdd these to your .env file:');
    console.log(`STRIPE_BETA_PRICE_ID=${betaPrice.id}`);
    console.log(`STRIPE_PRO_MONTHLY_PRICE_ID=${proMonthlyPrice.id}`);
    console.log(`STRIPE_PRO_YEARLY_PRICE_ID=${proYearlyPrice.id}`);
    
    // Verify products were created
    console.log('\nVerifying products...');
    const products = await stripe.products.list();
    console.log('Total products:', products.data.length);
    products.data.forEach(product => {
      console.log(`- ${product.name} (${product.id})`);
    });

  } catch (error) {
    console.error('Error setting up Stripe products:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('Authentication failed. Make sure you are using the correct API key.');
    }
    process.exit(1);
  }
}

setupStripeProducts();
