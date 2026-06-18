# Penpot design notes (Kompakt Audiobook Player)

Screen size: **480 × 800** (Mudita Kompakt). Pure black/white, Lato. Boards read from the Penpot file.

## Bottom nav (all tabs)
Three items: **Books** (columns glyph), **Player** (play triangle), **Settings** (gear). Selected item is bold with an underline indicator. App opens on **Player**.

## Player screen
- Author name (regular), Book **title** (bold, large, centered)
- Chapter nav row: `◁  Ch 2 of 9  ▷` (prev/next chapter), filename below e.g. `ch02_the_award.mp3`
- Speed label `1x` (bold, left-aligned) above the progress bar — tap cycles
- Progress bar (filled track), left = current position `0:32:15`, right = total/chapter duration `2:14:30` (tap toggles chapter/total)
- Transport row: `-1m`  `-10s`  `▮▮ (play/pause, filled)`  `+10s`  `+1m`
- No mini-player on this tab (would duplicate).

## Books (library) screen
- Top filter row: pills `All` `New` `In Progress` `Finished` (selected = filled black). [Spec says bottom-sheet instead.]
- List rows: Author name (regular) / **Book title** (bold) / `12 chapters` subtitle; progress `24%` right-aligned on the same row as title.
- Dashed dividers between rows.
- "No active book" variant: bottom nav directly. "Active book" variant: mini-player above nav.

## Settings screen
- Rows separated by dividers: **Root folder** → `/sdcard/Audiobooks`; **Default speed** → `1×` (right); **Stop app**.
- Mini-player above nav when a book is active.
- Secret debug menu: tap "Settings" title 5× rapidly.

## Persistent mini-player (Books & Settings tabs, when a book is loaded)
Progress bar + transport `-1m  -10s  ▮▮  +10s  +1m`, above the bottom nav.

## Conflicts resolved toward spec
- Filter: spec = bottom sheet (design = top pills).
- Subtitle: spec = no file extension (design shows `.mp3` on some boards).
