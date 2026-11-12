#!/usr/bin/env bash
# EXIT Garden · günlük sıkıştırılmış yedek. kur.sh bunu /etc/cron.daily/exit-yedek olarak bağlar.
# Sunucunun kendi günlük yedeğine (VERI_KLASORU/yedek) ek olarak tüm veriyi tek arşivde toplar:
#   veri.sqlite + veri.json (sunucu çalışırken tutarlı kopya), dosyalar/, kayitlar/, mrp_veri.json, gizli.json
# Sunucu dışına kopyalamak için YEDEK_UZAK ayarlayın (ör. rclone ile: "rclone copy {} uzak:exit-yedek").
set -euo pipefail
VERI=${VERI_KLASORU:-/var/lib/exit}
HEDEF=${YEDEK_KLASORU:-/var/backups/exit}
SAKLA=${YEDEK_GUN:-14}
PROGRAM=${EXIT_PROGRAM:-/opt/exit/sunucu/sunucu.js}
KULLANICI=${EXIT_KULLANICI:-exit}
mkdir -p "$HEDEF"; chmod 700 "$HEDEF"
GECICI=$(mktemp -d); trap 'rm -rf "$GECICI"' EXIT
mkdir -p "$GECICI/veri"
# tutarlı veri kopyası (veritabanı açıkken doğrudan kopyalanmaz)
if [ "$(id -u)" = 0 ] && id "$KULLANICI" >/dev/null 2>&1; then
  chown "$KULLANICI" "$GECICI/veri"
  runuser -u "$KULLANICI" -- env VERI_KLASORU="$VERI" node --disable-warning=ExperimentalWarning "$PROGRAM" --yedek "$GECICI/veri" >/dev/null
else
  VERI_KLASORU="$VERI" node --disable-warning=ExperimentalWarning "$PROGRAM" --yedek "$GECICI/veri" >/dev/null
fi
for x in dosyalar kayitlar mrp_veri.json gizli.json; do [ -e "$VERI/$x" ] && cp -a "$VERI/$x" "$GECICI/veri/"; done
DOSYA="$HEDEF/exit-$(date +%F).tar.gz"
tar -czf "$DOSYA" -C "$GECICI" veri
chmod 600 "$DOSYA"
find "$HEDEF" -name 'exit-*.tar.gz' -mtime +"$SAKLA" -delete
if [ -n "${YEDEK_UZAK:-}" ]; then eval "${YEDEK_UZAK//\{\}/$DOSYA}"; fi
echo "Yedek: $DOSYA"
