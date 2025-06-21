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

    // --- NEW: Audio Context Management for Mobile Compatibility ---
    this.audioContext = null;
    this.isAudioUnlocked = false;
    // --- END NEW ---
  }

  // Initialize the service with user authentication
  async initialize(userId) {
    if (this.isInitialized) return; // Prevent re-initialization
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

  // --- NEW: Method to unlock audio context on user interaction ---
  /**
   * Unlocks the browser's audio context.
   * This MUST be called from a user-initiated event (e.g., a button click)
   * to comply with mobile browser audio policies.
   */
  unlockAudio() {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // If the context is suspended, try to resume it.
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
        this.isAudioUnlocked = true;
        console.log('Audio context unlocked successfully.');
      } catch (e) {
        console.error('Failed to create or unlock AudioContext:', e);
      }
    } else if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
          this.isAudioUnlocked = true;
          console.log('Audio context resumed successfully.');
      });
    }
  }
  // --- END NEW ---

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
    this.setupNotificationsListener();
    this.setupInventoryMonitoring();
    this.setupProductsListener();
    this.setupSalesListener();
  }

  setupNotificationsListener() {
    if (!this.currentUserId) return;

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

      if (this.isInitialized && newNotifications.length > 0) {
        newNotifications.forEach(notification => {
          this.showBrowserNotification(notification);
          this.playNotificationSound(notification);
        });
      }

      this.notifyListeners();
    }, (error) => {
      console.error('Error in notifications listener:', error);
    });
  }

  setupInventoryMonitoring() {
    const inventoryQuery = query(collection(db, 'inventory'), orderBy('slot'));
    
    this.unsubscribeInventory = onSnapshot(inventoryQuery, (snapshot) => {
      this.previousInventory = [...this.inventory];
      this.inventory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (this.previousInventory.length > 0) {
        this.checkInventoryAlerts();
      }
    });
  }

  setupProductsListener() {
    const productsQuery = query(collection(db, 'products'), orderBy('name'));
    
    this.unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      this.products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });
  }

  setupSalesListener() {
    const salesQuery = query(
      collection(db, 'sales'),
      orderBy('timestamp', 'desc')
    );
    
    this.unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
      const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (this.previousSales.length > 0) {
        const newSales = sales.filter(sale => 
          !this.previousSales.find(prev => prev.id === sale.id)
        );

        if (this.settings.sales && this.settings.enabled && newSales.length > 0) {
          newSales.forEach(sale => this.createSaleNotification(sale));
        }
      }
      this.previousSales = sales;
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

      const product = item.productId ? productLookup[item.productId] : { name: item.deletedProductName };
      if (!product) continue;

      const previousItem = this.previousInventory.find(prev => prev.slot === item.slot);
      const threshold = item.lowStockThreshold || this.settings.lowStockThreshold || 5;

      if (item.quantity === 0 && this.settings.outOfStock && (!previousItem || previousItem.quantity > 0)) {
        await this.createNotification({ type: 'out_of_stock', title: 'Out of Stock Alert', message: `${product.name} is now empty`, priority: 'high', slot: item.slot });
      } else if (item.quantity <= threshold && item.quantity > 0 && this.settings.lowStock && (!previousItem || previousItem.quantity > threshold)) {
        await this.createNotification({ type: 'low_stock', title: 'Low Stock Alert', message: `${product.name} is running low (${item.quantity} left)`, priority: 'medium', slot: item.slot });
      } else if (item.quantity > threshold && previousItem && previousItem.quantity <= threshold) {
        await this.createNotification({ type: 'stock_replenished', title: 'Stock Replenished', message: `${product.name} has been restocked`, priority: 'low', slot: item.slot });
      }
    }
  }

  async createSaleNotification(sale) {
    const product = this.products.find(p => p.id === sale.productId);
    if (!product) return;
    await this.createNotification({ type: 'sale', title: 'Sale Completed', message: `${product.name} sold for ${this.formatCurrency(sale.price)}`, priority: 'low', slot: sale.slot });
  }

  async createNotification(notificationData) {
    if (!this.currentUserId) return;
    try {
      await addDoc(collection(db, 'notifications'), { ...notificationData, userId: this.currentUserId, timestamp: serverTimestamp(), read: false });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  async markAsRead(notificationId) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true, readAt: serverTimestamp() });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead() {
    try {
      const batch = writeBatch(db);
      this.notifications.filter(n => !n.read).forEach(notification => {
        batch.update(doc(db, 'notifications', notification.id), { read: true, readAt: serverTimestamp() });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  async removeNotification(notificationId) {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  }

  async clearAllNotifications() {
    try {
      const batch = writeBatch(db);
      const q = query(collection(db, 'notifications'), where('userId', '==', this.currentUserId));
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  }

  showBrowserNotification(notification) {
    if (!this.settings.desktop || !this.canShowNotification()) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico', // Using a local icon
        tag: notification.id,
      });
      browserNotification.onclick = () => {
        window.focus();
        this.markAsRead(notification.id);
      };
    }
  }
  
  // --- UPDATED: playNotificationSound Method ---
  playNotificationSound(notification) {
    // 1. Check if audio is enabled in settings and not in quiet hours.
    // 2. Crucially, check if the audio context has been unlocked by the user.
    if (!this.settings.sound || !this.canPlaySound() || !this.isAudioUnlocked || !this.audioContext) {
      return;
    }

    try {
      const audioCtx = this.audioContext;
      const frequencies = { high: [800, 1000], medium: [600, 800], low: [400] };
      const freq = frequencies[notification.priority] || frequencies.low;

      const gain = audioCtx.createGain();
      gain.connect(audioCtx.destination);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.01); // Quick fade in

      const osc = audioCtx.createOscillator();
      osc.connect(gain);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq[0], audioCtx.currentTime);
      if(freq.length > 1) {
        osc.frequency.setValueAtTime(freq[1], audioCtx.currentTime + 0.1);
      }
      
      osc.start(audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.2);
      osc.stop(audioCtx.currentTime + 0.2);

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
    return startTime <= endTime ? (currentTime >= startTime && currentTime <= endTime) : (currentTime >= startTime || currentTime <= endTime);
  }

  async requestNotificationPermission() {
    if ('Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  }

  getNotifications() { return this.notifications; }
  getUnreadCount() { return this.notifications.filter(n => !n.read).length; }

  addListener(callback) {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.notifications, this.getUnreadCount()));
  }

  async sendTestNotification() {
    await this.createNotification({
      type: 'system',
      title: '🧪 Test Notification',
      message: 'Your notifications are working!',
      priority: 'medium'
    });
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(amount);
  }
}

const firestoreNotificationService = new FirestoreNotificationService();
export default firestoreNotificationService;
