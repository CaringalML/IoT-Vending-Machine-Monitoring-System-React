#!/usr/bin/env node
// scripts/seed.js
// Main CLI database seeder for Vending Machine Admin

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  serviceAccount = require('../firebase-service-account.json');
} catch (error) {
  console.error('❌ Firebase service account key not found!');
  console.error('📋 Please download your service account key from the Firebase Console and save it as:');
  console.error('   firebase-service-account.json');
  process.exit(1);
}

// Prevent re-initialization of the app
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com/`
  });
}

const db = admin.firestore();
const PAYMENT_METHODS = ['cash', 'card', 'contactless', 'mobile'];
const COLLECTIONS_TO_DELETE = ['products', 'inventory', 'sales'];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

/**
 * Deletes all documents in a specified Firestore collection in batches.
 * @param {string} collectionPath The path to the collection to delete.
 * @param {number} batchSize The number of documents to delete in each batch.
 * @returns {Promise<void>}
 */
async function deleteCollection(collectionPath, batchSize) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);
  
    return new Promise((resolve, reject) => {
      deleteQueryBatch(query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(query, resolve) {
    const snapshot = await query.get();
  
    if (snapshot.size === 0) {
      return resolve();
    }
  
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  
    process.nextTick(() => {
      deleteQueryBatch(query, resolve);
    });
}


class CLISeeder {
    // ... (createSingleProduct and generateSalesForChosenProduct functions are unchanged)
    
    /**
     * Creates a single product and its corresponding inventory record.
     */
    async createSingleProduct() {
        console.log('🛍️  Creating a single product...\n');

        const name = await askQuestion('Product name: ');
        if (!name.trim()) {
        console.log('❌ Product name is required.');
        return false;
        }

        const priceInput = await askQuestion('Price (e.g., 2.50): ');
        const price = parseFloat(priceInput);
        if (isNaN(price) || price <= 0) {
        console.log('❌ Invalid price. Please enter a positive number.');
        return false;
        }

        console.log('\nAvailable categories:');
        console.log('- beverages');
        console.log('- snacks');
        console.log('- candy');
        console.log('- healthy');
        const category = await askQuestion('Category (default: snacks): ') || 'snacks';

        const slot = await askQuestion('Slot (e.g., A1, B2): ');
        if (!/^[A-Z][0-9]+$/.test(slot.trim().toUpperCase())) {
            console.log('❌ Invalid slot format. Please use a letter followed by a number (e.g., A1).');
            return false;
        }


        const image = await askQuestion('Image URL (optional): ') || 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&h=300&fit=crop';

        const maxCapacityInput = await askQuestion('Max capacity (default: 20): ') || '20';
        const maxCapacity = parseInt(maxCapacityInput, 10);
        if (isNaN(maxCapacity) || maxCapacity <= 0) {
        console.log('❌ Invalid capacity. Please enter a positive integer.');
        return false;
        }

        const quantityInput = await askQuestion(`Current quantity (default: 15, max: ${maxCapacity}): `) || '15';
        const quantity = parseInt(quantityInput, 10);
        if (isNaN(quantity) || quantity < 0 || quantity > maxCapacity) {
        console.log(`❌ Invalid quantity. Please enter a number between 0 and ${maxCapacity}.`);
        return false;
        }

        const sku = `CUSTOM-${Date.now()}`;

        const productData = {
        name: name.trim(),
        price,
        category: category.trim().toLowerCase(),
        slot: slot.trim().toUpperCase(),
        image,
        active: true,
        maxCapacity,
        sku
        };

        console.log('\n📦 Creating product with data:');
        console.log(JSON.stringify(productData, null, 2));

        const batch = db.batch();
        const productRef = db.collection('products').doc();

        // Use server timestamp for creation and update times to ensure accuracy.
        batch.set(productRef, {
        ...productData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const inventoryRef = db.collection('inventory').doc(productData.slot);
        batch.set(inventoryRef, {
        slot: productData.slot,
        productId: productRef.id,
        quantity,
        maxCapacity,
        lowStockThreshold: 5,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        console.log(`\n✅ Created product: ${name} in slot ${slot}`);
        console.log(`💰 Price: $${price.toFixed(2)}`);
        console.log(`📦 Quantity: ${quantity}/${maxCapacity}`);
        console.log(`🆔 Product ID: ${productRef.id}`);

        return true;
    }

    /**
     * Generates a specified number of sales records for a chosen product.
     */
    async generateSalesForChosenProduct() {
        const productsSnapshot = await db.collection('products').where('active', '==', true).get();
        if (productsSnapshot.empty) {
        console.log('❌ No active products found. Please create a product first.');
        return false;
        }

        const products = [];
        console.log('\n--- Choose a Product ---');
        productsSnapshot.forEach((doc, index) => {
        const data = doc.data();
        products.push({ id: doc.id, ...data });
        // Display a numbered list for easy selection
        console.log(`${index + 1}. ${data.name} (Slot: ${data.slot}, Price: $${data.price.toFixed(2)})`);
        });
        console.log('------------------------');


        const productChoice = await askQuestion('\nEnter the number of the product to add sales to: ');
        const productIndex = parseInt(productChoice, 10) - 1;

        if (isNaN(productIndex) || productIndex < 0 || productIndex >= products.length) {
        console.log('❌ Invalid selection.');
        return false;
        }

        const product = products[productIndex];
        const inventoryRef = db.collection('inventory').doc(product.slot);
        const inventoryDoc = await inventoryRef.get();

        if (!inventoryDoc.exists) {
        console.log(`❌ No inventory record found for product in slot ${product.slot}.`);
        return false;
        }

        const currentQuantity = inventoryDoc.data().quantity;
        if (currentQuantity === 0) {
            console.log(`❌ Cannot generate sales. Product "${product.name}" is out of stock.`);
            return false;
        }

        const salesCountInput = await askQuestion(`Number of sales to generate (max: ${currentQuantity}, default: 5): `) || '5';
        const salesCount = parseInt(salesCountInput, 10);

        if (isNaN(salesCount) || salesCount <= 0) {
        console.log('❌ Invalid sales count. Please enter a positive integer.');
        return false;
        }

        if (salesCount > currentQuantity) {
        console.log(`❌ Cannot generate ${salesCount} sales. Only ${currentQuantity} units are in stock.`);
        return false;
        }
        
        const generationTime = new Date();
        const formattedDateTime = generationTime.toLocaleString('en-NZ', {
            dateStyle: 'medium',
            timeStyle: 'medium',
            timeZone: 'Pacific/Auckland'
        });

        const batch = db.batch();
        console.log(`\n🔄 Generating ${salesCount} sales for ${product.name}...`);

        for (let i = 0; i < salesCount; i++) {
        const saleRef = db.collection('sales').doc();
        batch.set(saleRef, {
            productId: product.id,
            slot: product.slot,
            price: product.price,
            paymentMethod: PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)],
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        }

        const newQuantity = currentQuantity - salesCount;
        batch.update(inventoryRef, {
        quantity: newQuantity,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        console.log(`\n✅ Generated ${salesCount} sales for "${product.name}" at approximately ${formattedDateTime}`);
        console.log(`📦 Inventory updated: ${currentQuantity} → ${newQuantity} units`);

        return true;
    }

  /**
   * !! DANGEROUS !!
   * Clears all specified collections from the database after user confirmation.
   */
  async clearDatabase() {
    const projectId = serviceAccount.project_id;
    console.error('\n🛑 DANGER ZONE! THIS IS A DESTRUCTIVE OPERATION! 🛑');
    console.error('====================================================');
    console.error(`You are about to permanently delete all data from the following collections in the "${projectId}" project:`);
    COLLECTIONS_TO_DELETE.forEach(col => console.error(`  - ${col}`));
    console.error('\nThis action cannot be undone.');

    const confirmation = await askQuestion(`To confirm, please type your Firebase project ID ("${projectId}"): `);

    if (confirmation.trim() !== projectId) {
      console.log('\n❌ Project ID mismatch. Database clearing aborted.');
      return false;
    }

    console.log('\n✅ Confirmation received. Proceeding with database clearing...');

    try {
      await Promise.all(
        COLLECTIONS_TO_DELETE.map(col => {
          console.log(`  - Deleting collection: ${col}...`);
          return deleteCollection(col, 200);
        })
      );
      console.log('\n✅ All specified collections have been successfully cleared.');
    } catch (error) {
      console.error('\n💥 An error occurred while clearing the database:', error);
    }
    
    return true;
  }
}

async function main() {
  const seeder = new CLISeeder();
  const args = process.argv.slice(2);

  // Handle direct command for clearing the DB
  if (args[0] === 'clear') {
    await seeder.clearDatabase();
    rl.close();
    return;
  }
  
  // Otherwise, show the interactive menu
  try {
    console.log('\n🏪 Vending Machine Database Management CLI');
    console.log('==========================================\n');
    console.log('1. Create Single Product');
    console.log('2. Generate Sales for a Product');
    console.log('3. Exit');
    console.log('\n--- Dangerous Operations ---');
    console.log('4. Clear Entire Database');
    console.log('----------------------------\n');

    const choice = await askQuestion('Select an option: ');

    switch (choice.trim()) {
      case '1':
        await seeder.createSingleProduct();
        break;
      case '2':
        await seeder.generateSalesForChosenProduct();
        break;
      case '3':
        console.log('👋 Exiting CLI. Goodbye!');
        break;
      case '4':
        await seeder.clearDatabase();
        break;
      default:
        console.log('❌ Invalid option. Please try again.');
        break;
    }
  } catch (error) {
    console.error('💥 An unexpected error occurred:', error.message);
    process.exit(1);
  } finally {
    if (rl.writable) {
        rl.close();
    }
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { CLISeeder };