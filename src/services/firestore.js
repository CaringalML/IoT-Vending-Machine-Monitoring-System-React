import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
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
  await deleteDoc(doc(db, 'products', productId));
};

// Inventory
export const getInventory = async () => {
  const querySnapshot = await getDocs(collection(db, 'inventory'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateInventory = async (slotId, quantity) => {
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