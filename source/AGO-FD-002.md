# AGO-FD-002 candidate REVIEW
Latest scope: ai-growth-office Issue23 comment7156827809. Main checked304bcead2d27f32d57f46a4c955ef836b54a201d; FD001 PR22 remains unmerged at98de09eb0c976dbaf9a2ba64a795e2ff4bfe7c57.
Branch codex/ago-fd-002-model-plan-shifts is based on that FD001 head, PR targets its branch to keep FD002 diff separate. This is a stacked dependency, not a merge or modification of FD001. Main preview commit is not copied or replaced.

## Changes
- Data center has TV left/MNT right, normalized model and source plan quantity only; no total/TTL/aggregate card or old WIP/forecast workload table. Missing plan/date/model quantity clearly remains absent. Backend projection/import/NG data calculations remain.
- Source contract checked: RwPlan.records uses PlanRecord date/rawModel/day/night/source. Existing parser normalizes actual import into this contract; display uses normalizePlan, not NG forecast. No real production JSON was read/uploaded; no producer changes or invented fallback values.
- Imported scenario hides ng-summary only; forecast/monster data remains.
- Each occupied human slot gets a compact selector D/A/0.5 and withdraw; titles/accessibility identify slot and10/8/4h. One troop row, horizontal compact controls; no attendance/total capacity/hourly rate output.
- Existing capacity(stage,lot) is a10-hour quantity; serviceTime=36000/rate (TAPE retains COF, OUT120s). Do not multiply rate by hours again: assign resource cutoff from slot hours, disallow service completion beyond cutoff, cap busy accounting. Fractional service boundary uses original1e-8 tolerance.
- Legacy missing workHours defaults10h; half shift still occupies a full headcount slot. Withdrawal clears that slot's hours; new soldier defaultsD; phase locks edits.
- Shared automatic BUBBLE remains8/600s and is excluded from per-human workHours; its original operator/presentation special behavior is retained. VI/OUT share same individual cutoff, MNT/CUT limits remain.
- WIP/weights/threshold/win/loss formula text unchanged. Fixed benchmark sim explicitly uses original full10h to prevent selected individual hours from changing the benchmark basis. Actual production outcome changes naturally.
- FD001 score storage and no-healthbar files unchanged.

## Real local checks
Windows existing Node24 and existing dependencies only:
- tests/ago-fd-002.cjs:7 groups PASS. Mixed10+8+4=22 internal hours and expected processed quantity, conservation; legacy default vs explicitD equality; TV/MNT/caps; withdrawal/reset/phase lock; invalid hours/automatic machine/late arrival; multiple model/shift/date/missing fields; UI source shape.
- tests/v10-engine.cjs:28 PASS.
- tests/v10-bu.cjs PASS; tests/v10-presentation.cjs PASS including original score equivalence.
- tests/ago-fd-001.cjs:9 groups PASS including hung service/body.
- TypeScript noEmit PASS.
- Vite6.4.3 production build:37 modules, PASS; Phaser chunk >500kB warning unchanged.
Initial capacity test exposed fractional boundary374 expected vs372, fixed by1e-8 tolerance and rerun PASS.

## Limits / candidate
No screenshots or successful rendered browser QA: existing supported local browser paths previously timed out and are not retried. Desktop battlefield space, mobile selection usability, actual import->refresh and UI history/no-healthbar remain NOT VERIFIED. CSS/source checks are not screenshots.
Original import keeps report/plan in memory, so full page reload does not auto-persist imported production JSON; this change retains that privacy/data behavior. Re-import is required after reload; no silent demo substitution or production-data persistence added. This is a known acceptance limitation for supervisor decision.
Local static candidate ZIP built; no online URL published. FD001 authorization does not extend to FD002; no main/Pages/workflow/deployment changes. Supervisor must explicitly authorize any future isolated preview publication.
CORE001 stays priority waiting independent review; no new CORE review at final check. Existing automation remains unchanged; no new FD002 schedule added. No install/permission/credentials/fees/merge/deploy/production or JSON-producer changes.


## REWORK7160221368
CORE7160166195先完成提交755e83c40acdf8d63ebad0bc1ec7508b224f3baa后才处理本轮，未并行。
OUT复盘忙时按min(service.end,scenario.duration,individual cutoff)截断，与ledger/resourceBusy一致；新增4h/8h未完成OUT边界回归。
窄屏每兵种仍一行，最小行宽300px，roster局部横向滚动，名称保留82px且取消隐藏；不再强行把全部控件挤进48vw。实际手机/桌面截图仍缺，不能声称可用性验收通过；不重试既有失败浏览器路径。
工件交接边界测试：4h兵在截止前60秒拿到需120秒的单件，另一10h兵仍在岗；现口径保留该未完成件在WIP，不自动交接，原身份/数量守恒。是否转交并继承已工作时间需要老板业务确认，已在当前聊天询问；本轮没有擅自改变该口径，不调整评分。
实测专项9/9、引擎28项、BU/表现回归、TypeScript、37模块构建PASS。尚待业务口径和真实UI验收，本PR继续Draft。无发布/合并/安装/扩权。
