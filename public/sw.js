// Service Worker for sound notifications
const CACHE_NAME = 'vibe-tracker-v1';
const NOTIFICATION_SOUND = '/notification-sound.mp3';

// Install event - cache the notification sound
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([NOTIFICATION_SOUND]);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clear old caches if needed
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      }),
    ])
  );
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'turn-notification') {
    handleTurnNotification(event.data);
  }
});

// Handle turn notification
async function handleTurnNotification(data) {
  // Send message to client to play sound (client has full Audio API access)
  try {
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    if (clients.length > 0) {
      // Send message to all clients to play sound and vibrate
      clients.forEach(client => {
        client.postMessage({
          type: 'notification',
          sound: true,
          vibrate: true,
          soundUrl: NOTIFICATION_SOUND
        });
      });
    } else {
      // No clients available, try Web Audio API as fallback
      try {
        const cache = await caches.open(CACHE_NAME);
        let soundResponse = await cache.match(NOTIFICATION_SOUND);
        
        if (!soundResponse) {
          soundResponse = await fetch(NOTIFICATION_SOUND);
          if (soundResponse.ok) {
            await cache.put(NOTIFICATION_SOUND, soundResponse.clone());
          }
        }
        
        if (soundResponse) {
          const arrayBuffer = await soundResponse.arrayBuffer();
          const audioContext = new (self.AudioContext || self.webkitAudioContext)();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const source = audioContext.createBufferSource();
          const gainNode = audioContext.createGain();
          
          source.buffer = audioBuffer;
          gainNode.gain.value = 0.7;
          
          source.connect(gainNode);
          gainNode.connect(audioContext.destination);
          source.start(0);
          
          source.onended = () => {
            audioContext.close();
          };
        }
      } catch (webAudioError) {
        console.warn('Web Audio API fallback failed:', webAudioError);
      }
    }
  } catch (error) {
    console.error('Error handling notification sound:', error);
  }

  // Show browser notification with vibration
  // The vibrate option in notifications works when device is locked (if browser/OS supports it)
  const title = 'Your Turn is Next!';
  const options = {
    body: data.message || 'You are next in the initiative order.',
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: 'turn-notification',
    requireInteraction: false,
    silent: false, // Sound will play from audio element
    vibrate: [200, 100, 200, 100, 200, 100, 200], // Extended vibration pattern for better visibility when locked
    data: {
      url: '/',
      timestamp: Date.now(),
    },
    // Add renotify to ensure notification shows even if one exists
    renotify: true,
  };

  try {
    await self.registration.showNotification(title, options);
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === self.location.origin && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Listen for push events (for future Web Push API support)
// This allows notifications to work even when the app is completely closed
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  if (event.data) {
    const data = event.data.json();
    if (data.type === 'turn-notification') {
      handleTurnNotification(data);
    }
  }
});

