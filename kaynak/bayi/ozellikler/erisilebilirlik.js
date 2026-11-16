// Faz 2c · erişilebilirlik (WCAG 2.1 AA, axe denetimi). Formların çoğu <label>Ad</label><input id=…> biçiminde
// yazılmıştır: etiket alana bağlı değildir, ekran okuyucu alanın adını söylemez ve etikete tıklamak alanı seçmez.
// Bu dosya sayfaya eklenen her formda etiketi hemen ardından gelen alana bağlar (for=); ekranlara dokunmaz.
//   • Etiket: ardından gelen input/select/textarea (kimliği yoksa verilir).
//   • Adet kutuları (.adet içinde, etiketsiz): "Adet".
//   • Sayfalar (#uyg > section.sayfa): ana bölge (role=main); katalogda zaten <main> var.
(function () {
  let no = 0;
  const ALAN = /^(INPUT|SELECT|TEXTAREA)$/;
  const adiVar = a => a.hasAttribute('aria-label') || a.hasAttribute('aria-labelledby') || a.closest('label') || (a.id && document.querySelector(`label[for="${CSS.escape(a.id)}"]`));
  function duzenle(kok) {
    if (!kok.querySelectorAll) return;
    kok.querySelectorAll('label:not([for])').forEach(l => {
      if (l.querySelector('input,select,textarea')) return;
      const a = l.nextElementSibling;
      if (!a || !ALAN.test(a.tagName) || a.type === 'hidden' || adiVar(a)) return;
      if (!a.id) a.id = 'alan-' + (++no);
      l.htmlFor = a.id;
    });
    kok.querySelectorAll('.adet input').forEach(a => { if (!adiVar(a)) a.setAttribute('aria-label', 'Adet'); });
    kok.querySelectorAll('section.sayfa:not([role])').forEach(s => { if (s.parentElement && s.parentElement.id === 'uyg') s.setAttribute('role', 'main'); });
  }
  duzenle(document);
  new MutationObserver(L => L.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && duzenle(n.parentElement || n)))).observe(document.body, { childList: true, subtree: true });
})();
