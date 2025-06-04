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

// New Zealand products for today's demo
const NZ_PRODUCTS_TODAY = [
  {
    name: "Griffin's Gingernuts",
    price: 10.00,
    category: 'snacks',
    slot: 'Slot 1',
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 20,
    sku: 'NZ-001',
    quantity: 10,
    salesToday: 1
  },
  {
    name: 'Bluebird Chips',
    price: 10.00,
    category: 'snacks',
    slot: 'Slot 2',
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 20,
    sku: 'NZ-002',
    quantity: 10,
    salesToday: 2
  },
  {
    name: "Whittaker's Peanut Slab",
    price: 10.00,
    category: 'candy',
    slot: 'Slot 3',
    image: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 20,
    sku: 'NZ-003',
    quantity: 10,
    salesToday: 3
  },
  {
    name: 'Cookie Time Cookie',
    price: 10.00,
    category: 'snacks',
    slot: 'Slot 4',
    image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 20,
    sku: 'NZ-004',
    quantity: 10,
    salesToday: 4
  },
  {
    name: 'Eta Ripples',
    price: 10.00,
    category: 'snacks',
    slot: 'Slot 5',
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 20,
    sku: 'NZ-005',
    quantity: 10,
    salesToday: 5
  },
  {
    name: "RJ's Licorice",
    price: 10.00,
    category: 'candy',
    slot: 'Slot 6',
    image: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 20,
    sku: 'NZ-006',
    quantity: 10,
    salesToday: 6
  },
  {
    name: 'Pascall Pineapple Lumps',
    price: 10.00,
    category: 'candy',
    slot: 'Slot 7',
    image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 20,
    sku: 'NZ-007',
    quantity: 10,
    salesToday: 7
  },
  {
    name: "Griffin's MallowPuffs",
    price: 10.00,
    category: 'snacks',
    slot: 'Slot 8',
    image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 20,
    sku: 'NZ-008',
    quantity: 10,
    salesToday: 8
  },
  {
    name: 'Proper Crisps',
    price: 10.00,
    category: 'snacks',
    slot: 'Slot 9',
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 20,
    sku: 'NZ-009',
    quantity: 10,
    salesToday: 9
  },
  {
    name: 'Nice & Natural Nut Bars',
    price: 10.00,
    category: 'healthy',
    slot: 'Slot 10',
    image: 'https://images.unsplash.com/photo-1527617834522-fae101ccc5fd?w=300&h=300&fit=crop',
    active: true,
    maxCapacity: 20,
    sku: 'NZ-010',
    quantity: 10,
    salesToday: 10
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

// Generate today's sales throughout the day
const generateTodaysSales = (baseDate, hour, minute = null) => {
  const saleDate = new Date(baseDate);
  const actualMinute = minute !== null ? minute : Math.random() * 60;
  saleDate.setHours(hour, Math.floor(actualMinute), Math.floor(Math.random() * 60), 0);
  return saleDate;
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
    this.singleProduct = null;
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

  // NEW: Create a single custom product
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
    
    // Create product
    const productRef = db.collection('products').doc();
    batch.set(productRef, {
      ...productData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Create inventory
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
    
    this.singleProduct = { ...productData, id: productRef.id };
    this.createdProducts = [this.singleProduct];
    
    console.log(`✅ Created product: ${name} in slot ${slot}`);
    console.log(`💰 Price: $${price.toFixed(2)}`);
    console.log(`📦 Quantity: ${quantity}/${maxCapacity}`);
    console.log(`🆔 Product ID: ${productRef.id}`);
    
    return true;
  }

  // NEW: Generate sales for the single product
  async generateSalesForSingleProduct() {
    if (!this.singleProduct) {
      // Try to find the most recently created product
      console.log('🔍 Looking for recently created product...');
      const productsSnapshot = await db.collection('products')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (productsSnapshot.empty) {
        console.log('❌ No products found. Please create a product first (option 8).');
        return false;
      }
      
      const productDoc = productsSnapshot.docs[0];
      this.singleProduct = { id: productDoc.id, ...productDoc.data() };
      console.log(`📦 Found product: ${this.singleProduct.name}`);
    }
    
    // Get current inventory
    const inventoryDoc = await db.collection('inventory').doc(this.singleProduct.slot).get();
    if (!inventoryDoc.exists) {
      console.log('❌ No inventory found for this product.');
      return false;
    }
    
    const currentInventory = inventoryDoc.data();
    const currentQuantity = currentInventory.quantity;
    
    console.log(`\n📊 Generating sales for: ${this.singleProduct.name}`);
    console.log(`📦 Current inventory: ${currentQuantity} units`);
    
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
    
    console.log('\nSales time options:');
    console.log('1. Today only');
    console.log('2. Last 7 days');
    console.log('3. Last 30 days');
    console.log('4. Custom date range');
    
    const timeOption = await askQuestion('Select time option (1-4): ') || '1';
    
    let startDate, endDate;
    const now = new Date();
    
    switch (timeOption) {
      case '1':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        break;
      case '2':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        endDate = new Date(now);
        break;
      case '3':
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        endDate = new Date(now);
        break;
      case '4':
        const daysBackInput = await askQuestion('Days back from today (default 7): ') || '7';
        const daysBack = parseInt(daysBackInput);
        startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
        endDate = new Date(now);
        break;
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
    }
    
    console.log(`\n⏰ Generating ${salesCount} sales between ${startDate.toLocaleDateString()} and ${endDate.toLocaleDateString()}`);
    
    const batch = db.batch();
    
    for (let i = 0; i < salesCount; i++) {
      // Generate random time between start and end date
      const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
      let saleTime = new Date(randomTime);
      
      // If it's a business day, adjust to business hours
      if (saleTime.getDay() >= 1 && saleTime.getDay() <= 5) {
        saleTime = generateBusinessHourTime(saleTime);
      }
      
      const saleRef = db.collection('sales').doc();
      batch.set(saleRef, {
        productId: this.singleProduct.id,
        slot: this.singleProduct.slot,
        price: this.singleProduct.price,
        paymentMethod: getRandomItem(PAYMENT_METHODS),
        timestamp: admin.firestore.Timestamp.fromDate(saleTime)
      });
      
      this.totalSalesGenerated++;
    }
    
    // Update inventory - deduct the sold quantity
    const inventoryRef = db.collection('inventory').doc(this.singleProduct.slot);
    const newQuantity = currentQuantity - salesCount;
    batch.update(inventoryRef, {
      quantity: newQuantity,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await batch.commit();
    
    const totalRevenue = salesCount * this.singleProduct.price;
    
    console.log(`✅ Generated ${salesCount} sales for ${this.singleProduct.name}`);
    console.log(`💰 Total revenue: ${totalRevenue.toFixed(2)}`);
    console.log(`📦 Inventory updated: ${currentQuantity} → ${newQuantity} units`);
    console.log(`📊 Average sales per day: ${(salesCount / Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000))).toFixed(1)}`);
    
    if (newQuantity <= currentInventory.lowStockThreshold) {
      console.log(`⚠️  Low stock warning: Only ${newQuantity} units remaining (threshold: ${currentInventory.lowStockThreshold})`);
    }
    
    return true;
  }

  // NEW: Seed NZ products for today's demo
  async seedNZProductsToday() {
    console.log('🇳🇿 Seeding New Zealand products for today...');
    
    const batch = db.batch();
    this.createdProducts = [];
    
    for (const productData of NZ_PRODUCTS_TODAY) {
      const productRef = db.collection('products').doc();
      const { quantity, salesToday, ...productInfo } = productData;
      
      batch.set(productRef, {
        ...productInfo,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      this.createdProducts.push({ ...productData, id: productRef.id });
      
      // Set up inventory with the specified quantity
      const inventoryRef = db.collection('inventory').doc(productData.slot);
      batch.set(inventoryRef, {
        slot: productData.slot,
        productId: productRef.id,
        quantity: quantity,
        maxCapacity: productData.maxCapacity,
        lowStockThreshold: 5,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    await batch.commit();
    console.log(`✅ Created ${this.createdProducts.length} NZ products with inventory`);
  }

  // NEW: Generate today's sales for NZ products
  async generateTodaysSalesForNZ() {
    console.log('📊 Generating today\'s sales for NZ products...');
    
    const batch = db.batch();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let totalSales = 0;
    
    for (const product of this.createdProducts) {
      const salesCount = product.salesToday;
      
      // Generate sales throughout the day
      for (let i = 0; i < salesCount; i++) {
        // Spread sales throughout business hours (8 AM to 8 PM)
        const hourSpread = 12; // 8 AM to 8 PM = 12 hours
        const baseHour = 8; // Start at 8 AM
        const saleHour = baseHour + Math.floor((i / salesCount) * hourSpread);
        const saleMinute = Math.random() * 60;
        
        const saleTime = generateTodaysSales(today, saleHour, saleMinute);
        
        const saleRef = db.collection('sales').doc();
        batch.set(saleRef, {
          productId: product.id,
          slot: product.slot,
          price: product.price,
          paymentMethod: getRandomItem(PAYMENT_METHODS),
          timestamp: admin.firestore.Timestamp.fromDate(saleTime)
        });
        
        totalSales++;
      }
      
      // Update inventory - deduct the sold quantity
      const inventoryRef = db.collection('inventory').doc(product.slot);
      const newQuantity = product.quantity - product.salesToday;
      batch.update(inventoryRef, {
        quantity: newQuantity,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    await batch.commit();
    this.totalSalesGenerated = totalSales;
    console.log(`✅ Generated ${totalSales} sales for today`);
    console.log(`📦 Updated inventory for all ${this.createdProducts.length} products`);
  }

  async generateSales(daysBack = 30, salesPerDay = { min: 15, max: 45 }) {
    console.log(`📊 Generating sales data for ${daysBack} days...`);
    
    // Track inventory changes for each product
    const inventoryChanges = {};
    this.createdProducts.forEach(product => {
      inventoryChanges[product.slot] = 0; // Track total sales per slot
    });
    
    const batchSize = 400; // Reduced batch size to accommodate inventory updates
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
        
        // Track inventory change
        inventoryChanges[product.slot]++;
        
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
    
    // Commit any remaining sales operations
    if (batchCount > 0) {
      await currentBatch.commit();
    }
    
    console.log(`\n📦 Updating inventory for ${Object.keys(inventoryChanges).length} products...`);
    
    // Update inventory in batches
    const inventoryBatch = db.batch();
    let inventoryUpdates = 0;
    
    for (const [slot, totalSold] of Object.entries(inventoryChanges)) {
      if (totalSold > 0) {
        const inventoryRef = db.collection('inventory').doc(slot);
        
        // Get current inventory to calculate new quantity
        const inventoryDoc = await inventoryRef.get();
        if (inventoryDoc.exists) {
          const currentData = inventoryDoc.data();
          const newQuantity = Math.max(0, currentData.quantity - totalSold);
          
          inventoryBatch.update(inventoryRef, {
            quantity: newQuantity,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          inventoryUpdates++;
          
          // Log low stock warnings
          if (newQuantity <= currentData.lowStockThreshold) {
            console.log(`⚠️  Low stock: ${slot} has ${newQuantity} units remaining`);
          }
        }
      }
    }
    
    if (inventoryUpdates > 0) {
      await inventoryBatch.commit();
      console.log(`✅ Updated inventory for ${inventoryUpdates} products`);
    }
    
    console.log(`\n✅ Generated ${this.totalSalesGenerated} sales records`);
    
    // Summary of inventory changes
    console.log('\n📊 Inventory Summary:');
    for (const [slot, totalSold] of Object.entries(inventoryChanges)) {
      if (totalSold > 0) {
        const product = this.createdProducts.find(p => p.slot === slot);
        console.log(`   ${slot} (${product?.name}): ${totalSold} units sold`);
      }
    }
  }

  async seedDatabase(options = {}) {
    const {
      includeProducts = true,
      includeSales = true,
      daysBack = 30,
      salesPerDay = { min: 15, max: 45 },
      useNZProducts = false
    } = options;

    console.log('\n🚀 Starting database seeding...');
    const startTime = Date.now();
    
    if (includeProducts) {
      if (useNZProducts) {
        await this.seedNZProductsToday();
        if (includeSales) {
          await this.generateTodaysSalesForNZ();
        }
      } else {
        await this.seedProducts();
        if (includeSales) {
          await this.generateSales(daysBack, salesPerDay);
        }
      }
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n🎉 Database seeding completed!');
    console.log(`⏱️  Time: ${duration} seconds`);
    console.log(`📊 Products: ${this.createdProducts.length}`);
    console.log(`📊 Sales: ${this.totalSalesGenerated}`);
    if (useNZProducts) {
      console.log(`💰 Today's Revenue: $${(this.totalSalesGenerated * 10).toFixed(2)}`);
      console.log(`🇳🇿 All products priced at $10.00 NZD`);
    } else {
      console.log(`💰 Est. Revenue: ${(this.totalSalesGenerated * 2.85).toFixed(2)}`);
    }
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
      console.log('6. 🇳🇿 Today\'s NZ Products & Sales (Demo)');
      console.log('7. ──────────────────────────────────');
      console.log('8. 🛍️  Create Single Product');
      console.log('9. 📊 Generate Sales for Single Product');
      
      const choice = await askQuestion('\nSelect option (1-9): ');
      
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
        case '6':
          console.log('\n🇳🇿 Creating today\'s demo with New Zealand products...');
          console.log('📦 This will create 10 NZ products with today\'s sales data');
          console.log('💰 All products: $10.00 NZD');
          console.log('📊 Sales range: 1-10 sales per product today\n');
          await seeder.seedDatabase({ 
            includeProducts: true, 
            includeSales: true, 
            useNZProducts: true 
          });
          break;
        case '8':
          console.log('\n🛍️ Creating a single custom product...');
          console.log('📝 You will be prompted for product details\n');
          const created = await seeder.createSingleProduct();
          if (created) {
            const generateSales = await askQuestion('\n🎯 Generate sales for this product now? (y/N): ');
            if (generateSales.toLowerCase() === 'y') {
              await seeder.generateSalesForSingleProduct();
            }
          }
          break;
        case '9':
          console.log('\n📊 Generating sales for a single product...');
          console.log('🔍 This will work with the most recently created product\n');
          await seeder.generateSalesForSingleProduct();
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
      console.log('\n🆕 New Options:');
      console.log('  Option 8: Create a single custom product');
      console.log('  Option 9: Generate sales for single product');
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