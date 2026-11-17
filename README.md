# Factory Defense V0.7.1 independent playable demo

https://sadkikyo0930.github.io/factory-defense-demo/

Source: source/ (Phaser3 + TypeScript + Vite). Local source commit d11f78a557b04f2105b8a058ceeb523f1d98f6bc.

This release adds tested WebGL probing / Canvas2D fallback, visible initialization and asset diagnostics, context-loss preservation, and staged local report parsing with cancellation, selective sheet decoding and the same 15-second total budget. Production routes, staffing, counts and artwork are unchanged.

Diagnostics: append ?diagnostics; explicit Canvas comparison: ?renderer=canvas&diagnostics (use another tab to preserve the original session). No automatic storage clearing or diagnostic upload.

Rollback: backup/v07-before-v071 => 8e6487ad022bee8427659e3ef163c1b31773d0b1. Earlier backup tags remain unchanged.

Actual company-machine grey-screen cause, actual FineReport Excel and Win7/Chrome109 are NOT accepted/tested. Automated and Chromium131 WebGL/Canvas/synthetic workbook checks passed. See source/V071.md; its historical local-only deployment statement is superseded by this release.

Build: cd source && npm ci && npm run build. Existing main-root Pages site remains unchanged. No force push.
