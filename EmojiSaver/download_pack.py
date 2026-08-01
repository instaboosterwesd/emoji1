#!/usr/bin/env python3
"""
Standalone Telegram emoji/sticker pack downloader.
No PostgreSQL or running bot needed — just the bot token + pack name.

Usage:
    python download_pack.py <pack_name_or_link>

Examples:
    python download_pack.py glasses_emojique_by_TgEmojis_bot
    python download_pack.py https://t.me/addemoji/glasses_emojique_by_TgEmojis_bot
    python download_pack.py https://t.me/addstickers/SomeStickerPack

Output:
    ./downloaded/<pack_name>/  — all emojis as PNG files
    ./downloaded/<pack_name>.zip — zipped archive of all PNGs
"""

import gzip
import io
import json
import os
import sys
import zipfile
from pathlib import Path

import requests
from dotenv import load_dotenv
from PIL import Image

load_dotenv(Path(__file__).parent / ".env", override=False)

# primary key: EMOJI_BOT_TOKEN (Replit secret); fallback: BOT_TOKEN from .env
BOT_TOKEN = os.getenv("EMOJI_BOT_TOKEN") or os.getenv("BOT_TOKEN", "")
API_BASE  = f"https://api.telegram.org/bot{BOT_TOKEN}"
FILE_BASE = f"https://api.telegram.org/file/bot{BOT_TOKEN}"


def api(method: str, **params):
    r = requests.get(f"{API_BASE}/{method}", params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    if not data.get("ok"):
        raise RuntimeError(f"Telegram error: {data.get('description')}")
    return data["result"]


def download_file(file_id: str) -> bytes:
    info = api("getFile", file_id=file_id)
    url  = f"{FILE_BASE}/{info['file_path']}"
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    return r.content


def tgs_to_png(tgs_data: bytes) -> bytes | None:
    """Convert TGS (gzipped Lottie) → PNG (first frame, 512×512)."""
    try:
        from rlottie_python import LottieAnimation  # type: ignore
        json_data = gzip.decompress(tgs_data)
        anim = LottieAnimation.from_data(json_data.decode())
        frame = anim.render_pillow_frame(frame_num=0, width=512, height=512)
        buf = io.BytesIO()
        frame.save(buf, format="PNG")
        return buf.getvalue()
    except Exception as exc:
        print(f"  [warn] TGS→PNG failed: {exc}")
        return None


def webp_to_png(data: bytes) -> bytes:
    img = Image.open(io.BytesIO(data)).convert("RGBA")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def main():
    if not BOT_TOKEN:
        sys.exit("❌  BOT_TOKEN not set in .env")

    if len(sys.argv) < 2:
        sys.exit("Usage: python download_pack.py <pack_name_or_link>")

    arg = sys.argv[1].strip().rstrip("/")
    # extract pack name from full t.me URL
    pack_name = arg.split("/")[-1] if "t.me" in arg else arg

    print(f"📦  Fetching pack: {pack_name}")
    try:
        pack = api("getStickerSet", name=pack_name)
    except RuntimeError as e:
        sys.exit(f"❌  {e}")

    title    = pack.get("title", pack_name)
    stickers = pack.get("stickers", [])
    print(f"✅  '{title}'  —  {len(stickers)} items")

    out_dir = Path("downloaded") / pack_name
    out_dir.mkdir(parents=True, exist_ok=True)

    saved = []
    for i, sticker in enumerate(stickers, 1):
        file_id   = sticker["file_id"]
        is_video  = sticker.get("is_video", False)
        is_anim   = sticker.get("is_animated", False)

        print(f"  [{i:>3}/{len(stickers)}] downloading...", end=" ", flush=True)
        raw = download_file(file_id)

        if is_anim:
            # TGS → PNG + JSON (for web Lottie animations)
            try:
                json_data = gzip.decompress(raw)
                json_fname = out_dir / f"{i:04d}.json"
                json_fname.write_bytes(json_data)
                saved.append(json_fname)
            except Exception as exc:
                print(f"  [warn] TGS→JSON failed: {exc}")

            png = tgs_to_png(raw)
            if png:
                fname = out_dir / f"{i:04d}.png"
                fname.write_bytes(png)
                saved.append(fname)
                print(f"✓ {fname.name} + .json")
            else:
                # fallback: save raw TGS
                fname = out_dir / f"{i:04d}.tgs"
                fname.write_bytes(raw)
                saved.append(fname)
                print(f"⚠ {fname.name} (raw TGS, conversion failed)")
        elif is_video:
            # WebM — save as-is
            fname = out_dir / f"{i:04d}.webm"
            fname.write_bytes(raw)
            saved.append(fname)
            print(f"✓ {fname.name} (video)")
        else:
            # Static WebP → PNG
            try:
                png = webp_to_png(raw)
                fname = out_dir / f"{i:04d}.png"
                fname.write_bytes(png)
                saved.append(fname)
                print(f"✓ {fname.name}")
            except Exception as exc:
                fname = out_dir / f"{i:04d}.webp"
                fname.write_bytes(raw)
                saved.append(fname)
                print(f"⚠ {fname.name} (raw WebP): {exc}")

    # zip everything
    zip_path = Path("downloaded") / f"{pack_name}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in saved:
            zf.write(f, arcname=f"{pack_name}/{f.name}")

    print(f"\n🎉  Done!  {len(saved)} files saved to:")
    print(f"   Folder : {out_dir}/")
    print(f"   Archive: {zip_path}")


if __name__ == "__main__":
    main()
