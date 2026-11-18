# 网页导入回归结果

2026-11-18，本地独立分支；没有发布。

- TypeScript `tsc --noEmit`：通过。
- Vite 生产构建：通过，target=chrome109。现有主包体积警告保留。
- `tests/report-format.cjs`：标准 XLSX、XLS OLE、原始 BIFF、XLSB、HTML、SpreadsheetML、UTF16 和前置 BOM 的合成文件通过；加密标记/未知/截断文件拒绝。新增扩展名误导、16 字节 HEX 限制、错误消息隐私回归通过。
- `tests/report-headers.cjs`、`tests/v071-report.cjs`、`tests/v07-model.cjs`：合并表头、岗位明细、今日实绩归属、白夜班、WIP 守恒等通过。
- `tests/company-model.cjs`、`tests/staffed-dispatch.cjs`、`tests/v05-model.cjs`：通过，其中人工派工覆盖 18 项场景。
- `tests/report-format-browser.cjs`：9 种格式/编码路径、JSON 确认、加密拒绝、unknown 隐私和失败保留通过。
- `tests/report-local-browser.cjs`：标准 XLSX/XLS 真实浏览器确认导入，期初 TV=250、FA共享=61，重复替换不累加；诊断只包含受限 HEX/格式/阶段；未知文件失败保留数据；无控制台错误、404 或非 GET 请求。
- `tests/staffed-browser.cjs`：真实拖拽、VI2/VI4、待命、停用、跨岗位、导入保护通过。

浏览器：Chromium 131.0.6778.33，1600×1000；本地生产构建入口 http://127.0.0.1:4186/ 。Browser 插件未提供，使用 Playwright。

新增浏览器测试首次遗漏项目的 `?qa` 测试钩子入口，等待测试钩子超时；已修正入口并通过，不涉及产品功能修补。

所有数据为合成测试夹具；真实帆软故障文件未提供，因此不能认定公司 unknown 问题已复现或通过验收。Win7/Chrome109 和公司设备未实测。未运行 COM 工具。

修改文件：src/reportFormat.ts、src/report.worker.ts、src/reportUI.ts、tests/report-format.cjs、tests/report-local-browser.cjs，以及本说明和 BROWSER-REPORT-IMPORT.md。未修改场景、美术、生产模型或 WIP 映射。
