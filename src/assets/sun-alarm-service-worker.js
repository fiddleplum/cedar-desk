// const cacheName = 'sun-alarm-cache';
// const urlsToCache = [
// 	'/'
// ];

// self.addEventListener('install', (event) => {
// 	console.log('Installing Sun Alarm service worker...');
// 	// Perform install steps
// 	event.waitUntil(
// 		caches.open(cacheName).then((cache) => {
// 		console.log('Opened cache');
// 		return cache.addAll(urlsToCache);
// 		})
// 	);
// });

// self.addEventListener('fetch', (event) => {
// 	event.respondWith(
// 		caches.match(event.request)
// 		.then((response) => {
// 			// Cache hit - return response
// 			if (response) {
// 			return response;
// 			}
// 			return fetch(event.request);
// 		}
// 		)
// 	);
// });
