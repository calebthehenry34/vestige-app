import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function archiveOldProducts() {
  try {
    // Old product IDs from the first run
    const oldProductIds = [
      'prod_RRUMdNIjpxGZRc', // Old Pro Access
      'prod_RRUMn2IOBnDMOv'  // Old Beta Access
    ];

    console.log('Archiving old products...');
    
    for (const productId of oldProductIds) {
      await stripe.products.update(productId, {
        active: false
      });
      console.log(`Archived product: ${productId}`);
    }

    console.log('\nVerifying current active products...');
    const products = await stripe.products.list({
      active: true
    });
    console.log('Total active products:', products.data.length);
    products.data.forEach(product => {
      console.log(`- ${product.name} (${product.id})`);
    });

  } catch (error) {
    console.error('Error archiving products:', error.message);
    process.exit(1);
  }
}

archiveOldProducts();
