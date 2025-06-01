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

// Sample product data
const SAMPLE_PRODUCTS = [
  {
    name: 'Coca Cola',
    price: 2.50,
    category: 'beverages',
    slot: 'A1',
    image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 20,
    sku: 'BEV-001'
  },
  {
    name: 'Pepsi',
    price: 2.50,
    category: 'beverages',
    slot: 'A2',
    image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 20,
    sku: 'BEV-002'
  },
  {
    name: 'Sprite',
    price: 2.00,
    category: 'beverages',
    slot: 'A3',
    image: 'https://images.unsplash.com/photo-1625740655275-4b3c5ef95bc9?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 15,
    sku: 'BEV-003'
  },
  {
    name: 'Kit Kat',
    price: 3.00,
    category: 'candy',
    slot: 'B1',
    image: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 25,
    sku: 'CAN-001'
  },
  {
    name: 'Snickers',
    price: 3.50,
    category: 'candy',
    slot: 'B2',
    image: 'https://images.unsplash.com/photo-1590080876467-67d30cf8743e?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 25,
    sku: 'CAN-002'
  },
  {
    name: 'Lays Classic',
    price: 2.80,
    category: 'snacks',
    slot: 'C1',
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 18,
    sku: 'SNA-001'
  },
  {
    name: 'Doritos',
    price: 3.20,
    category: 'snacks',
    slot: 'C2',
    image: 'https://images.unsplash.com/photo-1600952841320-db4ec82c5d8e?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 18,
    sku: 'SNA-002'
  },
  {
    name: 'Granola Bar',
    price: 4.00,
    category: 'healthy',
    slot: 'D1',
    image: 'https://images.unsplash.com/photo-1527617834522-fae101ccc5fd?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 12,
    sku: 'HEA-001'
  },
  {
    name: 'Trail Mix',
    price: 4.50,
    category: 'healthy',
    slot: 'D2',
    image: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 15,
    sku: 'HEA-002'
  },
  {
    name: 'Water Bottle',
    price: 1.50,
    category: 'beverages',
    slot: 'D3',
    image: 'https://images.unsplash.com/photo-1623245225040-0d788c0815c2?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 30,
    sku: 'BEV-004'
  }
];

const PAYMENT_METHODS = ['cash', 'card', 'contactless', 'mobile'];

// Helper functions
const generateRandomDate = (daysAgo) => {
  const now = new Date();
  const startDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
  const randomTime = startDate.getTime() + Math.random() * (now.getTime() - startDate.getTime());
  return new Date(randomTime);
};

const getRandomItem = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

const generateWeightedProductSales = (products) => {
  const weights = {
    'A1': 25, 'A2': 20, 'A3': 15, 'B1': 20, 'B2': 18,
    'C1': 12, 'C2': 10, 'D1': 8, 'D2': 6, 'D3': 15
  };

  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const [slot, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      return products.find(p => p.slot === slot);
    }
  }
  
  return products[0];
};

const generateBusinessHourTime = (baseDate) => {
  const businessHours = [
    { start: 7, end: 10, weight: 15 },
    { start: 10, end: 12, weight: 8 },
    { start: 12, end: 14, weight: 25 },
    { start: 14, end: 16, weight: 12 },
    { start: 16, end: 18, weight: 20 },
    { start: 18, end: 22, weight: 10 }
  ];

  const totalWeight = businessHours.reduce((sum, hour) => sum + hour.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const period of businessHours) {
    random -= period.weight;
    if (random <= 0) {
      const hour = period.start + Math.random() * (period.end - period.start);
      const minute = Math.random() * 60;
      
      const saleDate = new Date(baseDate);
      saleDate.setHours(Math.floor(hour), Math.floor(minute), 0, 0);
      return saleDate;
    }
  }
  
  return baseDate;
};

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

// Seeding functions
class CLISeeder {
  constructor() {
    this.createdProducts = [];
    this.totalSalesGenerated = 0;
  }

