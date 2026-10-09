#!/usr/bin/env python3
"""
MRP Pro — tek dosya derleyici.

index.html içindeki yerel CSS ve JS dosyalarını sayfaya gömerek, başka hiçbir
dosyaya ihtiyaç duymayan tek bir HTML üretir:  mrp-pro-tek-dosya.html

Kullanım:  python3 build-single.py
Kaynak dosyalarda değişiklik yaptıktan sonra yeniden çalıştırın.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "index.html"
OUT = ROOT / "mrp-pro-tek-dosya.html"

LOCAL_CSS = re.compile(r'<link rel="stylesheet" href="(assets/[^"]+\.css)">')
LOCAL_JS = re.compile(r'<script defer src="(assets/[^"]+\.js)"></script>\n?')


def read(rel: str) -> str:
    text = (ROOT / rel).read_text(encoding="utf-8")
    if "</script" in text.lower() or "</style" in text.lower():
        sys.exit(f"HATA: {rel} gömülemez — içinde </script veya </style geçiyor.")
    return text


def main() -> None:
    html = SRC.read_text(encoding="utf-8")

    html, n_css = LOCAL_CSS.subn(lambda m: f"<style>\n/* {m.group(1)} */\n{read(m.group(1))}</style>", html)

    # Yerel betikler <head>'den çıkarılır ve aynı sırayla </body> öncesine gömülür.
    # CDN betikleri "defer" ile kalır; uygulama bunları yalnızca DOMContentLoaded sonrası kullanır.
    scripts = LOCAL_JS.findall(html)
    html = LOCAL_JS.sub("", html)
    html = html.replace("<!-- Uygulama -->\n", "")
    bundle = "\n".join(f"<script>\n/* {rel} */\n{read(rel)}</script>" for rel in scripts)
    if "</body>" not in html:
        sys.exit("HATA: index.html içinde </body> bulunamadı.")
    html = html.replace("</body>", f"<!-- Uygulama (tek dosya derlemesi: build-single.py) -->\n{bundle}\n</body>", 1)

    OUT.write_text(html, encoding="utf-8")
    print(f"{OUT.name}: {n_css} stil + {len(scripts)} betik gömüldü, {OUT.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
