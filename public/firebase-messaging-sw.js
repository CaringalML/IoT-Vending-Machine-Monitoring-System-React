// public/firebase-messaging-sw.js
// Firebase Messaging Service Worker for background notifications

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker
const firebaseConfig = {
  apiKey: "AIza5yBuvuoJecfVe4KfbIzMgmjKQEcYNDSCJH4Q",
  authDomain: "iot-vending-machine-e2f54.firebaseapp.com",
  projectId: "iot-vending-machine-e2f54",
  storageBucket: "iot-vending-machine-e2f54.appspot.com",
  messagingSenderId: "385658910467",
  appId: "1:385658910467:web:6abb828620375a51895b36",
  measurementId: "G-HGBVM4P7G9"
};

firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging object
const messaging = firebase.messaging();

// Utility function to get working icon
function getNotificationIcon(providedIcon) {
  // Priority order: provided icon -> fallback icon -> favicon
  const icons = [
    providedIcon,
    '/icons/notification-icon-192.png',
    '/icons/icon-192x192.png',
    '/android-chrome-192x192.png',
    '/favicon.ico'
  ];
  
  // Return the first non-null icon
  return icons.find(icon => icon) || '/favicon.ico';
}

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  // Extract notification data
  const notificationTitle = payload.notification?.title || 'Vending Machine Alert';
  
  // Get notification icon with fallback
  const iconUrl = getNotificationIcon(payload.notification?.icon);
  
  const notificationOptions = {
    body: payload.notification?.body || 'New notification from your vending machine',
    icon: iconUrl,
    badge: iconUrl, // Use same icon as badge
    tag: payload.data?.tag || 'vending-notification',
    requireInteraction: payload.data?.requireInteraction === 'true',
    silent: false,
    timestamp: Date.now(),
    data: {
      click_action: payload.data?.click_action || '/inventory',
      url: payload.data?.url || '/inventory',
      ...payload.data
    },
    actions: [
      {
        action: 'view',
        title: '👀 View Details',
        icon: iconUrl
      },
      {
        action: 'dismiss',
        title: '✖️ Dismiss',
        icon: iconUrl
      }
    ]
  };

  // Add specific styling based on notification type
  if (payload.data?.type) {
    switch (payload.data.type) {
      case 'out_of_stock':
        notificationOptions.requireInteraction = true;
        notificationOptions.tag = 'critical-alert';
        break;
      case 'low_stock':
        notificationOptions.tag = 'stock-warning';
        break;
      case 'sale':
        notificationOptions.tag = 'sale-notification';
        break;
      case 'system':
        notificationOptions.tag = 'system-alert';
        break;
    }
  }

  console.log('[firebase-messaging-sw.js] Showing notification with options:', notificationOptions);

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received:', event);

  event.notification.close();

  // Determine where to navigate
  let targetUrl = '/inventory'; // Default fallback
  
  if (event.notification.data) {
    targetUrl = event.notification.data.click_action || 
                event.notification.data.url || 
                '/inventory';
  }
  
  // Handle different actions
  if (event.action === 'dismiss') {
    console.log('Notification dismissed by user');
    return; // Just close, don't navigate
  }
  
  // For 'view' action or default click, open/focus the app
  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((clientList) => {
      console.log(`[firebase-messaging-sw.js] Found ${clientList.length} client windows`);
      
      // Check if app is already open
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        const targetPath = new URL(targetUrl, location.origin).pathname;
        
        // If we find a window with the app, focus it and navigate
        if (clientUrl.origin === location.origin) {
          console.log(`[firebase-messaging-sw.js] Focusing existing window and navigating to ${targetUrl}`);
          
          // Send message to client to navigate
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: targetUrl,
            data: event.notification.data
          });
          
          return client.focus();
        }
      }
      
      // Open new window if app is not open
      if (clients.openWindow) {
        console.log(`[firebase-messaging-sw.js] Opening new window: ${targetUrl}`);
        return clients.openWindow(targetUrl);
      }
    }).catch((error) => {
      console.error('[firebase-messaging-sw.js] Error handling notification click:', error);
    })
  );
});

// Handle push events (for additional processing)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push received:', event);
  
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[firebase-messaging-sw.js] Push payload:', payload);
      
      // Custom logic for different notification types
      if (payload.data?.type === 'out_of_stock') {
        // Could trigger additional actions for critical alerts
        console.log('[firebase-messaging-sw.js] Critical stock alert received');
      }
      
    } catch (error) {
      console.error('[firebase-messaging-sw.js] Error parsing push payload:', error);
    }
  }
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installing...');
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activating...');
  // Claim control of all clients immediately
  event.waitUntil(self.clients.claim());
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle other message types
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION_RESPONSE',
      version: '1.0.0',
      timestamp: Date.now()
    });
  }
});

// Optional: Handle sync events for offline capability
self.addEventListener('sync', (event) => {
  if (event.tag === 'notification-sync') {
    console.log('[firebase-messaging-sw.js] Sync event received');
    // Handle background sync if needed
    event.waitUntil(
      // Add any background sync logic here
      Promise.resolve()
    );
  }
});

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw.js] Notification closed:', event.notification.tag);
  
  // Track notification dismissals if needed
  // Could send analytics data here
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('[firebase-messaging-sw.js] Service worker error:', event);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[firebase-messaging-sw.js] Unhandled promise rejection:', event);
});