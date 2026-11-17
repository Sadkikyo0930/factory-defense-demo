# 本地只读提取日报（可选备用工具）

仅在浏览器不能读取、但本机 Microsoft Excel 能合法打开日报时使用。需要 Windows、Windows PowerShell、已安装并获授权的桌面版 Microsoft Excel；无需 npm。完整 Excel COM 流程尚未在本开发环境实测。

## 三步操作

1. 解压工具到本地文件夹，双击 `Start-Extract.cmd`。
2. 选择自己有权限读取的日报，确认**日报实际日期**，选择一个新的本地 JSON 文件名。
3. 回到游戏「导入日报」选择该 JSON，核对岗位数值、异常和 POL 拆分，确认后应用。

工具不会自动运行或上传。取消对话框、无法读取、表头歧义等情况会停止。JSON 包含生产数值和原始岗位名称，应按公司数据规定保管，勿提交到公共仓库。

如果公司脚本策略阻止运行，请将工具交 IT 审核；启动器**不更改或绕过执行策略**。本开发环境策略为 Restricted，且未注册 Excel COM，因此只验证了脚本语法、纯提取函数和 JSON 链路，没有实际打开 Excel。

## 读取边界

- 先复制到本地独立临时目录，在独立 Excel 实例只读打开副本；更新外链参数为 0，不调用刷新、保存、另存、解除保护或终止进程。
- 检查原文件前后 SHA-256；文件在提取期间变化时停止输出。不能复制独占锁定文件时停止，不强制解锁。
- 优先「常规日报」，否则查找唯一的「岗位/岗位明细 → WIP情况 → 今日实绩」区域。支持合并表头和合并行；不取目标、昨日、BAL、出勤今日实绩。
- 只输出原始岗位名、对应今日值，以及识别岗位所需的 TV/MNT 分组。白夜班原始观察值交给游戏处理，不相加；数值冲突仍由游戏预览要求确认。
- 不在脚本中映射游戏工序。JSON 直接使用已有 `{date,rows:[{name,today,group?}],source}` 接口，POL 20%/80%、黑胶直接取数、贴胶 0 均由游戏同一套逻辑处理。
- 报表日期由用户确认，不从任意单元格猜日期。输出只允许新建本地 JSON，不覆盖原日报或已有 JSON。
- 关闭的只是工具自己的只读副本。若该 Excel 实例有其他工作簿/受保护视图，则不退出该实例。Excel 无法合法打开时明确报错。

Excel 窗口保持可见。工具不收集、填写或猜测密码；有权限的用户可在 Excel 自身提示中认证。出现启用宏、启用内容、退出受保护视图编辑等提示时请取消，本工具不执行这些操作。`AutomationSecurity=3` 禁用 VBA 自动宏，但微软说明它不禁用 Excel 4.0/XLM 宏，相关安全提示应取消；因此本工具不保证能提取所有受保护或带特殊内容的文件。参考：[AutomationSecurity](https://learn.microsoft.com/en-us/office/vba/api/excel.application.automationsecurity)、[Workbooks.Open 参数](https://learn.microsoft.com/en-us/office/vba/api/Excel.Workbooks.Open)。

## 可选命令行

经公司策略允许后，可在 Windows PowerShell 中运行（不用管理员权限）：

```powershell
.\Extract-DailyWip.ps1 -InputPath 'C:\Reports\日报.xlsx' -OutputPath 'C:\Reports\日报.wip.json' -ReportDate '2026-11-17'
```

仅当岗位明细跨多列且无法唯一识别名称列时，由用户核对后添加 `-JobColumn 3`（示例，列号从 1 开始，C 列为 3；不要照抄不适用的列号）。它只选择原岗位名称列，不修改岗位映射。

`Test-ExtractionHelpers.ps1` 为开发用合成数据测试，不连接 Excel，不应对生产日报使用。
