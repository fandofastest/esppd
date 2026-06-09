from __future__ import annotations

import json
from pathlib import Path

import fitz


ROOT = Path(__file__).resolve().parents[1]
PDFS = [
    ROOT / "masterdata" / "output" / "ST.pdf",
    ROOT / "masterdata" / "output" / "VISUM_DALAM_KOTA.pdf",
    ROOT / "masterdata" / "output" / "VISUM_LUAR_KOTA.pdf",
]
OUT_DIR = ROOT / "masterdata" / "output" / "_inspect"


def render_first_page(pdf_path: Path) -> dict:
    doc = fitz.open(pdf_path)
    page = doc[0]
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    image_path = OUT_DIR / f"{pdf_path.stem}.png"
    pix.save(image_path)

    data = page.get_text("dict")
    spans = []
    for block in data.get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = span.get("text", "").strip()
                if not text:
                    continue
                spans.append(
                    {
                        "text": text,
                        "font": span.get("font"),
                        "size": round(span.get("size", 2), 2),
                        "bbox": [round(n, 2) for n in span.get("bbox", [])],
                    }
                )

    fonts = {}
    for item in spans:
        key = (item["font"], item["size"])
        fonts[key] = fonts.get(key, 0) + 1

    summary = [
        {"font": font, "size": size, "count": count}
        for (font, size), count in sorted(fonts.items(), key=lambda x: (-x[1], x[0][0], x[0][1]))
    ]

    result = {
        "file": str(pdf_path),
        "image": str(image_path),
        "page_rect": [round(n, 2) for n in page.rect],
        "fonts": summary[:25],
        "spans": spans[:120],
    }
    doc.close()
    return result


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    results = [render_first_page(path) for path in PDFS]
    output_path = OUT_DIR / "summary.json"
    output_path.write_text(json.dumps(results, indent=2, ensure_ascii=True), encoding="utf-8")
    print(output_path)


if __name__ == "__main__":
    main()
