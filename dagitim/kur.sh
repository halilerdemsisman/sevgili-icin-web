#!/usr/bin/env bash
# EXIT Garden · Ubuntu 22.04/24.04 VPS kurulumu (bir kez).
# Paketi (dist/ içeriği) sunucuya yükleyin ve o klasörde çalıştırın:
#   sudo bash dagitim/kur.sh bayi.exitgarden.com
# Yapılanlar: Node.js 22, Caddy (otomatik HTTPS), güvenlik duvarı, "exit" sistem kullanıcısı,
# /opt/exit (program), /var/lib/exit (veri), systemd servisi, günlük yedek.
# Tekrar çalıştırmak güvenlidir; mevcut veri ve ayarlar korunur.
set -euo pipefail
ALAN=${1:-}
[ "$(id -u)" = 0 ] || { echo "root olarak çalıştırın: sudo bash $0 ALAN_ADI"; exit 1; }
[ -n "$ALAN" ] || { echo "Kullanım: sudo bash $0 bayi.ornek.com"; exit 1; }
KAYNAK=$(cd "$(dirname "$0")/.." && pwd)
[ -f "$KAYNAK/sunucu/sunucu.js" ] || { echo "Paket bulunamadı: $KAYNAK (dist/ içeriğini yükleyin)"; exit 1; }
adim() { echo; echo "==> $*"; }

adim "Sistem paketleri"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates gnupg ufw rsync debian-keyring debian-archive-keyring apt-transport-https

adim "Node.js 22"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

adim "Caddy"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

adim "Kullanıcı ve klasörler"
id exit >/dev/null 2>&1 || useradd --system --home /var/lib/exit --shell /usr/sbin/nologin exit
mkdir -p /opt/exit /var/lib/exit /etc/exit /var/log/caddy
rsync -a --delete --exclude 'yedekler/' "$KAYNAK"/ /opt/exit/
chown -R root:root /opt/exit
chown -R exit:exit /var/lib/exit && chmod 750 /var/lib/exit
[ -f /etc/exit/ortam ] || install -m 640 -o root -g exit "$KAYNAK/dagitim/ortam.ornek" /etc/exit/ortam

adim "Servis"
install -m 644 "$KAYNAK/dagitim/exit.service" /etc/systemd/system/exit.service
systemctl daemon-reload
systemctl enable exit >/dev/null

adim "Caddy yapılandırması ($ALAN)"
sed "s/ALAN_ADI/$ALAN/" "$KAYNAK/dagitim/Caddyfile.ornek" > /etc/caddy/Caddyfile
chown caddy:caddy /var/log/caddy
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl reload caddy || systemctl restart caddy

adim "Güvenlik duvarı (yalnız SSH, 80, 443)"
ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
ufw --force enable

adim "Günlük yedek"
install -m 755 "$KAYNAK/dagitim/yedek.sh" /usr/local/sbin/exit-yedek
printf '#!/bin/sh\nVERI_KLASORU=/var/lib/exit /usr/local/sbin/exit-yedek >/dev/null\n' > /etc/cron.daily/exit-yedek
chmod 755 /etc/cron.daily/exit-yedek

echo
echo "Kurulum tamam. Sıradaki adımlar:"
echo "  1) Eski sunucudan veriyi taşıyın (dagitim/TASINMA.md) veya boş başlayın."
echo "  2) Yönetici şifresi:  sudo -u exit env VERI_KLASORU=/var/lib/exit node /opt/exit/sunucu/sunucu.js --yonetici-sifre 'GUCLU_SIFRE'"
echo "  3) Başlatın:          sudo systemctl start exit && sudo systemctl status exit"
echo "  4) Açın:              https://$ALAN   ve   https://$ALAN/satis"
