import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function cleanupStripeProducts() {
  try {
    console.log('Fetching active products...');
    const products = await stripe.products.list({
      active: true
    });
    
    console.log(`Found ${products.data.length} active products`);
    
    // Archive all active products
    for (const product of products.data) {
      console.log(`Archiving product: ${product.name} (${product.id})`);
      await stripe.products.update(product.id, {
        active: false
      });
    }

    console.log('\nVerifying cleanup...');
    const remainingProducts = await stripe.products.list({
      active: true
    });
    console.log('Total remaining active products:', remainingProducts.data.length);
    
    if (remainingProducts.data.length === 0) {
      console.log('Successfully archived all products!');
    } else {
      console.log('Warning: Some products are still active:');
      remainingProducts.data.forEach(product => {
        console.log(`- ${product.name} (${product.id})`);
      });
    }

  } catch (error) {
    console.error('Error cleaning up products:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('Authentication failed. Make sure you are using the correct API key.');
    }
    process.exit(1);
  }
}

cleanupStripeProducts();
