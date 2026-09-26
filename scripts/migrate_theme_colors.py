#!/usr/bin/env python3
"""One-shot migration: replace hardcoded LeBaron hexes with club theme vars.

Ran once to de-brand the UI. Kept in the repo as a record of what changed and
so the check at the bottom can be re-run as a regression guard.

  #152644 (LeBaron navy) -> var(--club-primary)
  #c9a84c (LeBaron gold) -> var(--club-accent)

Case that needs care: a filled accent button with primary-colored label. There
the label must become var(--club-on-accent), not var(--club-primary) — for a
club whose accent is dark, primary-on-accent is unreadable. Those are fixed by
hand after this pass; the audit at the end lists candidates.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGETS = list((ROOT / "app").rglob("*.tsx")) + list((ROOT / "lib").rglob("*.ts"))

NAVY = re.compile(r"#152644", re.I)
GOLD = re.compile(r"#c9a84c", re.I)

# lib/club-config.ts holds the DEFAULT_CONFIG fallback values — those are data,
# not styling, and must stay literal hexes.
SKIP = {ROOT / "lib" / "club-config.ts", ROOT / "lib" / "theme.ts"}


def main() -> int:
    changed = 0
    for path in TARGETS:
        if path in SKIP:
            continue
        src = path.read_text()
        out = NAVY.sub("var(--club-primary)", src)
        out = GOLD.sub("var(--club-accent)", out)
        if out != src:
            path.write_text(out)
            n = len(NAVY.findall(src)) + len(GOLD.findall(src))
            print(f"  {path.relative_to(ROOT)}: {n} replacements")
            changed += 1

    print(f"\n{changed} files rewritten")

    # Audit: filled-accent surfaces whose foreground should be --club-on-accent.
    print("\nReview candidates (accent background + primary foreground):")
    pat = re.compile(
        r"background:\s*'var\(--club-accent\)'[^}]*color:\s*'var\(--club-primary\)'"
    )
    for path in TARGETS:
        if path in SKIP:
            continue
        for i, line in enumerate(path.read_text().splitlines(), 1):
            if pat.search(line):
                print(f"  {path.relative_to(ROOT)}:{i}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
