# V1.0 RW 日报：今日 WIP 与 TV / MNT 期末目标

在获授权的 Windows 电脑把 BAT、VBS 和 PS1 解压到同一目录，双击 `Read-RW-WIP.bat`。选择日报、确认实际日期，再选公司允许写入的 JSON 位置。已有 JSON 不会覆盖；取消不会生成 JSON。需要桌面 Excel、获准运行的 Windows Script Host 和默认 Windows PowerShell，不需要 Node 或工具箱。

此版以用户提供的 Win7 V21 ZIP 的实际 BAT、VBS、一键选择器为参考。保留绝对脚本路径、WinForms、VBS COM 直接只读打开、BuildPath 和 ADODB.Stream；PowerShell 只收集选择，不调用 Excel。使用 Unicode 临时交接选择路径，成功或失败后清理；日报本身不复制。COM 不更新外链、不保存工作簿，强制禁用普通自动宏；如提示启用内容、Excel 4.0 宏、修复或退出受保护视图，取消并交 IT。启动器不修改策略、不上传数据。

提取器验证“常规日报 → 岗位明细 → WIP情况 → 今日实绩”，目标必须正好位于左侧两列，并由同一个 WIP 合并表头覆盖。它保留岗位、工区、当日值、目标及坐标；相同白夜班观测由游戏归并，冲突不相加。未知岗位归属或异常数字会停止。CLI 的失败阶段和错误可交 IT，不要发送真实日报、JSON 或含内部路径的报错。

游戏内打开「导入日报」，预览并核对 TV 和 MNT。首次勾选保存双工区目标；若有 TV POL 汇总，明确填写其中分给撕 POL 的片数。MNT 只在本机基准中保存，不参与 TV。后续导入默认只更新 WIP。如需换目标，勾选「重新初始化目标」并再次确认。基准按浏览器、站点和用户配置保存，不跨设备；清理网站数据会删除。旧版只含 rows 的 JSON 仍可导入。目标缺失与真实零在任务设置中区分；已有基准后从导入列表重新初始化，不在任务设置里改基准。

## 验收

- TypeScript 和 Vite 构建通过；已有 25 项生产引擎用例和报表格式回归通过。
- Chromium + Playwright 合成 JSON：TV/MNT 同名去重隔离，期末目标写入，缺失与零区分，POL 不猜测且拆分守恒，冲突和取消无副作用，历史 JSON 正常，每日导入不覆盖，刷新保持及二次确认替换通过。
- PowerShell 选择器通过语法检查。本开发环境 CScript 启动返回 Access is denied，PowerShell 策略 Restricted，未检测到 Excel COM，未更改安全设置。VBS 尚未通过运行自测，目标列与合并表头的 VBS 端到端验证待完成。
- 公司电脑先用允许的合成表测 BAT、中文与空格路径、UNC 源/目的、取消、重名，再用真实日报。确认当前实绩左侧两列为同一 WIP 表头的目标，对比同名 TV/MNT 不同数值。将目标移到错误列应停止生成 JSON。核对原 Excel 未改，保护提示不得跳过；可用 cscript //nologo Read-RW-WIP.vbs --self-test 验证基础助手。实际 Win7、企业保护和真实 RW 文件待验收。
# rw38.3

- `Read-RW-WIP.bat` starts the read-only Excel WIP extractor. Opening WIP and target WIP use their own metric merge ranges. A merged metric is emitted from its top-left cell, with `mergeArea` coordinates in each record. Shared black glue is split once per source range.
- `cscript.exe //nologo Read-RW-WIP.vbs --merge-self-test` checks the merge logic in a temporary in-memory Excel workbook. It requires an approved Excel installation and Windows Script Host. The test neither opens a company workbook nor saves the synthetic workbook.
- To reuse the current day's plan from a V3 JSON, run `.\Join-RW-Plan.ps1 -WipPath .\rw-wip.json -PlanPath .\rw-combined-old.json -OutputPath .\rw-combined-new.json` in an approved PowerShell session. The join retains the new WIP and target data and uses only the plan from the second file. It rejects differing dates and refuses to overwrite existing files. The output is ready for one preview and confirmation in the game.
