/* IO ARENA service worker */
(function(){var C='io-arena-v1';
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==C}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('message',function(e){var d=e.data||{};if(d.cache)e.waitUntil(caches.open(C).then(function(c){return c.add(new Request(d.cache,{cache:'reload'}))}).catch(function(){}))});
self.addEventListener('notificationclick',function(e){e.notification.close();e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(l){if(l.length)return l[0].focus();return self.clients.openWindow(self.registration.scope)}))});
self.addEventListener('fetch',function(e){var r=e.request;if(r.method!=='GET'||r.headers.has('range'))return;var u=new URL(r.url);if(u.origin!==self.location.origin)return;
e.respondWith(fetch(r).then(function(res){if(res&&res.ok&&res.type==='basic'){var cp=res.clone();caches.open(C).then(function(c){c.put(r,cp)})}return res}).catch(function(){return caches.match(r,{ignoreSearch:true}).then(function(m){if(m)return m;if(r.mode==='navigate')return caches.match(r.url.split('#')[0],{ignoreSearch:true})}).then(function(m){return m||Response.error()})}))});
})();
