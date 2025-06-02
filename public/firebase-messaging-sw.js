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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  // Extract notification data
  const notificationTitle = payload.notification?.title || 'Vending Machine Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'New notification from your vending machine',
    icon: payload.notification?.icon || '/icons/notification-icon-192.png',
    badge: '/icons/notification-icon-192.png',
    tag: payload.data?.tag || 'vending-notification',
    requireInteraction: payload.data?.requireInteraction === 'true',
    data: {
      click_action: payload.data?.click_action || '/inventory',
      ...payload.data
    },
    actions: [
      {
        action: 'view',
        title: '👀 View Details'
      },
      {
        action: 'dismiss',
        title: '✖️ Dismiss'
      }
    ]
  };

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received:', event);

  event.notification.close();

  const clickAction = event.notification.data?.click_action || '/inventory';
  
  if (event.action === 'view' || !event.action) {
    // Open the app or focus existing window
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(clickAction) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(clickAction);
        }
      })
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification (already handled by event.notification.close())
    console.log('Notification dismissed');
  }
});

// Handle push events (for additional processing)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push received:', event);
  
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('Push payload:', payload);
      
      // You can add custom logic here for processing push data
      // before showing notifications
      
    } catch (error) {
      console.error('Error parsing push payload:', error);
    }
  }
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installing...');
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activating...');
  event.waitUntil(self.clients.claim());
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Optional: Handle sync events for offline capability
self.addEventListener('sync', (event) => {
  if (event.tag === 'notification-sync') {
    console.log('[firebase-messaging-sw.js] Sync event received');
    // Handle background sync if needed
  }
});