#!/usr/bin/env python3
"""Regenerate Pocket Notes icons from the unchanged user-provided image.

Optional asset-maintenance tool: requires Pillow (python -m pip install Pillow).
It is not needed to run or build the app; generated icons are committed.
No crop, recoloring, AI generation, or aspect-ratio changes are applied.
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/branding/pocket-notes-original.png"
ICONS = ROOT / "public/icons/v2"
BACKGROUND = (250, 248, 242, 255)


def fitted(source: Image.Image, size: int, *, opaque: bool = False) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BACKGROUND if opaque else (0, 0, 0, 0))
    artwork = source.copy()
    artwork.thumbnail((size, size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(artwork, ((size - artwork.width) // 2, (size - artwork.height) // 2))
    return canvas


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    ICONS.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48):
        fitted(source, size).save(ICONS / f"favicon-{size}.png", optimize=True)
    fitted(source, 256).save(ICONS / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    fitted(source, 180, opaque=True).convert("RGB").save(ICONS / "apple-touch-icon.png", optimize=True)
    for size in (192, 512):
        fitted(source, size).save(ICONS / f"icon-{size}.png", optimize=True)
        # The entire source square fits inside the centered safe circle with
        # radius 40% of the icon width: 0.56 * sqrt(2) / 2 < 0.40.
        safe_size = int(size * 0.56)
        maskable = Image.new("RGBA", (size, size), BACKGROUND)
        maskable.alpha_composite(fitted(source, safe_size), ((size - safe_size) // 2,) * 2)
        maskable.convert("RGB").save(ICONS / f"icon-maskable-{size}.png", optimize=True)
    print(f"Pocket Notes icons generated from {source.width}x{source.height} original artwork.")


if __name__ == "__main__":
    main()
