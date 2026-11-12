
/* v2.6 telefona kurulum (PWA): yalnız bir web adresinden açıldığında etkin */
(function () {
  if (!/^https?:$/.test(location.protocol)) return;
  const ekle = (t, a) => { const e = document.createElement(t); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); document.head.appendChild(e); };
  ekle('link', { rel: 'manifest', href: 'manifest.webmanifest' }); ekle('link', { rel: 'apple-touch-icon', href: 'icon-192.png' });
  ekle('meta', { name: 'theme-color', content: '#0b1f3a' }); ekle('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }); ekle('meta', { name: 'apple-mobile-web-app-title', content: 'EXIT Bayi' });
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
