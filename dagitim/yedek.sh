#!/usr/bin/env bash
# EXIT Garden · günlük sıkıştırılmış yedek. kur.sh bunu /etc/cron.daily/exit-yedek olarak bağlar.
# Sunucunun kendi günlük yedeğine (VERI_KLASORU/yedek) ek olarak tüm veri klasörünü arşivler.
# Sunucu dışına kopyalamak için YEDEK_UZAK ayarlayın (ör. rclone ile: "rclone copy {} uzak:exit-yedek").
set -euo pipefail
VERI=${VERI_KLASORU:-/var/lib/exit}
HEDEF=${YEDEK_KLASORU:-/var/backups/exit}
SAKLA=${YEDEK_GUN:-14}
mkdir -p "$HEDEF"; chmod 700 "$HEDEF"
DOSYA="$HEDEF/exit-$(date +%F).tar.gz"
tar -czf "$DOSYA" --exclude="$(basename "$VERI")/yedek" -C "$(dirname "$VERI")" "$(basename "$VERI")"
chmod 600 "$DOSYA"
find "$HEDEF" -name 'exit-*.tar.gz' -mtime +"$SAKLA" -delete
if [ -n "${YEDEK_UZAK:-}" ]; then eval "${YEDEK_UZAK//\{\}/$DOSYA}"; fi
echo "Yedek: $DOSYA"
