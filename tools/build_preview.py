"""
Flattens the Flask site into a single self-contained HTML file.

Useful for sharing a live preview (Netlify drop, GitHub Pages, a Claude
artifact) without running Python. CSS, JS and the portrait are inlined; the
GSAP / Lenis / Lucide CDN tags stay as they are.

    python tools/build_preview.py            -> dist/portfolio.html
    python tools/build_preview.py out.html
"""

import base64
import mimetypes
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from app import app, CONTENT, PROFILE_IMAGE  # noqa: E402


def data_uri(rel_path):
    path = os.path.join(ROOT, "static", rel_path)
    mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
    with open(path, "rb") as fh:
        return "data:%s;base64,%s" % (mime, base64.b64encode(fh.read()).decode())


def read_static(rel_path):
    with open(os.path.join(ROOT, "static", rel_path), encoding="utf-8") as fh:
        return fh.read()


def build():
    with app.test_request_context("/"):
        from flask import render_template
        html = render_template("index.html", c=CONTENT, profile=PROFILE_IMAGE)

    # stylesheets -> <style>
    css = "\n".join(read_static(f) for f in ("css/main.css", "css/animations.css"))
    html = re.sub(
        r'\s*<link rel="stylesheet" href="/static/css/[^"]+">',
        "", html, count=2,
    )
    html = html.replace("</head>", "<style>\n%s\n</style>\n</head>" % css)

    # local scripts -> one <script>, in load order
    order = ["utils", "particles", "wave", "loading", "scroll", "cursor",
             "interactions", "main"]
    js = "\n".join(read_static("js/%s.js" % name) for name in order)
    html = re.sub(r'\s*<script src="/static/js/[^"]+"></script>', "", html)
    html = html.replace("</body>", "<script>\n%s\n</script>\n</body>" % js)

    # portrait + preload -> data URI
    uri = data_uri(PROFILE_IMAGE)
    html = html.replace("/static/" + PROFILE_IMAGE, uri)

    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "dist", "portfolio.html")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(html)
    print("wrote %s (%.1f KB)" % (out, os.path.getsize(out) / 1024))


if __name__ == "__main__":
    build()
