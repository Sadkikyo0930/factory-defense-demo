# V0.7.1 文件格式诊断与本地 Excel 备用提取

独立分支：`fix/v071-format-diagnostics-com`；回退基线：`d11f78a557b04f2105b8a058ceeb523f1d98f6bc`。本轮不合并、不发布，不改场景、生产模型或美术。

## 修复范围

原入口只接受 ZIP/OLE 固定签名，可能拒绝扩展名为 xlsx、实际为 HTML/XML/原始 BIFF 等兼容文件。本轮依据文件头、有限 ZIP/OLE 结构诊断实际格式，不依据扩展名盲判，也未延长 15 秒解析期限。**尚未取得用户约 245 KB 的原文件，因此无法确认该文件的实际格式或宣称已修复其全部问题。**

新增分类：标准 XLSX ZIP、XLSB ZIP、待验证 ZIP、XLS OLE、原始 BIFF、加密 Office/ZIP、HTML、SpreadsheetML XML、其他 XML、JSON、未知和空文件。可识别 UTF-8 BOM、UTF-16 LE/BE、部分文本声明编码及二进制前置短 BOM/空白。已识别且可读格式进入现有 SheetJS Worker；HTML/XML 使用文本读取，标准二进制继续选择候选工作表。未知、加密、损坏格式显示诊断与备用工具建议，不尝试密码。

诊断仅含格式类别、容器、大小、扩展名、编码、规范结构标记及传输长度一致性。不打印原始字节、正文或任意 OLE/ZIP 条目名；库解码异常经过净化。原有表头定位诊断保留工作表/表头/候选列信息，不新增正文日志。失败或取消不应用模型。

本地备用工具见 [操作说明](tools/daily-report/README.md)。它只生成原始岗位/今日值 JSON，复用现有游戏映射及校验；不在 PowerShell 中重新维护业务岗位映射。

## 验证口径

`npm run test:report`、`node tests/company-model.cjs`、`npm run build` 通过，构建包含 `tsc --noEmit`，目标保持 Chrome 109。合成格式测试位于 `tests/report-format.cjs`，浏览器矩阵为 `npm run test:report-format:browser`，所有夹具均为虚构数据。

额外运行历史 `npm run test:model` 时，旧 V0.4 测试的“BD 不可支援 POL”断言失败。当前已确认规则允许任意员工支援，因此旧断言与基线行为冲突；本轮未修改模型或删除旧断言。现行 `company-model.cjs` 对固定 MNT 300、任意支援、共享脱泡机和撕 POL 附加位置的检查通过。生产构建仍有既有大 chunk 提示，本轮未调整打包架构。

- XLSX、XLSB、OLE XLS、原始 BIFF8、HTML、XML、UTF-16 HTML、UTF-16BE XML、BOM+ZIP：验证今日列正确、总数 311、FA 61、TV 250、黑胶 43、贴胶 0。
- 加密标记夹具（非真实加密 Office）、BIFF FILEPASS、未知和截断 ZIP：应拒绝；未知正文标记不出现在诊断中。
- PowerShell 纯函数模拟合并表头/白夜班行，生成真实 UTF-8 JSON，再通过现有 Worker 和浏览器预览/确认；POL 6 → 撕 1 + 贴 5。重复导入、失败数据保护沿用既有测试。
- Playwright Chromium 131 真实页面验证格式矩阵、JSON 应用、场景及既有导入和生产操作；额外验证 WebGL/Canvas 降级、窗口尺寸、全屏、平移/缩放、缺图提示与 15 秒超时重试。正常测试无控制台报错或资源失败；故意模拟的缺图和 Worker 停顿按预期显示错误。浏览器结果与截图另附。Browser 插件不可用，使用本地 Playwright。

PowerShell 5.1 语法解析及白名单纯函数测试通过；当前执行策略 Restricted，`.ps1 -File` 被系统策略阻止，未绕过策略。Excel COM 未注册，**完整脚本、Excel 密码/权限提示、真实帆软文件、公司 Win7/Chrome109 均未实测**。源码尽量兼容 Windows PowerShell 2，旧版机器仍需验证。真实文件安全诊断出来后才能判断其下一步处理方式。

## 主要修改文件

`src/reportFormat.ts`、`report.worker.ts`、`reportClient.ts`、`reportStages.ts`、`reportUI.ts`；`tools/daily-report/*`；`tests/report-format.cjs`、`tests/v071-report.cjs`、合成夹具；`package.json`、README 及本记录。没有新增依赖，没有修改生产模型。
