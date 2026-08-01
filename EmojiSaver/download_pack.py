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

Output structure (matches real Telegram emoji pack format):
    downloaded/<pack_name>/
        0001/
            sticker.tgs       ← raw TGS file
            sticker.png       ← rendered PNG (512×512, first frame)
            lottie.json       ← decompressed Lottie JSON
            info.json         ← emoji metadata (emoji char, keywords, file_id, etc.)
        0002/
            ...
    downloaded/<pack_name>.zip ← ZIP of the above folder tree
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

    pack_dir = Path("downloaded") / pack_name
    pack_dir.mkdir(parents=True, exist_ok=True)

    # collect all files for zip
    all_files = []

    for i, sticker in enumerate(stickers, 1):
        file_id   = sticker["file_id"]
        is_video  = sticker.get("is_video", False)
        is_anim   = sticker.get("is_animated", False)
        emoji     = sticker.get("emoji", "")
        keywords  = [k.get("keyword", "") for k in sticker.get("keywords", [])]

        # each emoji gets its own numbered folder
        emoji_dir = pack_dir / f"{i:04d}"
        emoji_dir.mkdir(parents=True, exist_ok=True)

        print(f"  [{i:>3}/{len(stickers)}] {emoji} downloading...", end=" ", flush=True)
        raw = download_file(file_id)

        # --- build info.json (metadata) ---
        info = {
            "index": i,
            "emoji": emoji,
            "keywords": keywords,
            "file_id": file_id,
            "is_animated": is_anim,
            "is_video": is_video,
            "pack": pack_name,
            "title": title,
        }
        info_path = emoji_dir / "info.json"
        info_path.write_text(json.dumps(info, ensure_ascii=False, indent=2))
        all_files.append(info_path)

        if is_anim:
            # Save raw TGS file
            tgs_path = emoji_dir / "sticker.tgs"
            tgs_path.write_bytes(raw)
            all_files.append(tgs_path)

            # Decompress to lottie.json
            try:
                lottie_data = gzip.decompress(raw)
                lottie_path = emoji_dir / "lottie.json"
                lottie_path.write_bytes(lottie_data)
                all_files.append(lottie_path)
            except Exception as exc:
                print(f"  [warn] TGS→lottie.json failed: {exc}")

            # Render PNG
            png = tgs_to_png(raw)
            if png:
                png_path = emoji_dir / "sticker.png"
                png_path.write_bytes(png)
                all_files.append(png_path)
                print(f"✓ {i:04d}/ (tgs + lottie.json + png + info.json)")
            else:
                print(f"⚠ {i:04d}/ (tgs + lottie.json + info.json, PNG failed)")

        elif is_video:
            # WebM video sticker
            webm_path = emoji_dir / "sticker.webm"
            webm_path.write_bytes(raw)
            all_files.append(webm_path)
            print(f"✓ {i:04d}/ (webm + info.json)")

        else:
            # Static WebP → PNG
            try:
                png = webp_to_png(raw)
                png_path = emoji_dir / "sticker.png"
                png_path.write_bytes(png)
                all_files.append(png_path)
                # also save original webp
                webp_path = emoji_dir / "sticker.webp"
                webp_path.write_bytes(raw)
                all_files.append(webp_path)
                print(f"✓ {i:04d}/ (png + webp + info.json)")
            except Exception as exc:
                webp_path = emoji_dir / "sticker.webp"
                webp_path.write_bytes(raw)
                all_files.append(webp_path)
                print(f"⚠ {i:04d}/ (raw webp + info.json): {exc}")

    # zip with full folder tree: pack_name/0001/sticker.png etc.
    zip_path = Path("downloaded") / f"{pack_name}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in all_files:
            # arcname keeps pack_name/0001/filename structure
            arcname = f.relative_to(Path("downloaded"))
            zf.write(f, arcname=str(arcname))

    print(f"\n🎉  Done!  {len(all_files)} files saved.")
    print(f"   Folder : {pack_dir}/")
    print(f"   Archive: {zip_path}")
    print(f"\n   ZIP structure:")
    print(f"   {pack_name}/")
    print(f"     0001/  sticker.tgs  sticker.png  lottie.json  info.json")
    print(f"     0002/  ...")


if __name__ == "__main__":
    main()
