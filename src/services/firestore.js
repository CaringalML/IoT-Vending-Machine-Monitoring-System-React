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
  writeBatch,
  Timestamp // CORRECT: Import Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { subDays } from 'date-fns'; // CORRECT: Import subDays for reliable date math

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
    
    // If product has a slot, mark it as deleted but keep the inventory slot
    if (productData.slot) {
      const inventoryRef = doc(db, 'inventory', productData.slot);
      const inventorySnap = await getDoc(inventoryRef);
      
      if (inventorySnap.exists()) {
        await updateDoc(inventoryRef, {
          productId: null, // Clear current product
          deletedProductName: productData.name || 'Unknown Product',
          deletedProductSKU: productData.sku || null,
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
          // Preserve quantity, maxCapacity, etc.
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

// Enhanced inventory update function with history preservation
export const updateInventory = async (slotId, inventoryData) => {
  console.log(`updateInventory called for slot: ${slotId}`, inventoryData);
  const inventoryRef = doc(db, 'inventory', slotId);
  
  // Check if inventory document exists
  const docSnap = await getDoc(inventoryRef);
  
  if (docSnap.exists()) {
    const existingData = docSnap.data();
    console.log(`Existing data for slot ${slotId}:`, existingData);
    
    // If there's a deleted product in this slot and we're adding a new product
    if (existingData.deletedProductName && !existingData.productId && inventoryData.productId) {
      console.log(`Slot ${slotId} has deleted product "${existingData.deletedProductName}" - preserving both old and new`);
      
      try {
        // Create a backup of the deleted product data with timestamp
        const deletedProductBackup = {
          slot: slotId,
          deletedProductName: existingData.deletedProductName,
          deletedProductSKU: existingData.deletedProductSKU,
          deletedAt: existingData.deletedAt,
          quantity: existingData.quantity || 0,
          maxCapacity: existingData.maxCapacity || 20,
          lowStockThreshold: existingData.lowStockThreshold || 5,
          lastRefilled: existingData.lastRefilled,
          archivedAt: serverTimestamp(),
          replacedByProductId: inventoryData.productId
        };
        
        // Store in a separate collection for old product history
        const historyRef = doc(collection(db, 'product_history'), `${slotId}_${Date.now()}`);
        await setDoc(historyRef, deletedProductBackup);
        console.log(`Created history record for ${slotId}`);
      } catch (historyError) {
        console.warn('Failed to create history record:', historyError);
        // Continue anyway - don't let history failure block the main operation
      }
      
      try {
        // Create a new inventory slot for the old deleted product with a unique ID
        const oldProductSlotId = `${slotId}_deleted_${Date.now()}`;
        const oldProductRef = doc(db, 'inventory', oldProductSlotId);
        const oldSlotData = {
          slot: `${slotId} (Old)`,
          productId: null,
          deletedProductName: existingData.deletedProductName,
          deletedProductSKU: existingData.deletedProductSKU,
          deletedAt: existingData.deletedAt,
          quantity: existingData.quantity || 0,
          maxCapacity: existingData.maxCapacity || 20,
          lowStockThreshold: existingData.lowStockThreshold || 5,
          lastRefilled: existingData.lastRefilled,
          createdAt: existingData.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
          isArchivedSlot: true
        };
        await setDoc(oldProductRef, oldSlotData);
        console.log(`Created archived slot ${oldProductSlotId}:`, oldSlotData);
      } catch (archiveError) {
        console.warn('Failed to create archived slot:', archiveError);
        // Continue anyway - at least update the main slot
      }
    }
    
    // Always update the current slot (whether we archived or not)
    const updateData = {
      ...inventoryData,
      slot: slotId, // Ensure slot name is preserved
      updatedAt: serverTimestamp()
    };
    
    // If we had a deleted product, clear those fields
    if (existingData.deletedProductName && inventoryData.productId) {
      updateData.deletedProductName = null;
      updateData.deletedProductSKU = null;
      updateData.deletedAt = null;
      updateData.isArchivedSlot = null;
    }
    
    await updateDoc(inventoryRef, updateData);
    console.log(`Updated current slot ${slotId} with:`, updateData);
    
  } else {
    // Create new inventory document if it doesn't exist
    console.log(`Creating new slot ${slotId}`);
    const newSlotData = {
      slot: slotId,
      quantity: 0,
      maxCapacity: 20,
      lowStockThreshold: 5,
      productId: null,
      lastRefilled: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...inventoryData
    };
    await setDoc(inventoryRef, newSlotData);
    console.log(`Created new slot ${slotId}:`, newSlotData);
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

// New function to delete a sale
export const deleteSale = async (saleId) => {
  try {
    const saleRef = doc(db, 'sales', saleId);
    await deleteDoc(saleRef);
    console.log(`Sale ${saleId} deleted successfully`);
    return true;
  } catch (error) {
    console.error('Error deleting sale:', error);
    throw new Error(`Failed to delete sale: ${error.message}`);
  }
};

// Real-time listeners
export const subscribeToInventory = (callback) => {
  const q = query(collection(db, 'inventory'), orderBy('slot'));
  return onSnapshot(q, (snapshot) => {
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
  const q = query(collection(db, 'products'), orderBy('name'));
  return onSnapshot(q, (snapshot) => {
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
/**
 * **CORRECTED FUNCTION**
 * Fetches all sales records from the last X days using Firestore Timestamps.
 * @param {number} days The number of days to look back.
 * @returns {Promise<Array>} A promise that resolves to an array of sales documents.
 */
export const getDailySales = async (days = 30) => {
    try {
        const endDate = new Date();
        const startDate = subDays(endDate, days);
        
        // The key fix: use Timestamp.fromDate() for reliable querying
        const startTimestamp = Timestamp.fromDate(startDate);
        const endTimestamp = Timestamp.fromDate(endDate);

        const q = query(
            collection(db, 'sales'),
            where('timestamp', '>=', startTimestamp),
            where('timestamp', '<=', endTimestamp),
            orderBy('timestamp', 'asc')
        );
        
        const querySnapshot = await getDocs(q);
        const salesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log(`[getDailySales] Fetched ${salesData.length} sales from the last ${days} days.`);
        return salesData;
    } catch (error) {
        console.error("[getDailySales] Error fetching daily sales:", error);
        // Provide a link to create the necessary Firestore index if that's the error
        if (error.code === 'failed-precondition') {
            console.error("This error usually means you need to create a composite index in Firestore. Please visit the link in the error message in the console to create it.");
        }
        return []; // Return an empty array on error to prevent crashes.
    }
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

// ===============================
// CUSTOM SLOTS SYSTEM
// ===============================

// Get available slots dynamically based on existing inventory + expansion
export const getAvailableSlots = async () => {
  try {
    // Get existing slots from inventory
    const inventorySnapshot = await getDocs(collection(db, 'inventory'));
    const existingSlots = inventorySnapshot.docs
      .map(doc => doc.data().slot)
      .filter(Boolean)
      .map(slot => {
        // Extract number from slot (handle both "Slot 1" and "1" formats)
        const match = slot.toString().match(/\d+/);
        return match ? parseInt(match[0]) : null;
      })
      .filter(num => num !== null);

    // Get the highest slot number
    const maxSlot = existingSlots.length > 0 ? Math.max(...existingSlots) : 0;
    
    // Generate slots up to maxSlot + buffer slots for expansion
    const bufferSlots = 20; // Always have 20 extra slots available
    const totalSlots = Math.max(20, maxSlot + bufferSlots); // Minimum 20 slots
    
    const availableSlots = [];
    for (let i = 1; i <= totalSlots; i++) {
      availableSlots.push(`Slot ${i}`);
    }
    
    console.log(`Generated ${availableSlots.length} available slots (existing: ${existingSlots.length}, max: ${maxSlot})`);
    return availableSlots;
    
  } catch (error) {
    console.error('Error getting available slots:', error);
    // Fallback to default slots
    const fallbackSlots = [];
    for (let i = 1; i <= 20; i++) {
      fallbackSlots.push(`Slot ${i}`);
    }
    return fallbackSlots;
  }
};

// Initialize inventory slots with numeric format
export const initializeNumericInventorySlots = async (numberOfSlots = 20) => {
  const slots = [];
  for (let i = 1; i <= numberOfSlots; i++) {
    slots.push(`Slot ${i}`);
  }
  
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
  console.log(`Initialized ${numberOfSlots} inventory slots`);
};

// Add new slots dynamically
export const addNewSlots = async (startSlot, endSlot) => {
  const batch = writeBatch(db);
  
  for (let i = startSlot; i <= endSlot; i++) {
    const slot = `Slot ${i}`;
    const inventoryRef = doc(db, 'inventory', slot);
    
    // Check if slot already exists
    const existingSlot = await getDoc(inventoryRef);
    if (!existingSlot.exists()) {
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
    }
  }
  
  await batch.commit();
  console.log(`Added slots ${startSlot} to ${endSlot}`);
};

// Get machine capacity info
export const getMachineCapacity = async () => {
  try {
    const inventorySnapshot = await getDocs(collection(db, 'inventory'));
    const slots = inventorySnapshot.docs.map(doc => doc.data().slot).filter(Boolean);
    
    const slotNumbers = slots
      .map(slot => {
        const match = slot.toString().match(/\d+/);
        return match ? parseInt(match[0]) : null;
      })
      .filter(num => num !== null);
    
    const totalSlots = slotNumbers.length;
    const maxSlotNumber = slotNumbers.length > 0 ? Math.max(...slotNumbers) : 0;
    const occupiedSlots = inventorySnapshot.docs.filter(doc => doc.data().productId).length;
    
    return {
      totalSlots,
      maxSlotNumber,
      occupiedSlots,
      availableSlots: totalSlots - occupiedSlots
    };
  } catch (error) {
    console.error('Error getting machine capacity:', error);
    return {
      totalSlots: 0,
      maxSlotNumber: 0,
      occupiedSlots: 0,
      availableSlots: 0
    };
  }
};

// Get machine configuration
export const getMachineConfig = async () => {
  try {
    const configRef = doc(db, 'machine_config', 'layout');
    const configSnap = await getDoc(configRef);
    
    if (configSnap.exists()) {
      return configSnap.data();
    } else {
      // Return default config
      return {
        maxSlots: 100,
        defaultCapacity: 20,
        bufferSlots: 20,
        autoExpand: true
      };
    }
  } catch (error) {
    console.error('Error getting machine config:', error);
    return {
      maxSlots: 100,
      defaultCapacity: 20,
      bufferSlots: 20,
      autoExpand: true
    };
  }
};

// Update machine configuration
export const updateMachineConfig = async (config) => {
  try {
    const configRef = doc(db, 'machine_config', 'layout');
    await setDoc(configRef, {
      ...config,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log('Machine configuration updated');
  } catch (error) {
    console.error('Error updating machine config:', error);
    throw error;
  }
};

// ===============================
// UPDATED LEGACY FUNCTIONS
// ===============================

// Updated: Initialize inventory slots with numeric format (replaces old function)
export const initializeInventorySlots = async () => {
  // Use new numeric format instead of A1, B2, etc.
  return await initializeNumericInventorySlots(20);
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
    where('timestamp', '<', Timestamp.fromDate(cutoffDate)) // Correct: Use Timestamp
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

// ===============================
// PRODUCT HISTORY FUNCTIONS
// ===============================

// New function to get product history for a slot
export const getProductHistoryBySlot = async (slot) => {
  try {
    // Try with orderBy first
    const q = query(
      collection(db, 'product_history'),
      where('slot', '==', slot),
      orderBy('archivedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error with ordered query, trying simple query:', error);
    try {
      // Fallback to simple query without orderBy if there's no index
      const q = query(
        collection(db, 'product_history'),
        where('slot', '==', slot)
      );
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory
      return docs.sort((a, b) => {
        const aTime = a.archivedAt?.seconds || 0;
        const bTime = b.archivedAt?.seconds || 0;
        return bTime - aTime;
      });
    } catch (fallbackError) {
      console.error('Error getting product history by slot:', fallbackError);
      return [];
    }
  }
};

// New function to get all product history
export const getAllProductHistory = async () => {
  try {
    // Try with orderBy first
    const q = query(
      collection(db, 'product_history'),
      orderBy('archivedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error with ordered query, trying simple query:', error);
    try {
      // Fallback to simple query without orderBy if there's no index
      const querySnapshot = await getDocs(collection(db, 'product_history'));
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory
      return docs.sort((a, b) => {
        const aTime = a.archivedAt?.seconds || 0;
        const bTime = b.archivedAt?.seconds || 0;
        return bTime - aTime;
      });
    } catch (fallbackError) {
      console.error('Error getting all product history:', fallbackError);
      return [];
    }
  }
};

// Optional: Function to restore a deleted product from history
export const restoreProductFromHistory = async (historyId, newProductData) => {
  try {
    const historyRef = doc(db, 'product_history', historyId);
    const historySnap = await getDoc(historyRef);
    
    if (historySnap.exists()) {
      const historyData = historySnap.data();
      
      // Create new product with restored data
      const productId = await addProduct({
        ...newProductData,
        name: newProductData.name || historyData.deletedProductName,
        sku: newProductData.sku || historyData.deletedProductSKU,
        slot: historyData.slot
      });
      
      // Update inventory to restore the old product
      await updateInventory(historyData.slot, {
        productId: productId,
        quantity: historyData.quantity || 0,
        maxCapacity: historyData.maxCapacity || 20,
        lowStockThreshold: historyData.lowStockThreshold || 5,
        lastRefilled: historyData.lastRefilled
      });
      
      return productId;
    }
    
    throw new Error('History record not found');
  } catch (error) {
    console.error('Error restoring product from history:', error);
    throw error;
  }
};

// ===============================
// MIGRATION UTILITIES
// ===============================

// Migration function to convert old letter-based slots to numeric slots
export const migrateToNumericSlots = async () => {
  try {
    console.log('Starting migration to numeric slots...');
    
    // Get all existing inventory and products
    const [inventory, products] = await Promise.all([
      getInventory(),
      getProducts()
    ]);
    
    // Create mapping from old slots to new slots
    const oldToNewSlotMapping = {};
    const oldSlots = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'D1', 'D2', 'D3', 'D4'];
    
    oldSlots.forEach((oldSlot, index) => {
      oldToNewSlotMapping[oldSlot] = `Slot ${index + 1}`;
    });
    
    const batch = writeBatch(db);
    let migratedCount = 0;
    
    // Migrate inventory
    for (const item of inventory) {
      if (item.slot && oldToNewSlotMapping[item.slot]) {
        const newSlot = oldToNewSlotMapping[item.slot];
        
        // Delete old inventory document
        const oldInventoryRef = doc(db, 'inventory', item.id);
        batch.delete(oldInventoryRef);
        
        // Create new inventory document with numeric slot
        const newInventoryRef = doc(db, 'inventory', newSlot);
        batch.set(newInventoryRef, {
          ...item,
          slot: newSlot,
          updatedAt: serverTimestamp()
        });
        
        migratedCount++;
      }
    }
    
    // Migrate products
    for (const product of products) {
      if (product.slot && oldToNewSlotMapping[product.slot]) {
        const newSlot = oldToNewSlotMapping[product.slot];
        
        const productRef = doc(db, 'products', product.id);
        batch.update(productRef, {
          slot: newSlot,
          updatedAt: serverTimestamp()
        });
        
        migratedCount++;
      }
    }
    
    // Commit all changes
    await batch.commit();
    
    console.log(`Migration completed! Migrated ${migratedCount} items to numeric slots.`);
    return migratedCount;
    
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
};

// ===============================
// UTILITY FUNCTIONS FOR CUSTOM SLOTS
// ===============================

// Check if a custom slot name is valid
export const isValidSlotName = (slotName) => {
  if (!slotName || typeof slotName !== 'string') return false;
  
  // Allow any alphanumeric characters, spaces, hyphens, underscores
  // Length between 1 and 50 characters
  const validPattern = /^[a-zA-Z0-9\s\-_()]+$/;
  return slotName.length >= 1 && slotName.length <= 50 && validPattern.test(slotName);
};

// Sanitize slot name (remove invalid characters)
export const sanitizeSlotName = (slotName) => {
  if (!slotName) return '';
  
  // Remove invalid characters and trim
  return slotName
    .replace(/[^a-zA-Z0-9\s\-_()]/g, '')
    .trim()
    .substring(0, 50);
};

// Get suggested slot names based on existing patterns
export const getSuggestedSlotNames = async (category = null) => {
  try {
    const inventory = await getInventory();
    const existingSlots = inventory.map(item => item.slot).filter(Boolean);
    
    // Generate suggestions based on category
    const suggestions = [];
    
    if (category) {
      const categoryPrefix = category.charAt(0).toUpperCase() + category.slice(1);
      for (let i = 1; i <= 10; i++) {
        const suggestion = `${categoryPrefix} ${i}`;
        if (!existingSlots.includes(suggestion)) {
          suggestions.push(suggestion);
        }
      }
    }
    
    // Add generic suggestions
    for (let i = 1; i <= 20; i++) {
      const suggestion = `Slot ${i}`;
      if (!existingSlots.includes(suggestion) && !suggestions.includes(suggestion)) {
        suggestions.push(suggestion);
      }
    }
    
    return suggestions.slice(0, 10); // Return top 10 suggestions
    
  } catch (error) {
    console.error('Error getting suggested slot names:', error);
    return [];
  }
};

// Check for duplicate slot names
export const checkSlotNameAvailability = async (slotName, excludeProductId = null) => {
  try {
    const products = await getProducts();
    const existingProduct = products.find(p => 
      p.slot && 
      p.slot.toLowerCase() === slotName.toLowerCase() && 
      p.id !== excludeProductId
    );
    
    return !existingProduct;
  } catch (error) {
    console.error('Error checking slot name availability:', error);
    return false;
  }
};

// Get all unique slot names in use
export const getAllUsedSlotNames = async () => {
  try {
    const [products, inventory] = await Promise.all([
      getProducts(),
      getInventory()
    ]);
    
    const productSlots = products.map(p => p.slot).filter(Boolean);
    const inventorySlots = inventory.map(i => i.slot).filter(Boolean);
    
    // Combine and deduplicate
    const allSlots = [...new Set([...productSlots, ...inventorySlots])];
    
    return allSlots.sort();
  } catch (error) {
    console.error('Error getting used slot names:', error);
    return [];
  }
};

// ===============================
// BATCH OPERATIONS
// ===============================

// Batch create multiple products
export const batchCreateProducts = async (productsData) => {
  try {
    const batch = writeBatch(db);
    const productIds = [];
    
    for (const productData of productsData) {
      const productRef = doc(collection(db, 'products'));
      const productId = productRef.id;
      
      batch.set(productRef, {
        ...productData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Create corresponding inventory slot
      if (productData.slot) {
        const inventoryRef = doc(db, 'inventory', productData.slot);
        batch.set(inventoryRef, {
          slot: productData.slot,
          productId: productId,
          quantity: 0,
          maxCapacity: productData.maxCapacity || 20,
          lowStockThreshold: 5,
          lastRefilled: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      productIds.push(productId);
    }
    
    await batch.commit();
    console.log(`Batch created ${productsData.length} products`);
    return productIds;
    
  } catch (error) {
    console.error('Error batch creating products:', error);
    throw error;
  }
};

// Batch update inventory quantities
export const batchUpdateInventoryQuantities = async (updates) => {
  try {
    const batch = writeBatch(db);
    
    updates.forEach(({ slotId, quantity }) => {
      const inventoryRef = doc(db, 'inventory', slotId);
      batch.update(inventoryRef, {
        quantity,
        lastRefilled: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
    console.log(`Batch updated ${updates.length} inventory quantities`);
    
  } catch (error) {
    console.error('Error batch updating inventory:', error);
    throw error;
  }
};

// ===============================
// EXPORT SUMMARY FOR REFERENCE
// ===============================

// Export summary for easy reference - this is just for documentation
export const FIRESTORE_FUNCTIONS = {
  // Products
  products: {
    get: getProducts,
    add: addProduct,
    update: updateProduct,
    delete: deleteProduct,
    subscribe: subscribeToProducts,
    getBySKU: getProductBySKU,
    getByCategory: getProductsByCategory,
    getActive: getActiveProducts,
    batchCreate: batchCreateProducts
  },
  
  // Inventory
  inventory: {
    get: getInventory,
    update: updateInventory,
    updateQuantity: updateInventoryQuantity,
    refill: refillInventory,
    subscribe: subscribeToInventory,
    getBySlot: getInventoryBySlot,
    getLowStock: getLowStockItems,
    getOutOfStock: getOutOfStockItems,
    clearSlot: clearInventorySlot,
    batchUpdate: batchUpdateInventoryQuantities,
    cleanup: cleanupOrphanedInventorySlots
  },
  
  // Sales
  sales: {
    get: getSales,
    add: addSale,
    delete: deleteSale, // Added deleteSale function
    subscribe: subscribeToSales,
    getDaily: getDailySales,
    getTopProducts: getTopProducts,
    getAnalytics: getSalesAnalytics,
    cleanup: cleanupOldSales
  },
  
  // Machine
  machine: {
    getStatus: getMachineStatus,
    updateStatus: updateMachineStatus,
    subscribeToStatus: subscribeToMachineStatus,
    getConfig: getMachineConfig,
    updateConfig: updateMachineConfig,
    getCapacity: getMachineCapacity
  },
  
  // History
  history: {
    getAll: getAllProductHistory,
    getBySlot: getProductHistoryBySlot,
    restore: restoreProductFromHistory
  },
  
  // Slots
  slots: {
    getAvailable: getAvailableSlots,
    addNew: addNewSlots,
    initialize: initializeInventorySlots,
    isValidName: isValidSlotName,
    sanitizeName: sanitizeSlotName,
    getSuggestions: getSuggestedSlotNames,
    checkAvailability: checkSlotNameAvailability,
    getAllUsed: getAllUsedSlotNames
  },
  
  // System
  system: {
    getStats: getSystemStats,
    syncInventoryWithProducts: syncInventoryWithProducts,
    migrateToNumeric: migrateToNumericSlots
  }
};