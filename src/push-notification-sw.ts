/// <reference lib="webworker" />

// Push notification service worker for enhanced notifications
// This service worker handles push notifications when the app is not active

declare var self: ServiceWorkerGlobalScope;

interface PushNotificationData {
  title: string;
  message: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  vibrate?: number[];
}

// Handle push messages
self.addEventListener('push', (event: PushEvent) => {
  console.log('Push notification received:', event);

  if (!event.data) {
    console.warn('Push event has no data');
    return;
  }

  try {
    const data: PushNotificationData = event.data.json();

    const options: NotificationOptions = {
      body: data.message,
      icon: data.icon || '/favicon.ico',
      badge: data.badge || '/favicon.ico',
      tag: data.tag || `notification-${Date.now()}`,
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      // vibrate: data.vibrate || [200, 100, 200], // Not supported in all browsers
      // actions: data.actions || [], // Actions might not be supported in all contexts
      data: {
        url: data.url,
        timestamp: Date.now()
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Error processing push notification:', error);

    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('New Notification', {
        body: 'You have a new notification',
        icon: '/favicon.ico',
        tag: 'fallback-notification'
      })
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  // Handle action clicks
  if (event.action) {
    handleNotificationAction(event.action, event.notification);
    return;
  }

  // Handle notification body click
  const notificationData = event.notification.data;
  const urlToOpen = notificationData?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            client.focus();
            return;
          }
        }

        // If no window/tab is already open, open a new one
        if (self.clients.openWindow) {
          self.clients.openWindow(urlToOpen);
        }
      })
      .catch((error) => {
        console.error('Error handling notification click:', error);
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event: NotificationEvent) => {
  console.log('Notification closed:', event);

  // Track notification dismissal
  trackNotificationEvent('dismissed', event.notification);
});

// Handle notification action clicks
function handleNotificationAction(action: string, notification: Notification) {
  console.log('Notification action clicked:', action, notification);

  switch (action) {
    case 'view_task':
      // Open task details
      const taskUrl = `/tasks/${notification.data?.taskId || ''}`;
      self.clients.openWindow(taskUrl);
      break;

    case 'complete_task':
      // Send message to complete task
      sendMessageToClient({
        type: 'COMPLETE_TASK',
        taskId: notification.data?.taskId
      });
      break;

    case 'snooze':
      // Snooze notification (re-show after delay)
      setTimeout(() => {
        self.registration.showNotification(notification.title, {
          body: notification.body,
          icon: notification.icon,
          tag: `${notification.tag}-snoozed`
        });
      }, 10 * 60 * 1000); // 10 minutes
      break;

    case 'dismiss':
      // Just close (already handled by default)
      break;

    default:
      console.warn('Unknown notification action:', action);
  }

  trackNotificationEvent('action_clicked', notification, { action });
}

// Send message to client applications
async function sendMessageToClient(message: any) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

  for (const client of clients) {
    try {
      client.postMessage(message);
    } catch (error) {
      console.error('Error sending message to client:', error);
    }
  }
}

// Track notification events for analytics
function trackNotificationEvent(eventType: string, notification: Notification, extra?: any) {
  const eventData = {
    type: eventType,
    notificationTag: notification.tag,
    timestamp: Date.now(),
    extra
  };

  // Send tracking data to clients
  sendMessageToClient({
    type: 'NOTIFICATION_EVENT',
    data: eventData
  });
}

// Handle install event
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('Push notification service worker installing');
  self.skipWaiting();
});

// Handle activate event
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('Push notification service worker activating');
  event.waitUntil(self.clients.claim());
});

export interface NotificationServiceWorkerMessage {
  type: 'COMPLETE_TASK' | 'NOTIFICATION_EVENT';
  taskId?: string;
  data?: any;
}
