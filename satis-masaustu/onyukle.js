// Önyükleme (Faz 3): sayfaya yalnız bu dar arayüz açılır; Node ve Electron'un geri kalanına erişim yoktur.
// Satış paneli window.exitMasaustu varsa masaüstü özelliklerini (bildirim, sayaç, ayrı pencere, kısayollar) kullanır.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const dinle = (kanal, f) => { const h = (e, ...a) => { try { f(...a); } catch (x) { console.error(x); } }; ipcRenderer.on(kanal, h); return () => ipcRenderer.removeListener(kanal, h); };

contextBridge.exposeInMainWorld('exitMasaustu', {
  bilgi: () => ipcRenderer.invoke('bilgi'),
  rozet: n => ipcRenderer.send('rozet', Number(n) || 0),
  bildir: o => ipcRenderer.send('bildir', { baslik: String(o && o.baslik || ''), metin: String(o && o.metin || ''), hedef: String(o && o.hedef || '') }),
  pencere: hedef => ipcRenderer.send('pencere', String(hedef || '')),
  pdf: () => ipcRenderer.invoke('pdf'),
  acildiginda: f => dinle('ac', f),        // bildirime tıklandı: f("siparis:EXG-2026-0012")
  kisayol: f => dinle('kisayol', f),       // menü kısayolu: f("ara") · f("git", 3)
  // yalnız uygulamanın kendi sayfaları (kurulum, bağlantı hatası) kullanabilir; ana süreç denetler
  sunucuAdresi: () => ipcRenderer.invoke('sunucu-adresi'),
  sunucuKaydet: adres => ipcRenderer.invoke('sunucu-kaydet', String(adres || '')),
  yenidenDene: yol => ipcRenderer.send('yeniden-dene', String(yol || '')),
});
