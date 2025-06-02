import { 
  subscribeToInventory, 
  subscribeToSales, 
  subscribeToProducts 
} from './firestore';

class NotificationService {
  constructor() {
    this.notifications = [];
    this.listeners = [];
    this.settings = this.loadSettings();
    this.lastCheck = {};
    this.unsubscribeFunctions = [];
    
    // Initialize real-time monitoring
    this.initializeMonitoring();
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
        sales: true,
        lowStockThreshold: 5,
        quietHours: { enabled: false, start: '22:00', end: '08:00' }
      };
    } catch (error) {
      console.error('Error loading notification settings:', error);
      return { enabled: true, lowStock: true, outOfStock: true };
    }
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
  }

  initializeMonitoring() {
    let inventory = [];
    let products = [];
    let sales = [];

    // Monitor inventory changes
    const unsubscribeInventory = subscribeToInventory((inventoryData) => {
      const previousInventory = [...inventory];
      inventory = inventoryData;
      this.checkInventoryAlerts(inventory, products, previousInventory);
    });

    // Monitor products for context
    const unsubscribeProducts = subscribeToProducts((productsData) => {
      products = productsData;
    });

    // Monitor sales for notifications
    const unsubscribeSales = subscribeToSales((salesData) => {
      const previousSales = [...sales];
      sales = salesData;
      this.checkNewSales(sales, products, previousSales);
    });

    this.unsubscribeFunctions = [
      unsubscribeInventory,
      unsubscribeProducts,
      unsubscribeSales
    ];
  }

  checkInventoryAlerts(inventory, products, previousInventory) {
    if (!this.settings.enabled) return;

    const productLookup = products.reduce((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {});

    inventory.forEach(item => {
      if (!item.productId && !item.deletedProductName) return;

      const isDeletedProduct = !item.productId && item.deletedProductName;
      const product = isDeletedProduct 
        ? { name: item.deletedProductName, slot: item.slot }
        : productLookup[item.productId];

      if (!product) return;

      const previousItem = previousInventory.find(prev => prev.slot === item.slot);
      const threshold = item.lowStockThreshold || this.settings.lowStockThreshold || 5;

      // Check for out of stock
      if (item.quantity === 0 && this.settings.outOfStock) {
        if (!previousItem || previousItem.quantity > 0) {
          this.addNotification({
            type: 'out_of_stock',
            title: 'Out of Stock Alert',
            message: `${product.name} (${item.slot}) is now empty`,
            priority: 'high',
            data: { 
              slot: item.slot, 
              productName: product.name,
              quantity: item.quantity,
              maxCapacity: item.maxCapacity || 20
            }
          });
        }
      }
      // Check for low stock
      else if (item.quantity <= threshold && item.quantity > 0 && this.settings.lowStock) {
        if (!previousItem || previousItem.quantity > threshold) {
          this.addNotification({
            type: 'low_stock',
            title: 'Low Stock Alert',
            message: `${product.name} (${item.slot}) is running low - ${item.quantity} left`,
            priority: 'medium',
            data: { 
              slot: item.slot, 
              productName: product.name,
              quantity: item.quantity,
              threshold: threshold,
              maxCapacity: item.maxCapacity || 20
            }
          });
        }
      }
      // Check for stock replenished
      else if (item.quantity > threshold && previousItem && previousItem.quantity <= threshold) {
        this.addNotification({
          type: 'stock_replenished',
          title: 'Stock Replenished',
          message: `${product.name} (${item.slot}) has been restocked - ${item.quantity} items`,
          priority: 'low',
          data: { 
            slot: item.slot, 
            productName: product.name,
            quantity: item.quantity,
            maxCapacity: item.maxCapacity || 20
          }
        });
      }
    });
  }

  checkNewSales(sales, products, previousSales) {
    if (!this.settings.enabled || !this.settings.sales) return;

    const productLookup = products.reduce((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {});

    // Find new sales (sales that weren't in the previous array)
    const newSales = sales.filter(sale => 
      !previousSales.find(prev => prev.id === sale.id)
    );

    newSales.forEach(sale => {
      const product = productLookup[sale.productId];
      if (product) {
        this.addNotification({
          type: 'sale',
          title: 'Sale Completed',
          message: `${product.name} sold for ${this.formatCurrency(sale.price)}`,
          priority: 'low',
          data: { 
            productName: product.name,
            slot: sale.slot,
            price: sale.price,
            paymentMethod: sale.paymentMethod
          }
        });
      }
    });
  }

  addNotification(notificationData) {
    const notification = {
      id: this.generateId(),
      timestamp: new Date(),
      read: false,
      ...notificationData
    };

    // Add to notifications array
    this.notifications.unshift(notification);

    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    // Show desktop notification if enabled
    this.showDesktopNotification(notification);

    // Play sound if enabled
    this.playNotificationSound(notification);

    // Notify listeners
    this.notifyListeners();

    console.log('New notification:', notification);
  }

  showDesktopNotification(notification) {
    if (!this.settings.desktop || !this.canShowNotification()) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      const icon = this.getNotificationIcon(notification.type);
      
      const desktopNotification = new Notification(notification.title, {
        body: notification.message,
        icon: icon,
        tag: notification.type + '_' + (notification.data?.slot || ''),
        requireInteraction: notification.priority === 'high'
      });

      // Auto close after 5 seconds unless it's high priority
      if (notification.priority !== 'high') {
        setTimeout(() => {
          desktopNotification.close();
        }, 5000);
      }

      desktopNotification.onclick = () => {
        window.focus();
        this.markAsRead(notification.id);
        desktopNotification.close();
      };
    }
  }

  playNotificationSound(notification) {
    if (!this.settings.sound || !this.canPlaySound()) return;

    // Create and play notification sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

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
  }

  canShowNotification() {
    if (!this.settings.enabled) return false;
    return !this.isQuietHours();
  }

  canPlaySound() {
    if (!this.settings.enabled || !this.settings.sound) return false;
    return !this.isQuietHours();
  }

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

  // Public API methods
  getNotifications() {
    return this.notifications;
  }

  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.notifyListeners();
  }

  removeNotification(notificationId) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.notifyListeners();
  }

  clearAllNotifications() {
    this.notifications = [];
    this.notifyListeners();
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

  // Utility methods
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(amount);
  }

  // Cleanup
  destroy() {
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.listeners = [];
    this.notifications = [];
  }

  // Test method for development
  sendTestNotification() {
    this.addNotification({
      type: 'test',
      title: 'Test Notification',
      message: 'This is a test notification from your Vending Machine Admin',
      priority: 'medium',
      data: { test: true }
    });
  }

  // Get current inventory status summary
  getInventoryStatusSummary(inventory, products) {
    const productLookup = products.reduce((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {});

    const summary = {
      total: 0,
      outOfStock: 0,
      lowStock: 0,
      adequateStock: 0,
      items: []
    };

    inventory.forEach(item => {
      if (!item.productId && !item.deletedProductName) return;

      const isDeletedProduct = !item.productId && item.deletedProductName;
      const product = isDeletedProduct 
        ? { name: item.deletedProductName, slot: item.slot }
        : productLookup[item.productId];

      if (!product) return;

      summary.total++;
      const threshold = item.lowStockThreshold || this.settings.lowStockThreshold || 5;

      if (item.quantity === 0) {
        summary.outOfStock++;
        summary.items.push({
          slot: item.slot,
          product: product.name,
          status: 'out_of_stock',
          quantity: item.quantity,
          maxCapacity: item.maxCapacity || 20
        });
      } else if (item.quantity <= threshold) {
        summary.lowStock++;
        summary.items.push({
          slot: item.slot,
          product: product.name,
          status: 'low_stock',
          quantity: item.quantity,
          threshold: threshold,
          maxCapacity: item.maxCapacity || 20
        });
      } else {
        summary.adequateStock++;
        summary.items.push({
          slot: item.slot,
          product: product.name,
          status: 'adequate',
          quantity: item.quantity,
          maxCapacity: item.maxCapacity || 20
        });
      }
    });

    return summary;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;