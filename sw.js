// sw.js — Service Worker for مسبحتي PWA
// Handles: caching, background notifications, alarm scheduling

const CACHE_NAME = 'tasbeeh-v1';
const ASSETS = ['./index.html', './manifest.json'];

// ── Install: cache app shell ──────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
  // Start alarm loop immediately on activation
  scheduleNextAlarm();
});

// ── Fetch: serve from cache, fallback to network ──────────────────────────
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// ── Message from main app: update notification times ─────────────────────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'UPDATE_TIMES') {
    // Store times in SW scope via IndexedDB-like approach using a simple object
    self._notifTimes = e.data.times;      // e.g. ["07:00","13:00","21:00"]
    self._notifEnabled = e.data.enabled;
    scheduleNextAlarm();
  }
  if (e.data && e.data.type === 'PING') {
    e.ports[0].postMessage({ type: 'PONG' });
  }
});

// ── Notification click: open/focus the app ───────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('index.html') && 'focus' in c) return c.focus();
      }
      return clients.openWindow('./index.html');
    })
  );
});

// ── Alarm scheduling via setTimeout loop ─────────────────────────────────
// Service Workers can be woken by Push or periodic sync.
// For local alarms we use a self-perpetuating setTimeout that fires
// every minute, checks if it's time to notify, then sleeps again.
// On Android with Chrome, the SW stays alive as long as the browser
// process is running (even in background). This is reliable for local alarms.

let _alarmTimer = null;

function scheduleNextAlarm() {
  if (_alarmTimer) clearTimeout(_alarmTimer);
  // Check every 60 seconds
  _alarmTimer = setTimeout(checkAndNotify, 60 * 1000);
}

function checkAndNotify() {
  const times = self._notifTimes || [];
  const enabled = self._notifEnabled !== false;

  if (enabled && times.length > 0) {
    const now = new Date();
    const hh = now.getHours();
    const mm = now.getMinutes();

    times.forEach(t => {
      const [th, tm] = t.split(':').map(Number);
      // Fire if within the same minute
      if (th === hh && tm === mm) {
        showNotification();
      }
    });
  }

  // Re-schedule for next minute
  scheduleNextAlarm();
}

function showNotification() {
  const messages = [
    'حان وقت التسبيح 📿 لا تنسَ ذكر الله',
    'سبحان الله وبحمده 🌿 وقت الجلسة',
    'اللهم صلِّ على نبينا محمد ﷺ',
    'ذكر الله يطمئن القلوب 💚',
  ];
  const body = messages[Math.floor(Math.random() * messages.length)];

  return self.registration.showNotification('مسبحتي 📿', {
    body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'tasbeeh-reminder',       // replaces previous if still showing
    renotify: true,
    requireInteraction: false,
    silent: false,
    actions: [
      { action: 'open', title: 'افتح التطبيق' },
      { action: 'dismiss', title: 'لاحقاً' }
    ],
    data: { url: './index.html' }
  });
}

// ── Periodic Background Sync (Chrome Android) ────────────────────────────
// When registered, Chrome wakes the SW periodically (~every few hours).
// We use this as a fallback to re-arm the minute-timer after SW was killed.
self.addEventListener('periodicsync', e => {
  if (e.tag === 'tasbeeh-check') {
    e.waitUntil(
      (async () => {
        // Re-read stored times from all clients
        const allClients = await clients.matchAll();
        if (allClients.length > 0) {
          allClients[0].postMessage({ type: 'GET_TIMES' });
        }
        scheduleNextAlarm();
      })()
    );
  }
});

// ── Push (future-proof) ───────────────────────────────────────────────────
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(showNotification());
});
