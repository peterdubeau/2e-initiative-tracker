// Notification service for service worker registration and messaging

let serviceWorkerReady = false;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered successfully:', registration);

    // Wait for service worker to be ready
    if (registration.installing) {
      registration.installing.addEventListener('statechange', () => {
        if (registration.installing?.state === 'activated') {
          serviceWorkerReady = true;
          console.log('Service Worker activated');
        }
      });
    } else if (registration.waiting) {
      serviceWorkerReady = true;
    } else if (registration.active) {
      serviceWorkerReady = true;
    }

    // Listen for service worker updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            serviceWorkerReady = true;
            console.log('Service Worker updated and activated');
          }
        });
      }
    });

    // Request notification permission
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission();
          console.log('Notification permission:', permission);
        } catch (error) {
          console.warn('Failed to request notification permission:', error);
        }
      } else {
        console.log('Notification permission:', Notification.permission);
      }
    }

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export function sendNotificationToServiceWorker(message: {
  type: string;
  message?: string;
  sound?: boolean;
  vibrate?: boolean;
}): void {
  console.log('Sending notification to service worker:', message);
  
  // Always try to play sound directly first (works even if service worker isn't ready)
  if (message.sound) {
    playNotificationSound();
  }
  
  // Vibrate device (works when page is active/visible)
  if (message.vibrate !== false) { // Default to true if not specified
    vibrateDevice();
  }

  if (!navigator.serviceWorker) {
    console.warn('Service workers not supported');
    return;
  }

  // Try to send message to service worker
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
    console.log('Message sent to service worker');
  } else {
    console.warn('Service worker controller not available, waiting for ready...');
    // Wait for service worker to be ready
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.active) {
        registration.active.postMessage(message);
        console.log('Message sent to service worker after ready');
      }
    }).catch((error) => {
      console.error('Failed to send message to service worker:', error);
    });
  }
}

// Play notification sound directly
function playNotificationSound(): void {
  try {
    const audio = new Audio('/notification-sound.mp3');
    audio.volume = 0.7;
    audio.play().catch((error) => {
      console.warn('Failed to play notification sound:', error);
    });
    console.log('Playing notification sound');
  } catch (error) {
    console.error('Error creating audio element:', error);
  }
}

// Vibrate device (works when page is active)
function vibrateDevice(): void {
  if ('vibrate' in navigator) {
    try {
      // Vibrate pattern: vibrate for 200ms, pause 100ms, vibrate 200ms, pause 100ms, vibrate 200ms
      navigator.vibrate([200, 100, 200, 100, 200]);
      console.log('Device vibration triggered');
    } catch (error) {
      console.warn('Failed to vibrate device:', error);
    }
  } else {
    console.log('Vibration API not supported in this browser');
  }
}

// Listen for messages from service worker to play sound and vibrate
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('Message received from service worker:', event.data);
    if (event.data && event.data.type === 'play-sound') {
      playNotificationSound();
    }
    if (event.data && event.data.type === 'vibrate') {
      vibrateDevice();
    }
    if (event.data && event.data.type === 'notification') {
      // Combined notification with sound and vibration
      if (event.data.sound) {
        playNotificationSound();
      }
      if (event.data.vibrate !== false) {
        vibrateDevice();
      }
    }
  });
}

