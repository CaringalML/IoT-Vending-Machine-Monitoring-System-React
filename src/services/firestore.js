import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

// Products
export const getProducts = async () => {
  const querySnapshot = await getDocs(collection(db, 'products'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addProduct = async (productData) => {
  const docRef = await addDoc(collection(db, 'products'), {
    ...productData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateProduct = async (productId, updates) => {
  const productRef = doc(db, 'products', productId);
  await updateDoc(productRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

export const deleteProduct = async (productId) => {
  // Get the product first to find its slot
  const productRef = doc(db, 'products', productId);
  const productSnap = await getDoc(productRef);
  
  if (productSnap.exists()) {
    const productData = productSnap.data();
    
    // Delete the product
    await deleteDoc(productRef);
    
    // If product has a slot, clear the productId from inventory but keep the slot
    if (productData.slot) {
      const inventoryRef = doc(db, 'inventory', productData.slot);
      const inventorySnap = await getDoc(inventoryRef);
      
      if (inventorySnap.exists()) {
        await updateDoc(inventoryRef, {
          productId: null, // Mark as deleted product
          deletedProductName: productData.name || 'Unknown Product',
          deletedProductSKU: productData.sku || null,
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }
  } else {
    // Product doesn't exist, just try to delete it
    await deleteDoc(productRef);
  }
};

// Inventory
export const getInventory = async () => {
  const querySnapshot = await getDocs(collection(db, 'inventory'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Enhanced inventory update function
export const updateInventory = async (slotId, inventoryData) => {
  const inventoryRef = doc(db, 'inventory', slotId);
  
  // Check if inventory document exists
  const docSnap = await getDoc(inventoryRef);
  
  if (docSnap.exists()) {
    // Update existing inventory
    await updateDoc(inventoryRef, {
      ...inventoryData,
      updatedAt: serverTimestamp()
    });
  } else {
    // Create new inventory document if it doesn't exist
    await setDoc(inventoryRef, {
      slot: slotId,
      quantity: 0,
      maxCapacity: 20,
      lowStockThreshold: 5,
      productId: null,
      lastRefilled: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...inventoryData
    });
  }
};

// Legacy updateInventory function for backward compatibility
export const updateInventoryQuantity = async (slotId, quantity) => {
  const inventoryRef = doc(db, 'inventory', slotId);
  await updateDoc(inventoryRef, {
    quantity,
    updatedAt: serverTimestamp()
  });
};

export const refillInventory = async (slotId, quantity) => {
  const inventoryRef = doc(db, 'inventory', slotId);
  await updateDoc(inventoryRef, {
    quantity,
    lastRefilled: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

// Sales
export const getSales = async (startDate, endDate) => {
  let q = collection(db, 'sales');
  
  if (startDate && endDate) {
    q = query(
      collection(db, 'sales'),
      where('timestamp', '>=', startDate),
      where('timestamp', '<=', endDate),
      orderBy('timestamp', 'desc')
    );
  } else {
    q = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(100));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addSale = async (saleData) => {
  const docRef = await addDoc(collection(db, 'sales'), {
    ...saleData,
    timestamp: serverTimestamp()
  });
  return docRef.id;
};

// Real-time listeners
export const subscribeToInventory = (callback) => {
  return onSnapshot(collection(db, 'inventory'), (snapshot) => {
    const inventory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(inventory);
  });
};

export const subscribeToSales = (callback) => {
  const q = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(sales);
  });
};

export const subscribeToProducts = (callback) => {
  return onSnapshot(collection(db, 'products'), (snapshot) => {
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(products);
  });
};

// Machine Status
export const updateMachineStatus = async (status) => {
  const statusRef = doc(db, 'machine_status', process.env.REACT_APP_MACHINE_ID || 'ESP32_001');
  await updateDoc(statusRef, {
    ...status,
    lastUpdated: serverTimestamp()
  });
};

export const getMachineStatus = async () => {
  const statusRef = doc(db, 'machine_status', process.env.REACT_APP_MACHINE_ID || 'ESP32_001');
  const docSnap = await getDoc(statusRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const subscribeToMachineStatus = (callback) => {
  const statusRef = doc(db, 'machine_status', process.env.REACT_APP_MACHINE_ID || 'ESP32_001');
  return onSnapshot(statusRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
};

// Analytics helpers
export const getDailySales = async (days = 30) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const q = query(
    collection(db, 'sales'),
    where('timestamp', '>=', startDate),
    where('timestamp', '<=', endDate),
    orderBy('timestamp', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getTopProducts = async (limitCount = 10) => {
  const sales = await getSales();
  const productSales = {};
  
  sales.forEach(sale => {
    if (productSales[sale.productId]) {
      productSales[sale.productId].count += 1;
      productSales[sale.productId].revenue += sale.price;
    } else {
      productSales[sale.productId] = {
        productId: sale.productId,
        count: 1,
        revenue: sale.price
      };
    }
  });
  
  return Object.values(productSales)
    .sort((a, b) => b.count - a.count)
    .slice(0, limitCount);
};

// Admin utilities
export const getSystemStats = async () => {
  try {
    const [productsSnap, inventorySnap, salesSnap] = await Promise.all([
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'inventory')),
      getDocs(query(collection(db, 'sales'), limit(1000)))
    ]);

    const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const inventory = inventorySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const sales = salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.price || 0), 0);
    const lowStockItems = inventory.filter(item => 
      item.quantity <= (item.lowStockThreshold || 5)
    ).length;
    const activeProducts = products.filter(product => product.active).length;

    return {
      totalProducts: products.length,
      activeProducts,
      totalSales: sales.length,
      totalRevenue,
      lowStockItems,
      outOfStockItems: inventory.filter(item => item.quantity === 0).length
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    return {
      totalProducts: 0,
      activeProducts: 0,
      totalSales: 0,
      totalRevenue: 0,
      lowStockItems: 0,
      outOfStockItems: 0
    };
  }
};

// Bulk operations
export const bulkUpdateInventory = async (updates) => {
  const batch = writeBatch(db);
  
  updates.forEach(({ slotId, quantity }) => {
    const inventoryRef = doc(db, 'inventory', slotId);
    batch.update(inventoryRef, {
      quantity,
      updatedAt: serverTimestamp()
    });
  });
  
  await batch.commit();
};

export const initializeInventorySlots = async () => {
  const slots = [
    'A1', 'A2', 'A3', 'A4',
    'B1', 'B2', 'B3', 'B4',
    'C1', 'C2', 'C3', 'C4',
    'D1', 'D2', 'D3', 'D4'
  ];
  
  const batch = writeBatch(db);
  
  slots.forEach(slot => {
    const inventoryRef = doc(db, 'inventory', slot);
    batch.set(inventoryRef, {
      slot,
      productId: null,
      quantity: 0,
      maxCapacity: 20,
      lowStockThreshold: 5,
      lastRefilled: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });
  
  await batch.commit();
};

// Product-specific utilities
export const getProductBySKU = async (sku) => {
  const q = query(collection(db, 'products'), where('sku', '==', sku));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

export const getProductsByCategory = async (category) => {
  const q = query(collection(db, 'products'), where('category', '==', category));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getActiveProducts = async () => {
  const q = query(collection(db, 'products'), where('active', '==', true));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Inventory management utilities
export const getInventoryBySlot = async (slot) => {
  const inventoryRef = doc(db, 'inventory', slot);
  const docSnap = await getDoc(inventoryRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const getLowStockItems = async (threshold = 5) => {
  const inventory = await getInventory();
  return inventory.filter(item => 
    item.quantity <= (item.lowStockThreshold || threshold) && item.quantity > 0
  );
};

export const getOutOfStockItems = async () => {
  const inventory = await getInventory();
  return inventory.filter(item => item.quantity === 0);
};

// Advanced analytics
export const getSalesAnalytics = async (startDate, endDate) => {
  const sales = await getSales(startDate, endDate);
  const products = await getProducts();
  
  // Create product lookup
  const productLookup = products.reduce((acc, product) => {
    acc[product.id] = product;
    return acc;
  }, {});
  
  // Calculate analytics
  const analytics = {
    totalSales: sales.length,
    totalRevenue: sales.reduce((sum, sale) => sum + (sale.price || 0), 0),
    averageTransactionValue: 0,
    salesByCategory: {},
    salesByPaymentMethod: {},
    hourlyDistribution: Array(24).fill(0),
    topProducts: {}
  };
  
  // Calculate average transaction value
  if (analytics.totalSales > 0) {
    analytics.averageTransactionValue = analytics.totalRevenue / analytics.totalSales;
  }
  
  // Process each sale
  sales.forEach(sale => {
    const product = productLookup[sale.productId];
    const saleDate = new Date(sale.timestamp?.seconds * 1000);
    const hour = saleDate.getHours();
    
    // Sales by category
    if (product?.category) {
      analytics.salesByCategory[product.category] = 
        (analytics.salesByCategory[product.category] || 0) + 1;
    }
    
    // Sales by payment method
    const paymentMethod = sale.paymentMethod || 'cash';
    analytics.salesByPaymentMethod[paymentMethod] = 
      (analytics.salesByPaymentMethod[paymentMethod] || 0) + 1;
    
    // Hourly distribution
    analytics.hourlyDistribution[hour]++;
    
    // Top products
    if (analytics.topProducts[sale.productId]) {
      analytics.topProducts[sale.productId].count++;
      analytics.topProducts[sale.productId].revenue += sale.price || 0;
    } else {
      analytics.topProducts[sale.productId] = {
        product: product,
        count: 1,
        revenue: sale.price || 0
      };
    }
  });
  
  // Convert top products to sorted array
  analytics.topProductsList = Object.values(analytics.topProducts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return analytics;
};

// Clear inventory slot (remove old product data)
export const clearInventorySlot = async (slotId) => {
  const inventoryRef = doc(db, 'inventory', slotId);
  await deleteDoc(inventoryRef);
};

// Clean up orphaned inventory slots (slots with no product and no deleted product data)
export const cleanupOrphanedInventorySlots = async () => {
  const inventory = await getInventory();
  const batch = writeBatch(db);
  let cleanedCount = 0;

  inventory.forEach(item => {
    // If no productId and no deleted product data, it's orphaned
    if (!item.productId && !item.deletedProductName) {
      const inventoryRef = doc(db, 'inventory', item.id);
      batch.delete(inventoryRef);
      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    await batch.commit();
  }

  return cleanedCount;
};

// Get deleted products info from inventory
export const getDeletedProductsFromInventory = async () => {
  const inventory = await getInventory();
  return inventory.filter(item => 
    item.deletedProductName && !item.productId
  );
};
export const cleanupOldSales = async (daysToKeep = 90) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const q = query(
    collection(db, 'sales'),
    where('timestamp', '<', cutoffDate)
  );
  
  const querySnapshot = await getDocs(q);
  const batch = writeBatch(db);
  
  querySnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  if (querySnapshot.docs.length > 0) {
    await batch.commit();
    return querySnapshot.docs.length;
  }
  
  return 0;
};

export const syncInventoryWithProducts = async () => {
  const products = await getProducts();
  const inventory = await getInventory();
  
  const inventorySlots = inventory.reduce((acc, item) => {
    acc[item.slot] = item;
    return acc;
  }, {});
  
  const batch = writeBatch(db);
  let updates = 0;
  
  products.forEach(product => {
    if (product.slot) {
      const currentInventory = inventorySlots[product.slot];
      
      if (!currentInventory) {
        // Create inventory slot if it doesn't exist
        const inventoryRef = doc(db, 'inventory', product.slot);
        batch.set(inventoryRef, {
          slot: product.slot,
          productId: product.id,
          quantity: product.stock || 0,
          maxCapacity: 20,
          lowStockThreshold: 5,
          lastRefilled: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        updates++;
      } else if (currentInventory.productId !== product.id) {
        // Update inventory slot with correct product
        const inventoryRef = doc(db, 'inventory', product.slot);
        batch.update(inventoryRef, {
          productId: product.id,
          updatedAt: serverTimestamp()
        });
        updates++;
      }
    }
  });
  
  if (updates > 0) {
    await batch.commit();
  }
  
  return updates;
};