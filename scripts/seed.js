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
  console.error('📋 Please download your service account key from Firebase Console and save as:');
  console.error('   firebase-service-account.json');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com/`
  });
}

const db = admin.firestore();
const PAYMENT_METHODS = ['cash', 'card', 'contactless', 'mobile'];

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

class CLISeeder {
  async createSingleProduct() {
    console.log('🛍️ Creating a single product...\n');
    const name = await askQuestion('Product name: ');
    if (!name.trim()) {
      console.log('❌ Product name is required');
      return false;
    }
    const priceInput = await askQuestion('Price (e.g., 2.50): ');
    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0) {
      console.log('❌ Invalid price');
      return false;
    }
    console.log('\nAvailable categories:');
    console.log('- beverages');
    console.log('- snacks');
    console.log('- candy');
    console.log('- healthy');
    const category = await askQuestion('Category: ') || 'snacks';
    const slot = await askQuestion('Slot (e.g., A1, B2): ');
    if (!slot.trim()) {
      console.log('❌ Slot is required');
      return false;
    }
    const image = await askQuestion('Image URL (optional): ') || 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&h=300&fit=crop';
    const capacityInput = await askQuestion('Max capacity (default 20): ') || '20';
    const maxCapacity = parseInt(capacityInput);
    if (isNaN(maxCapacity) || maxCapacity <= 0) {
      console.log('❌ Invalid capacity');
      return false;
    }
    const quantityInput = await askQuestion('Current quantity (default 15): ') || '15';
    const quantity = parseInt(quantityInput);
    if (isNaN(quantity) || quantity < 0) {
      console.log('❌ Invalid quantity');
      return false;
    }
    const sku = `CUSTOM-${Date.now()}`;
    const productData = {
      name: name.trim(),
      price,
      category: category.trim(),
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
    console.log(`✅ Created product: ${name} in slot ${slot}`);
    console.log(`💰 Price: $${price.toFixed(2)}`);
    console.log(`📦 Quantity: ${quantity}/${maxCapacity}`);
    console.log(`🆔 Product ID: ${productRef.id}`);
    return true;
  }

  async generateSalesForChosenProduct() {
    // Fetch all products
    const productsSnapshot = await db.collection('products').get();
    if (productsSnapshot.empty) {
      console.log('❌ No products found. Please create a product first.');
      return false;
    }
    const products = [];
    let idx = 1;
    console.log('\nAvailable products:');
    productsSnapshot.forEach(doc => {
      const data = doc.data();
      products.push({ id: doc.id, ...data });
      console.log(`${idx}. ${data.name} (Slot: ${data.slot}, Price: $${data.price})`);
      idx++;
    });
    const productChoice = await askQuestion('\nSelect product number to add sales: ');
    const productIndex = parseInt(productChoice) - 1;
    if (isNaN(productIndex) || productIndex < 0 || productIndex >= products.length) {
      console.log('❌ Invalid selection.');
      return false;
    }
    const product = products[productIndex];
    // Get inventory
    const inventoryDoc = await db.collection('inventory').doc(product.slot).get();
    if (!inventoryDoc.exists) {
      console.log('❌ No inventory found for this product.');
      return false;
    }
    const inventory = inventoryDoc.data();
    const currentQuantity = inventory.quantity;
    const salesCountInput = await askQuestion(`Number of sales to generate (max ${currentQuantity}, default 5): `) || '5';
    const salesCount = parseInt(salesCountInput);
    if (isNaN(salesCount) || salesCount <= 0) {
      console.log('❌ Invalid sales count');
      return false;
    }
    if (salesCount > currentQuantity) {
      console.log(`❌ Cannot generate ${salesCount} sales. Only ${currentQuantity} units in stock.`);
      return false;
    }
    // Generate sales
    const now = new Date();
    const batch = db.batch();
    for (let i = 0; i < salesCount; i++) {
      const saleTime = new Date(now.getTime() - Math.floor(Math.random() * 12 * 60 * 60 * 1000)); // random time in last 12 hours
      const saleRef = db.collection('sales').doc();
      batch.set(saleRef, {
        productId: product.id,
        slot: product.slot,
        price: product.price,
        paymentMethod: PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)],
        timestamp: admin.firestore.Timestamp.fromDate(saleTime)
      });
    }
    // Update inventory
    const newQuantity = currentQuantity - salesCount;
    const inventoryRef = db.collection('inventory').doc(product.slot);
    batch.update(inventoryRef, {
      quantity: newQuantity,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await batch.commit();
    console.log(`✅ Generated ${salesCount} sales for ${product.name}`);
    console.log(`📦 Inventory updated: ${currentQuantity} → ${newQuantity} units`);
    return true;
  }
}

// Main CLI logic
async function main() {
  try {
    console.log('🏪 Vending Machine Database Management CLI');
    console.log('==========================================\n');
    console.log('1. Create Single Product');
    console.log('2. Generate Sales for Chosen Product\n');
    const choice = await askQuestion('Select option (1 or 2): ');
    const seeder = new CLISeeder();
    if (choice === '1') {
      await seeder.createSingleProduct();
    } else if (choice === '2') {
      await seeder.generateSalesForChosenProduct();
    } else {
      console.log('❌ Invalid option');
    }
  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Run the CLI
if (require.main === module) {
  main();
}

module.exports = { CLISeeder };