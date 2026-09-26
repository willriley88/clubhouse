#!/usr/bin/env python3
"""Fix the two correctness bugs the bulk color migration introduced.

1. SVG presentation attributes do not resolve CSS custom properties.
   `stroke="var(--club-primary)"` is invalid per SVG/CSS and renders black in
   every browser. The value must move into the `style` prop, where it is a real
   CSS declaration:  style={{ stroke: 'var(--club-primary)' }}

2. Filled-accent surfaces were left with `color: var(--club-primary)`. That was
   fine when accent was always LeBaron gold, but a club whose accent is dark
   (e.g. a deep green logo) gets dark text on a dark chip. The foreground of an
   accent-filled surface must be --club-on-accent, which is computed by
   contrast in lib/theme.ts.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGETS = list((ROOT / "app").rglob("*.tsx"))

# 1. stroke="var(...)" / fill="var(...)" -> style prop.
ATTR = re.compile(r'\b(stroke|fill)="(var\(--club-[a-z-]+\))"')

# 2. accent background + primary foreground -> accent background + on-accent fg.
ACCENT_FG = re.compile(
    r"(background:\s*'var\(--club-accent\)'[^\n]*?)color:\s*'var\(--club-primary\)'"
)


def fix_svg_attrs(src: str) -> tuple[str, int]:
    """Move var() out of SVG attributes into an inline style.

    Handled conservatively: only rewrites when the element has no existing
    `style` prop, so we never clobber one. Anything skipped is reported.
    """
    count = 0
    out_lines = []
    for line in src.splitlines(keepends=True):
        matches = list(ATTR.finditer(line))
        if not matches or "style=" in line:
            out_lines.append(line)
            continue
        decls = []
        new_line = line
        for m in matches:
            prop, value = m.group(1), m.group(2)
            decls.append(f"{prop}: '{value}'")
            new_line = new_line.replace(m.group(0), "", 1)
            count += 1
        # Insert the style prop right after the opening tag name.
        new_line = re.sub(r"(<svg|<polyline|<path|<circle|<rect|<line)\b",
                          r"\1 style={{ " + ", ".join(decls) + " }}", new_line, count=1)
        # Tidy the double spaces left by removing attributes.
        new_line = re.sub(r"  +", " ", new_line)
        out_lines.append(new_line)
    return "".join(out_lines), count


def main() -> int:
    svg_total = fg_total = 0
    for path in TARGETS:
        src = path.read_text()
        out, n_svg = fix_svg_attrs(src)
        out, n_fg = ACCENT_FG.subn(r"\1color: 'var(--club-on-accent)'", out)
        if out != src:
            path.write_text(out)
            print(f"  {path.relative_to(ROOT)}: svg_attrs={n_svg} accent_fg={n_fg}")
        svg_total += n_svg
        fg_total += n_fg

    print(f"\nsvg attribute fixes: {svg_total}\naccent foreground fixes: {fg_total}")

    leftover = []
    for path in TARGETS:
        for i, line in enumerate(path.read_text().splitlines(), 1):
            if ATTR.search(line):
                leftover.append(f"  {path.relative_to(ROOT)}:{i}")
    if leftover:
        print("\nSTILL NEEDS MANUAL FIX (element already had a style prop):")
        print("\n".join(leftover))
    else:
        print("\nNo var() left in SVG presentation attributes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
