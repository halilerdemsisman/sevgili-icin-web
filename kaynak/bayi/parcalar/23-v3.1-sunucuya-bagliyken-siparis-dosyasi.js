
// v3.1: sunucuya bağlıyken sipariş dosyası indirilmez, sipariş doğrudan satış ekibine gider
(function () { if (!window.EXIT_SUNUCU) return; const _sd = siparisDosyasi;
  siparisDosyasi = function (o) { const c = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (!/\.json$/.test(this.download || '')) c.call(this); }; try { _sd(o); } finally { HTMLAnchorElement.prototype.click = c; } };
})();
