// src/services/FirestoreNotificationService.js
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
  }

  // Initialize the service with user authentication
  async initialize(userId) {
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

  // Load notification settings from localStorage
  loadSettings() {
    try {
      const saved = localStorage.getItem('notificationSettings');
      return saved ? JSON.parse(saved) : {
        enabled: true,
        sound: true,
        desktop: true,
        lowStock: true,
        outOfStock: true,
        sales: true,
        systemUpdates: true,
        lowStockThreshold: 5,
        quietHours: { enabled: false, start: '22:00', end: '08:00' }
      };
    } catch (error) {
      console.error('Error loading notification settings:', error);
      return { enabled: true, lowStock: true, outOfStock: true, sales: false };
    }
  }

  // Update notification settings
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
  }

  // Setup real-time Firestore listeners
  setupRealtimeListeners() {
    // Listen to user's notifications
    this.setupNotificationsListener();
    
    // Listen to inventory changes for auto-generating notifications
    this.setupInventoryMonitoring();
    
    // Listen to products for context
    this.setupProductsListener();
    
    // Listen to sales for sales notifications
    this.setupSalesListener();
  }

  // Listen to notifications collection - NO LIMIT, with proper state management
  setupNotificationsListener() {
    if (!this.currentUserId) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', this.currentUserId),
      orderBy('timestamp', 'desc')
    );

    this.unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      // Get all current notifications from Firestore
      const firestoreNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Check for new notifications (only if service is already initialized)
      const newNotifications = this.isInitialized ? 
        firestoreNotifications.filter(notification => 
          !this.notifications.find(existing => existing.id === notification.id)
        ) : [];

      // Update local state to match Firestore exactly
      this.notifications = firestoreNotifications;

      // Show browser/sound notifications for new ones (but not on initial load)
      if (this.isInitialized && newNotifications.length > 0) {
        newNotifications.forEach(notification => {
          this.showBrowserNotification(notification);
          this.playNotificationSound(notification);
        });
      }

      // Notify all listeners with the exact count
      this.notifyListeners();
      
      console.log(`📊 Notifications synced: ${this.notifications.length} total`);
    }, (error) => {
      console.error('Error in notifications listener:', error);
    });
  }

  // Listen to inventory changes
  setupInventoryMonitoring() {
    const inventoryQuery = query(collection(db, 'inventory'), orderBy('slot'));
    
    this.unsubscribeInventory = onSnapshot(inventoryQuery, (snapshot) => {
      this.previousInventory = [...this.inventory];
      this.inventory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Only check for alerts if we have previous data (not on initial load)
      if (this.previousInventory.length > 0) {
        this.checkInventoryAlerts();
      }
    });
  }

  // Listen to products for context
  setupProductsListener() {
    const productsQuery = query(collection(db, 'products'), orderBy('name'));
    
    this.unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      this.products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });
  }

  // Listen to sales for sales notifications
  setupSalesListener() {
    const salesQuery = query(
      collection(db, 'sales'),
      orderBy('timestamp', 'desc')
    );
    
    this.unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
      const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Only check for new sales if we have previous data (not on initial load)
      if (this.previousSales.length > 0) {
        const newSales = sales.filter(sale => 
          !this.previousSales.find(prev => prev.id === sale.id)
        );

        // Create notifications for new sales
        if (this.settings.sales && this.settings.enabled && newSales.length > 0) {
          newSales.forEach(sale => this.createSaleNotification(sale));
        }
      }

      this.previousSales = sales;
    });
  }

  // Check inventory levels and create notifications
  async checkInventoryAlerts() {
    if (!this.settings.enabled || !this.isInitialized) return;

    const productLookup = this.products.reduce((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {});

    for (const item of this.inventory) {
      if (!item.productId && !item.deletedProductName) continue;

      const isDeletedProduct = !item.productId && item.deletedProductName;
      const product = isDeletedProduct 
        ? { name: item.deletedProductName, slot: item.slot }
        : productLookup[item.productId];

      if (!product) continue;

      const previousItem = this.previousInventory.find(prev => prev.slot === item.slot);
      const threshold = item.lowStockThreshold || this.settings.lowStockThreshold || 5;

      // Check for out of stock
      if (item.quantity === 0 && this.settings.outOfStock) {
        if (!previousItem || previousItem.quantity > 0) {
          await this.createNotification({
            type: 'out_of_stock',
            title: 'Out of Stock Alert',
            message: `${product.name} is now empty`,
            priority: 'high',
            slot: item.slot,
            productName: product.name,
            quantity: item.quantity,
            maxCapacity: item.maxCapacity || 20
          });
        }
      }
      // Check for low stock
      else if (item.quantity <= threshold && item.quantity > 0 && this.settings.lowStock) {
        if (!previousItem || previousItem.quantity > threshold) {
          await this.createNotification({
            type: 'low_stock',
            title: 'Low Stock Alert',
            message: `${product.name} is running low (${item.quantity} left)`,
            priority: 'medium',
            slot: item.slot,
            productName: product.name,
            quantity: item.quantity,
            threshold: threshold,
            maxCapacity: item.maxCapacity || 20
          });
        }
      }
      // Check for stock replenished
      else if (item.quantity > threshold && previousItem && previousItem.quantity <= threshold) {
        await this.createNotification({
          type: 'stock_replenished',
          title: 'Stock Replenished',
          message: `${product.name} has been restocked (${item.quantity} items)`,
          priority: 'low',
          slot: item.slot,
          productName: product.name,
          quantity: item.quantity,
          maxCapacity: item.maxCapacity || 20
        });
      }
    }
  }

  // Create a sale notification
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
      price: sale.price,
      paymentMethod: sale.paymentMethod
    });
  }

  // Create a notification in Firestore
  async createNotification(notificationData) {
    if (!this.currentUserId) return;

    try {
      const notification = {
        ...notificationData,
        userId: this.currentUserId,
        timestamp: serverTimestamp(),
        read: false,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'notifications'), notification);
      console.log(`📬 Created notification: ${docRef.id}`);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      });
      console.log(`✅ Marked as read: ${notificationId}`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      const batch = writeBatch(db);
      const unreadNotifications = this.notifications.filter(n => !n.read);

      unreadNotifications.forEach(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.update(notificationRef, {
          read: true,
          readAt: serverTimestamp()
        });
      });

      await batch.commit();
      console.log(`✅ Marked ${unreadNotifications.length} notifications as read`);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  // Remove notification with optimistic UI update
  async removeNotification(notificationId) {
    // Store original state for potential rollback
    const originalNotifications = [...this.notifications];
    
    try {
      // Optimistically remove from local state first
      this.notifications = this.notifications.filter(n => n.id !== notificationId);
      this.notifyListeners();

      // Then remove from Firestore
      const notificationRef = doc(db, 'notifications', notificationId);
      await deleteDoc(notificationRef);
      
      console.log(`🗑️ Deleted notification: ${notificationId}`);
    } catch (error) {
      console.error('Error removing notification:', error);
      // Revert optimistic update on error
      this.notifications = originalNotifications;
      this.notifyListeners();
    }
  }

  // Clear all notifications with optimistic UI update
  async clearAllNotifications() {
    // Store original state for potential rollback
    const originalNotifications = [...this.notifications];
    
    try {
      // Optimistically clear local state first
      this.notifications = [];
      this.notifyListeners();

      // Then delete from Firestore
      const batch = writeBatch(db);
      
      originalNotifications.forEach(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.delete(notificationRef);
      });

      await batch.commit();
      console.log(`🧹 Cleared ${originalNotifications.length} notifications`);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      // Revert optimistic update on error
      this.notifications = originalNotifications;
      this.notifyListeners();
    }
  }

  // Refresh notifications from server (for debugging)
  async refreshNotifications() {
    if (!this.currentUserId) return;

    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', this.currentUserId),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(notificationsQuery);
      const serverNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      this.notifications = serverNotifications;
      this.notifyListeners();
      
      console.log(`🔄 Refreshed notifications: ${serverNotifications.length} found`);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  }

  // Show browser notification
  showBrowserNotification(notification) {
    if (!this.settings.desktop || !this.canShowNotification()) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      const icon = this.getNotificationIcon(notification.type);
      
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: icon,
        tag: notification.type + '_' + (notification.slot || ''),
        requireInteraction: notification.priority === 'high'
      });

      // Auto close after 5 seconds unless it's high priority
      if (notification.priority !== 'high') {
        setTimeout(() => browserNotification.close(), 5000);
      }

      browserNotification.onclick = () => {
        window.focus();
        this.markAsRead(notification.id);
        browserNotification.close();
      };
    }
  }

  // Play notification sound
  playNotificationSound(notification) {
    if (!this.settings.sound || !this.canPlaySound()) return;

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Different tones for different priorities
      const frequencies = {
        high: [800, 1000, 800], // Out of stock - urgent
        medium: [600, 800],     // Low stock - warning
        low: [400, 600]         // Sales, restocked - info
      };

      const freq = frequencies[notification.priority] || frequencies.low;
      
      freq.forEach((frequency, index) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.frequency.setValueAtTime(frequency, audioContext.currentTime + index * 0.2);
        gain.gain.setValueAtTime(0.1, audioContext.currentTime + index * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.2 + 0.1);
        
        osc.start(audioContext.currentTime + index * 0.2);
        osc.stop(audioContext.currentTime + index * 0.2 + 0.1);
      });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  // Check if notifications can be shown (considering quiet hours)
  canShowNotification() {
    if (!this.settings.enabled) return false;
    return !this.isQuietHours();
  }

  // Check if sound can be played
  canPlaySound() {
    if (!this.settings.enabled || !this.settings.sound) return false;
    return !this.isQuietHours();
  }

  // Check if it's quiet hours
  isQuietHours() {
    if (!this.settings.quietHours?.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = this.settings.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = this.settings.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  // Get notification icon
  getNotificationIcon(type) {
    const icons = {
      out_of_stock: '🚫',
      low_stock: '⚠️',
      sale: '💰',
      stock_replenished: '✅',
      system: '⚙️'
    };
    return icons[type] || '🔔';
  }

  // Request notification permission
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  // Public API methods
  getNotifications() {
    return this.notifications;
  }

  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  // Listener management
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.notifications, this.getUnreadCount());
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Test notification
  async sendTestNotification() {
    await this.createNotification({
      type: 'system',
      title: '🧪 Test Notification',
      message: 'Firestore notifications are working correctly!',
      priority: 'medium'
    });
  }

  // Utility methods
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(amount);
  }
}

// Create singleton instance
const firestoreNotificationService = new FirestoreNotificationService();

export default firestoreNotificationService;