#!/usr/bin/env bash
# EXIT Garden · yeni sürümü kurar. Yeni paketi (dist/ içeriği) sunucuya yükleyip o klasörde çalıştırın:
#   sudo bash dagitim/guncelle.sh
# Veri (/var/lib/exit) ve ayarlar (/etc/exit/ortam) korunur; önce yedek alınır.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "root olarak çalıştırın: sudo bash $0"; exit 1; }
KAYNAK=$(cd "$(dirname "$0")/.." && pwd)
[ -f "$KAYNAK/sunucu/sunucu.js" ] || { echo "Paket bulunamadı: $KAYNAK"; exit 1; }
VERI_KLASORU=/var/lib/exit bash "$KAYNAK/dagitim/yedek.sh"
rsync -a --delete --exclude 'yedekler/' "$KAYNAK"/ /opt/exit/
chown -R root:root /opt/exit
systemctl restart exit
sleep 2
systemctl --no-pager --lines 8 status exit
