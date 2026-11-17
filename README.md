# Factory Defense V0.7 — FineReport header fix

Playable demo: https://sadkikyo0930.github.io/factory-defense-demo/

Source: source/ (Phaser 3 + TypeScript + Vite). Corresponding local source commit: d6da0dca416e341116c2ad521dca5112f59f2380.

Header fix: recognizes 岗位 / 岗位明细, fullwidth and whitespace variants, deep merged WIP情况 → 今日实绩 headers, original sheet coordinates and TV/MNT grouping. Failed recognition displays sheet/header/candidate diagnostics. It never substitutes attendance, target, yesterday or BAL values. Existing production rules and art unchanged.

Rollback before this patch: backup/v07-before-header-fix => cfd076679b93417c339d0baf789392b384e487bc.
Original V0.6 backup retained: backup/v06-before-v07 => 4c8a6f0652bc4b82f9947c930e1686ddba0e4221.

Tests and limitations: source/REPORT-HEADER-FIX.md and source/V07.md (historical local-development deployment statements are superseded by this release).
Synthetic XLSX/XLS fixtures only. Actual FineReport Excel and Windows7/Chrome109 have NOT been validated.

Build: cd source && npm ci && npm run build. Pages still serves the root build from main. No forced history changes.