  async seedProducts() {
    console.log('🛍️ Seeding products...');
    
    const batch = db.batch();
    
    for (const productData of SAMPLE_PRODUCTS) {
      const productRef = db.collection('products').doc();
      batch.set(productRef, {
        ...productData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      this.createdProducts.push({ ...productData, id: productRef.id });
      
      // Set up inventory
      const inventoryRef = db.collection('inventory').doc(productData.slot);
      batch.set(inventoryRef, {
        slot: productData.slot,
        productId: productRef.id,
        quantity: Math.floor(Math.random() * productData.maxCapacity * 0.8) + 2,
        maxCapacity: productData.maxCapacity,
        lowStockThreshold: 5,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    await batch.commit();
    console.log(`✅ Created ${this.createdProducts.length} products with inventory`);
  }

  async generateSales(daysBack = 30, salesPerDay = { min: 15, max: 45 }) {
    console.log(`📊 Generating sales data for ${daysBack} days...`);
    
    const batchSize = 500; // Firestore batch limit
    let currentBatch = db.batch();
    let batchCount = 0;
    
    for (let day = daysBack; day >= 0; day--) {
      const baseDate = generateRandomDate(day);
      const isWeekend = baseDate.getDay() === 0 || baseDate.getDay() === 6;
      
      const dailySalesCount = isWeekend 
        ? Math.floor(salesPerDay.min * 0.6) + Math.floor(Math.random() * (salesPerDay.max * 0.6 - salesPerDay.min * 0.6))
        : salesPerDay.min + Math.floor(Math.random() * (salesPerDay.max - salesPerDay.min));
      
      for (let i = 0; i < dailySalesCount; i++) {
        const product = generateWeightedProductSales(this.createdProducts);
        const saleTime = generateBusinessHourTime(baseDate);
        
        const saleRef = db.collection('sales').doc();
        currentBatch.set(saleRef, {
          productId: product.id,
          slot: product.slot,
          price: product.price,
          paymentMethod: getRandomItem(PAYMENT_METHODS),
          timestamp: admin.firestore.Timestamp.fromDate(saleTime)
        });
        
        this.totalSalesGenerated++;
        batchCount++;
        
        // Commit batch when it reaches the limit
        if (batchCount >= batchSize) {
          await currentBatch.commit();
          currentBatch = db.batch();
          batchCount = 0;
          
          // Progress indicator
          process.stdout.write('.');
        }
      }
      
      // Progress for each day
      if (day % 5 === 0) {
        process.stdout.write(`\n✅ Day ${daysBack - day + 1}/${daysBack + 1} completed`);
      }
    }
    
    // Commit any remaining operations
    if (batchCount > 0) {
      await currentBatch.commit();
    }
    
    console.log(`\n✅ Generated ${this.totalSalesGenerated} sales records`);
  }

  async seedDatabase(options = {}) {
    const {
      includeProducts = true,
      includeSales = true,
      daysBack = 30,
      salesPerDay = { min: 15, max: 45 }
    } = options;

    console.log('\n🚀 Starting database seeding...');
    const startTime = Date.now();
    
    if (includeProducts) {
      await this.seedProducts();
    }
    
    if (includeSales) {
      await this.generateSales(daysBack, salesPerDay);
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n🎉 Database seeding completed!');
    console.log(`⏱️  Time: ${duration} seconds`);
    console.log(`📊 Products: ${this.createdProducts.length}`);
    console.log(`📊 Sales: ${this.totalSalesGenerated}`);
    console.log(`💰 Est. Revenue: $${(this.totalSalesGenerated * 2.85).toFixed(2)}`);
  }
}

// Clearing functions
class CLICleaner {
  async clearCollection(collectionName) {
    console.log(`🧹 Clearing ${collectionName} collection...`);
    
    const batchSize = 500;
    let deletedCount = 0;
    
    while (true) {
      const snapshot = await db.collection(collectionName).limit(batchSize).get();
      
      if (snapshot.empty) {
        break;
      }
      
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });
      
      await batch.commit();
      process.stdout.write('.');
    }
    
    console.log(`\n✅ Deleted ${deletedCount} documents from ${collectionName}`);
    return deletedCount;
  }

  async clearDatabase(options = {}) {
    const {
      includeProducts = true,
      includeSales = true,
      includeInventory = true,
      includeMachineStatus = false
    } = options;

    console.log('\n🧹 Starting database cleanup...');
    const startTime = Date.now();
    let totalDeleted = 0;
    
    if (includeSales) {
      totalDeleted += await this.clearCollection('sales');
    }
    
    if (includeInventory) {
      totalDeleted += await this.clearCollection('inventory');
    }
    
    if (includeProducts) {
      totalDeleted += await this.clearCollection('products');
    }
    
    if (includeMachineStatus) {
      totalDeleted += await this.clearCollection('machine_status');
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n🎉 Database cleanup completed!');
    console.log(`⏱️  Time: ${duration} seconds`);
    console.log(`🗑️  Total deleted: ${totalDeleted} documents`);
  }
}

// Main CLI logic
async function main() {
  try {
    console.log('🏪 Vending Machine Database Management CLI');
    console.log('==========================================\n');

    const args = process.argv.slice(2);
    const command = args[0];

    if (command === 'seed') {
      const seeder = new CLISeeder();
      
      console.log('📋 Seeding Options:');
      console.log('1. Quick seed (7 days, basic data)');
      console.log('2. Full seed (30 days, comprehensive)');
      console.log('3. Large seed (60 days, extensive)');
      console.log('4. Custom seed');
      console.log('5. Products only');
      
      const choice = await askQuestion('\nSelect option (1-5): ');
      
      switch (choice) {
        case '1':
          await seeder.seedDatabase({ daysBack: 7, salesPerDay: { min: 10, max: 25 } });
          break;
        case '2':
          await seeder.seedDatabase({ daysBack: 30, salesPerDay: { min: 15, max: 40 } });
          break;
        case '3':
          await seeder.seedDatabase({ daysBack: 60, salesPerDay: { min: 20, max: 50 } });
          break;
        case '4':
          const days = await askQuestion('Days of history (default 30): ') || '30';
          const minSales = await askQuestion('Min sales per day (default 15): ') || '15';
          const maxSales = await askQuestion('Max sales per day (default 40): ') || '40';
          await seeder.seedDatabase({
            daysBack: parseInt(days),
            salesPerDay: { min: parseInt(minSales), max: parseInt(maxSales) }
          });
          break;
        case '5':
          await seeder.seedDatabase({ includeProducts: true, includeSales: false });
          break;
        default:
          console.log('❌ Invalid option');
          break;
      }
      
    } else if (command === 'clear') {
      const cleaner = new CLICleaner();
      
      console.log('🗑️  Cleanup Options:');
      console.log('1. Clear all data (products, sales, inventory)');
      console.log('2. Clear sales only');
      console.log('3. Clear products only');
      console.log('4. Clear inventory only');
      console.log('5. Custom cleanup');
      
      const choice = await askQuestion('\nSelect option (1-5): ');
      const confirm = await askQuestion('⚠️  This will permanently delete data. Continue? (y/N): ');
      
      if (confirm.toLowerCase() !== 'y') {
        console.log('❌ Operation cancelled');
        process.exit(0);
      }
      
      switch (choice) {
        case '1':
          await cleaner.clearDatabase({ includeProducts: true, includeSales: true, includeInventory: true });
          break;
        case '2':
          await cleaner.clearDatabase({ includeProducts: false, includeSales: true, includeInventory: false });
          break;
        case '3':
          await cleaner.clearDatabase({ includeProducts: true, includeSales: false, includeInventory: false });
          break;
        case '4':
          await cleaner.clearDatabase({ includeProducts: false, includeSales: false, includeInventory: true });
          break;
        case '5':
          console.log('Custom cleanup - specify what to clear:');
          const clearProducts = await askQuestion('Clear products? (y/N): ');
          const clearSales = await askQuestion('Clear sales? (y/N): ');
          const clearInventory = await askQuestion('Clear inventory? (y/N): ');
          await cleaner.clearDatabase({
            includeProducts: clearProducts.toLowerCase() === 'y',
            includeSales: clearSales.toLowerCase() === 'y',
            includeInventory: clearInventory.toLowerCase() === 'y'
          });
          break;
        default:
          console.log('❌ Invalid option');
          break;
      }
      
    } else {
      console.log('📖 Usage:');
      console.log('  npm run seed       - Seed database with sample data');
      console.log('  npm run clear-db   - Clear database data');
      console.log('\nOr directly:');
      console.log('  node scripts/seed.js seed');
      console.log('  node scripts/seed.js clear');
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

module.exports = { CLISeeder, CLICleaner };