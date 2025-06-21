// src/services/FirestoreNotificationService.js - Production Version
import { 
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';

class FirestoreNotificationService {
  constructor() {
    this.notifications = [];
    this.listeners = [];
    this.settings = this.loadSettings();
    this.unsubscribeNotifications = null;
    this.unsubscribeInventory = null;
    this.unsubscribeProducts = null;
    this.unsubscribeSales = null;
    this.currentUserId = null;
    this.inventory = [];
    this.products = [];
    this.previousInventory = [];
    this.previousSales = [];
    this.isInitialized = false;

    this.audioContext = null;
    this.isAudioUnlocked = false;
  }

  // Initialize the service with user authentication
  async initialize(userId) {
    if (this.isInitialized && this.currentUserId === userId) return;
    
    // Clean up existing listeners if switching users
    if (this.currentUserId !== userId) {
      this.cleanup();
    }
    
    this.currentUserId = userId;
    this.isInitialized = true;
    
    this.setupRealtimeListeners();
  }

  // Clean up when user logs out
  cleanup() {
    if (this.unsubscribeNotifications) this.unsubscribeNotifications();
    if (this.unsubscribeInventory) this.unsubscribeInventory();
    if (this.unsubscribeProducts) this.unsubscribeProducts();
    if (this.unsubscribeSales) this.unsubscribeSales();
    
    this.notifications = [];
    this.inventory = [];
    this.products = [];
    this.previousInventory = [];
    this.previousSales = [];
    this.currentUserId = null;
    this.isInitialized = false;
  }

  unlockAudio() {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
        this.isAudioUnlocked = true;
      } catch (e) {
        console.warn('Could not create AudioContext:', e);
      }
    } else if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        this.isAudioUnlocked = true;
      });
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('notificationSettings');
      return saved ? JSON.parse(saved) : {
        enabled: true,
        sound: true,
        desktop: true,
        lowStock: true,
        outOfStock: true,
        sales: false,
        systemUpdates: true,
        lowStockThreshold: 5,
        quietHours: { 
          enabled: false, 
          start: '22:00', 
          end: '08:00' 
        }
      };
    } catch (error) {
      console.error('Error loading notification settings:', error);
      return { 
        enabled: true, 
        sound: true,
        desktop: true,
        lowStock: true, 
        outOfStock: true, 
        sales: false,
        systemUpdates: true,
        lowStockThreshold: 5,
        quietHours: { enabled: false, start: '22:00', end: '08:00' }
      };
    }
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
  }

  getSettings() {
    return this.settings;
  }

  setupRealtimeListeners() {
    this.setupNotificationsListener();
    this.setupInventoryMonitoring();
    this.setupProductsListener();
    this.setupSalesListener();
  }

  setupNotificationsListener() {
    if (!this.currentUserId) {
      console.warn('No user ID available for notifications listener');
      return;
    }

    // Try to use orderBy first, fall back to memory sorting if index missing
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', this.currentUserId),
      orderBy('timestamp', 'desc')
    );

    this.unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const firestoreNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const newNotifications = this.isInitialized ? 
        firestoreNotifications.filter(notification => 
          !this.notifications.find(existing => existing.id === notification.id)
        ) : [];
      
      this.notifications = firestoreNotifications;

      // Only show notifications for new items after initialization
      if (this.isInitialized && newNotifications.length > 0) {
        newNotifications.forEach(notification => {
          this.showBrowserNotification(notification);
          this.playNotificationSound(notification);
        });
      }

      this.notifyListeners();
    }, (error) => {
      console.error('Error in notifications listener:', error);
      
      // Fallback to query without orderBy if index missing
      if (error.code === 'failed-precondition') {
        this.setupFallbackNotificationsListener();
      }
    });
  }

  // Fallback listener without orderBy for when composite index is missing
  setupFallbackNotificationsListener() {
    if (!this.currentUserId) return;

    const fallbackQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', this.currentUserId)
    );
    
    this.unsubscribeNotifications = onSnapshot(fallbackQuery, (snapshot) => {
      const firestoreNotifications = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => {
          const aTime = a.timestamp?.seconds || 0;
          const bTime = b.timestamp?.seconds || 0;
          return bTime - aTime; // Descending order (newest first)
        });

      const newNotifications = this.isInitialized ? 
        firestoreNotifications.filter(notification => 
          !this.notifications.find(existing => existing.id === notification.id)
        ) : [];
      
      this.notifications = firestoreNotifications;

      if (this.isInitialized && newNotifications.length > 0) {
        newNotifications.forEach(notification => {
          this.showBrowserNotification(notification);
          this.playNotificationSound(notification);
        });
      }

      this.notifyListeners();
    }, (error) => {
      console.error('Error in fallback notifications listener:', error);
    });
  }

  setupInventoryMonitoring() {
    const inventoryQuery = query(collection(db, 'inventory'), orderBy('slot'));
    
    this.unsubscribeInventory = onSnapshot(inventoryQuery, (snapshot) => {
      this.previousInventory = [...this.inventory];
      this.inventory = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      // Only check for alerts after the initial load
      if (this.previousInventory.length > 0) {
        this.checkInventoryAlerts();
      }
    }, (error) => {
      console.error('Error in inventory listener:', error);
    });
  }

  setupProductsListener() {
    const productsQuery = query(collection(db, 'products'), orderBy('name'));
    
    this.unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      this.products = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
    }, (error) => {
      console.error('Error in products listener:', error);
    });
  }

  setupSalesListener() {
    const salesQuery = query(
      collection(db, 'sales'),
      orderBy('timestamp', 'desc')
    );
    
    this.unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
      const sales = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      // Only process new sales after initial load
      if (this.previousSales.length > 0) {
        const newSales = sales.filter(sale => 
          !this.previousSales.find(prev => prev.id === sale.id)
        );

        if (this.settings.sales && this.settings.enabled && newSales.length > 0) {
          newSales.forEach(sale => this.createSaleNotification(sale));
        }
      }
      
      this.previousSales = sales;
    }, (error) => {
      console.error('Error in sales listener:', error);
    });
  }

  async checkInventoryAlerts() {
    if (!this.settings.enabled || !this.isInitialized) return;

    const productLookup = this.products.reduce((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {});

    for (const item of this.inventory) {
      if (!item.productId && !item.deletedProductName) continue;

      const product = item.productId ? 
        productLookup[item.productId] : 
        { name: item.deletedProductName };
      
      if (!product) continue;

      const previousItem = this.previousInventory.find(prev => prev.slot === item.slot);
      const threshold = item.lowStockThreshold || this.settings.lowStockThreshold || 5;

      // Out of stock alert
      if (item.quantity === 0 && 
          this.settings.outOfStock && 
          (!previousItem || previousItem.quantity > 0)) {
        await this.createNotification({ 
          type: 'out_of_stock', 
          title: 'Out of Stock Alert', 
          message: `${product.name} is now empty`, 
          priority: 'high', 
          slot: item.slot 
        });
      } 
      // Low stock alert
      else if (item.quantity <= threshold && 
               item.quantity > 0 && 
               this.settings.lowStock && 
               (!previousItem || previousItem.quantity > threshold)) {
        await this.createNotification({ 
          type: 'low_stock', 
          title: 'Low Stock Alert', 
          message: `${product.name} is running low (${item.quantity} left)`, 
          priority: 'medium', 
          slot: item.slot,
          quantity: item.quantity
        });
      } 
      // Stock replenished alert
      else if (item.quantity > threshold && 
               previousItem && 
               previousItem.quantity <= threshold) {
        await this.createNotification({ 
          type: 'stock_replenished', 
          title: 'Stock Replenished', 
          message: `${product.name} has been restocked`, 
          priority: 'low', 
          slot: item.slot,
          quantity: item.quantity
        });
      }
    }
  }

  async createSaleNotification(sale) {
    const product = this.products.find(p => p.id === sale.productId);
    if (!product) return;
    
    await this.createNotification({ 
      type: 'sale', 
      title: 'Sale Completed', 
      message: `${product.name} sold for ${this.formatCurrency(sale.price)}`, 
      priority: 'low', 
      slot: sale.slot,
      productName: product.name,
      price: sale.price
    });
  }

  async createNotification(notificationData) {
    if (!this.currentUserId) {
      console.warn('Cannot create notification: no user ID');
      return;
    }
    
    try {
      await addDoc(collection(db, 'notifications'), { 
        ...notificationData, 
        userId: this.currentUserId, 
        timestamp: serverTimestamp(), 
        read: false 
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  async markAsRead(notificationId) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { 
        read: true, 
        readAt: serverTimestamp() 
      });
      
      // Update local state immediately for better UX
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead() {
    const unreadNotifications = this.notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      unreadNotifications.forEach(notification => {
        batch.update(doc(db, 'notifications', notification.id), { 
          read: true, 
          readAt: serverTimestamp() 
        });
      });
      await batch.commit();
      
      // Update local state immediately
      unreadNotifications.forEach(notification => {
        notification.read = true;
      });
      this.notifyListeners();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  async removeNotification(notificationId) {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      
      // Update local state immediately
      this.notifications = this.notifications.filter(n => n.id !== notificationId);
      this.notifyListeners();
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  }

  async clearAllNotifications() {
    if (this.notifications.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      const q = query(
        collection(db, 'notifications'), 
        where('userId', '==', this.currentUserId)
      );
      const snapshot = await getDocs(q);
      
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      // Update local state immediately
      this.notifications = [];
      this.notifyListeners();
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  }

  showBrowserNotification(notification) {
    if (!this.settings.desktop || !this.canShowNotification()) return;
    
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
          requireInteraction: notification.priority === 'high'
        });
        
        browserNotification.onclick = () => {
          window.focus();
          this.markAsRead(notification.id);
          browserNotification.close();
        };
        
        // Auto-close after 5 seconds for low priority notifications
        if (notification.priority !== 'high') {
          setTimeout(() => browserNotification.close(), 5000);
        }
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }
  }
  
  playNotificationSound(notification) {
    if (!this.settings.sound || 
        !this.canPlaySound() || 
        !this.isAudioUnlocked || 
        !this.audioContext) {
      return;
    }

    try {
      const audioCtx = this.audioContext;
      const frequencies = { 
        high: [800, 1000], 
        medium: [600, 800], 
        low: [400, 500] 
      };
      const freq = frequencies[notification.priority] || frequencies.low;

      const gain = audioCtx.createGain();
      gain.connect(audioCtx.destination);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);

      const osc = audioCtx.createOscillator();
      osc.connect(gain);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq[0], audioCtx.currentTime);
      
      if (freq.length > 1) {
        osc.frequency.setValueAtTime(freq[1], audioCtx.currentTime + 0.1);
      }
      
      osc.start(audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.3);
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  canShowNotification() {
    return this.settings.enabled && !this.isQuietHours();
  }
  
  canPlaySound() {
    return this.settings.sound && this.canShowNotification();
  }

  isQuietHours() {
    if (!this.settings.quietHours?.enabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMin] = this.settings.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = this.settings.quietHours.end.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.settings.desktop = permission === 'granted';
      this.updateSettings(this.settings);
      return permission;
    }
    return 'denied';
  }

  get permissionStatus() {
    if ('Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  }

  // Public API methods
  getNotifications() { 
    return this.notifications; 
  }
  
  getUnreadCount() { 
    return this.notifications.filter(n => !n.read).length;
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => { 
      this.listeners = this.listeners.filter(l => l !== callback); 
    };
  }

  notifyListeners() {
    this.listeners.forEach(cb => {
      try {
        cb(this.notifications, this.getUnreadCount());
      } catch (error) {
        console.error('Error in notification listener callback:', error);
      }
    });
  }

  async sendTestNotification() {
    await this.createNotification({
      type: 'system',
      title: '🧪 Test Notification',
      message: 'Your notifications are working perfectly!',
      priority: 'medium'
    });
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-NZ', { 
      style: 'currency', 
      currency: 'NZD' 
    }).format(amount);
  }
}

// Export singleton instance
const firestoreNotificationService = new FirestoreNotificationService();
export default firestoreNotificationService;