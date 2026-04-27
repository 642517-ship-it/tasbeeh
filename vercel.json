// sw.js — Service Worker for مسبحتي PWA
const CACHE_NAME = 'tasbeeh-v2';
const ASSETS = ['./index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
  scheduleNextAlarm();
});

self.addEventListener('fetch', e => {
  // Network-first for index.html so updates ship immediately
  if (e.request.url.endsWith('/') || e.request.url.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'UPDATE_TIMES') {
    self._notifTimes = e.data.times;
    self._notifEnabled = e.data.enabled;
    scheduleNextAlarm();
  }
});

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

let _alarmTimer = null;

function scheduleNextAlarm() {
  if (_alarmTimer) clearTimeout(_alarmTimer);
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
      if (th === hh && tm === mm) showNotification();
    });
  }
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
    tag: 'tasbeeh-reminder',
    renotify: true,
    data: { url: './index.html' }
  });
}

self.addEventListener('periodicsync', e => {
  if (e.tag === 'tasbeeh-check') {
    e.waitUntil((async () => { scheduleNextAlarm(); })());
  }
});
