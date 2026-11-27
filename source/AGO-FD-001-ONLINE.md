# AGO-FD-001 isolated online preview
Authorization: owner current chat and Issue20 comment7154570351 (supersedes7154487760/7154488390).
Preview: https://sadkikyo0930.github.io/factory-defense-demo/previews/ago-fd-001/ec192cbb/
Game code SHA: ec192cbb05cc095b8588669913d2bd8facef3e21
Preview publication SHA: 304bcead2d27f32d57f46a4c955ef836b54a201d
Before publication main SHA: bebfdd7fb94a06df7a0f1899a1cd5d7f7a183ca4

## Preconditions verified
The official previous Pages run44889834926 build job136803076940 checked out ref main at bebfdd7 and uploaded path "." / INPUT_PATH "."; deployment7961480079 reports success at the existing Pages URL. Thus main-root publishing was verified through actual deployment logs, despite the Pages settings endpoint being unavailable to the CLI.
Existing publish-built-site.yml only triggers on source/src/**, source/index.html, source/public/**, source/vite.config.ts, or that workflow itself. The preview prefix matches none.
Before moving main, every pre-existing tree entry was compared and its SHA was identical. Exactly77 blob entries were added, all under previews/ago-fd-001/ec192cbb/. No existing entry removed or replaced. No root index/assets/release/source/workflow/Pages setting changed. Original PR was not merged.

## Contents and checks
Only reviewed compiled HTML/JS/CSS and68 public PNGs; no original ZIP, CMD/CJS launcher, local paths, source map, credentials or private office data included. Existing repository blobs reused where exact Git hash matched;4 new text blobs matched local hashes.
Entry assets use relative URLs; runtime art/v06/v10 paths remain below the preview directory. No base path back to production root added. index.html is the same compiled entry as candidate.html.
Actual HTTPS GET of all77 published files: HTTP200, byte-for-byte identical to local compiled output, failures=[].
Official Pages run45559740905: completed/success for304bcead. Existing compile-and-writeback workflow was not triggered by this preview-only change.
No new game code or WIP/scoring/weights/victory changes in this publication.

## Limits
HTTP/resource integrity and successful Pages deployment are verified. Actual rendered TV/MNT play, history persistence across reload/reopen, duplicate challenge handling and visible no-health-bar gameplay still require independent browser interaction. No UI success claimed and no repeated failed local browser launch attempted.
This is a separate URL path on the existing Pages origin, not a separate origin. Browser storage is origin-scoped; use synthetic data only and do not import production/personal data. It does not provide cloud score sharing.
PR remains Draft and unmerged; existing official automation remains ACTIVE at30minute interval for supervisor review.
