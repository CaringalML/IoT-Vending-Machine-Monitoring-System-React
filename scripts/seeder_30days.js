#!/usr/bin/env node
// scripts/seed_30days.js
// This script clears the database and seeds it with a 30-day mock sales history.

const admin = require('firebase-admin');
const readline = require('readline');

// --- Firebase Admin SDK Initialization ---
let serviceAccount;
try {
  serviceAccount = require('../firebase-service-account.json');
} catch (error) {
  console.error('❌ Firebase service account key not found!');
  console.error('📋 Please download your service account key and save it as firebase-service-account.json');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// --- Mock Product Data ---
// A list of 15 products with slightly more realistic pricing and a popularity weight.
const MOCK_PRODUCTS = [
    { name: 'Weet Bix', slot: 'A3', price: 4.50, category: 'healthy', popularity: 0.6 },
    { name: 'Red Bull', slot: 'A4', price: 4.20, category: 'beverages', popularity: 0.9 },
    { name: 'Pascal Fruit Burst', slot: 'B3', price: 2.50, category: 'candy', popularity: 0.7 },
    { name: 'Fresh Up', slot: 'C2', price: 3.00, category: 'beverages', popularity: 0.8 },
    { name: 'Marmite', slot: 'B7', price: 5.50, category: 'healthy', popularity: 0.1 }, // Less popular item
    { name: 'Feastables', slot: 'A1', price: 3.50, category: 'snacks', popularity: 1.0 }, // Most popular
    { name: 'Flake 99', slot: 'D1', price: 2.00, category: 'candy', popularity: 0.7 },
    { name: 'L&P', slot: 'C1', price: 3.00, category: 'beverages', popularity: 1.0 }, // Most popular
    { name: 'Eta Ripples', slot: 'B6', price: 2.80, category: 'snacks', popularity: 0.8 },
    { name: 'Heartland Chips', slot: 'E1', price: 2.80, category: 'snacks', popularity: 0.9 },
    { name: 'Steak & Bacon Cheese Pie', slot: 'B2', price: 5.00, category: 'healthy', popularity: 0.6 },
    { name: 'Bluebird Originals', slot: 'B4', price: 2.80, category: 'snacks', popularity: 0.9 },
    { name: 'Creamy Milk', slot: 'A2', price: 2.50, category: 'beverages', popularity: 0.7 },
    { name: 'Cookie Bear', slot: 'A5', price: 3.00, category: 'snacks', popularity: 0.6 },
    { name: 'Blue V', slot: 'B1', price: 4.20, category: 'beverages', popularity: 1.0 } // Most popular
];
const PAYMENT_METHODS = ['cash', 'card', 'contactless', 'mobile'];
const MAX_CAPACITY = 25;
const LOW_STOCK_THRESHOLD = 5;

// --- Helper Functions ---

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const askQuestion = (q) => new Promise((resolve) => rl.question(q, resolve));

async function deleteCollection(collectionPath) {
    const query = db.collection(collectionPath).limit(200);
    let snapshot = await query.get();
    while (snapshot.size > 0) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        snapshot = await query.get();
    }
}

// --- Main Seeding Logic ---

async function seedDatabase() {
    const projectId = serviceAccount.project_id;
    try {
        // 1. Safety Confirmation
        console.error('\n🛑 DANGER ZONE! THIS SCRIPT WILL WIPE AND REPLACE THE DATABASE! 🛑');
        console.error(`You are about to clear [products, inventory, sales] and seed a 30-day history in project "${projectId}".`);
        const confirmation = await askQuestion(`To confirm, please type your Firebase project ID ("${projectId}"): `);
        if (confirmation.trim() !== projectId) {
            console.log('❌ Project ID mismatch. Aborting.');
            return;
        }

        // 2. Clear existing data
        console.log('\n🔥 Clearing existing data...');
        await Promise.all(['products', 'inventory', 'sales'].map(col => deleteCollection(col)));
        console.log('✅ Collections cleared.');

        // 3. Seed initial products and inventory
        console.log('\n🛍️  Seeding initial products and inventory...');
        const productRefs = {};
        let initialBatch = db.batch();
        MOCK_PRODUCTS.forEach(product => {
            const productRef = db.collection('products').doc();
            productRefs[product.slot] = { id: productRef.id, ...product };
            initialBatch.set(productRef, {
                ...product,
                active: true,
                maxCapacity: MAX_CAPACITY,
                sku: `MOCK-${product.slot}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            const inventoryRef = db.collection('inventory').doc(product.slot);
            initialBatch.set(inventoryRef, {
                slot: product.slot,
                productId: productRef.id,
                quantity: MAX_CAPACITY,
                maxCapacity: MAX_CAPACITY,
                lowStockThreshold: LOW_STOCK_THRESHOLD,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        await initialBatch.commit();
        console.log(`✅ ${MOCK_PRODUCTS.length} products and inventory records created.`);

        // 4. Generate 30 days of sales
        console.log('\n📈 Generating 30 days of mock sales data (this may take a moment)...');
        const salesTally = MOCK_PRODUCTS.reduce((acc, p) => ({ ...acc, [p.slot]: 0 }), {});
        const weightedProductPool = MOCK_PRODUCTS.flatMap(p => Array(Math.ceil(p.popularity * 10)).fill(p.slot));
        
        let salesBatch = db.batch();
        let salesCount = 0;
        
        for (let day = 29; day >= 0; day--) {
            const date = new Date();
            date.setDate(date.getDate() - day);
            const salesPerDay = Math.floor(Math.random() * 80) + 20; // 20 to 100 sales per day

            for (let i = 0; i < salesPerDay; i++) {
                const randomSlot = weightedProductPool[Math.floor(Math.random() * weightedProductPool.length)];
                const product = productRefs[randomSlot];

                if (salesTally[randomSlot] < MAX_CAPACITY) {
                    const saleRef = db.collection('sales').doc();
                    const saleTimestamp = new Date(date.getTime() - Math.floor(Math.random() * 24 * 60 * 60 * 1000));
                    
                    salesBatch.set(saleRef, {
                        productId: product.id,
                        slot: product.slot,
                        price: product.price,
                        paymentMethod: PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)],
                        timestamp: admin.firestore.Timestamp.fromDate(saleTimestamp)
                    });
                    salesTally[randomSlot]++;
                    salesCount++;

                    if (salesCount % 450 === 0) { // Commit batch every 450 operations
                        await salesBatch.commit();
                        salesBatch = db.batch();
                    }
                }
            }
        }
        await salesBatch.commit(); // Commit any remaining sales
        console.log(`✅ ${salesCount} total sales records created over 30 days.`);

        // 5. Update final inventory quantities
        console.log('\n📦 Updating final inventory counts...');
        let finalBatch = db.batch();
        Object.keys(salesTally).forEach(slot => {
            const inventoryRef = db.collection('inventory').doc(slot);
            const newQuantity = MAX_CAPACITY - salesTally[slot];
            finalBatch.update(inventoryRef, { 
                quantity: newQuantity,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        await finalBatch.commit();
        console.log('✅ Inventory updated to reflect sales.');

        console.log('\n🎉 Database seeding complete!');

    } catch (error) {
        console.error('\n💥 An error occurred during the seeding process:', error);
    } finally {
        rl.close();
    }
}

seedDatabase();