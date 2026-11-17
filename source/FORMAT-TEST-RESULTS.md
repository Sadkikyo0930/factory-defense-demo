# 本轮测试记录（2026-11-17）

环境：Windows、Node 24.22.1、TypeScript 5.6.3、Vite 6.4.3、Playwright Chromium 131、本地生产预览 4174。基线 `d11f78a557b04f2105b8a058ceeb523f1d98f6bc`。

| 项目 | 结果 |
| --- | --- |
| `npm run test:report` | 通过：模型 WIP、合并表头、选择工作表、9 种格式/编码夹具、JSON 映射、加密标记/未知/损坏拒绝 |
| `node tests/company-model.cjs` | 通过：MNT 固定 300、任意岗位支援、独立共享脱泡机、撕 POL 加人位置 |
| `npm run build` | 通过：`tsc --noEmit` 与 Vite 生产构建；保留既有大 chunk 警告 |
| `npm run test:report-format:browser` | 通过：9 个文件经真实 File API/Worker；PowerShell 纯函数产生的 JSON 预览/应用；TV 250、FA 61；失败后不覆盖；无非 GET 请求 |
| 原有 V0.7 浏览器回归 | 通过：深层表头 XLS/XLSX、JSON、POL 比例调整、重复替换、取消/冲突保护、手动 WIP、卡片部署/占用保护、开始/暂停/加速/重置 |
| `tests/v071-browser.cjs` | 通过：WebGL/Canvas 降级、全屏/窗口/镜头、故意缺图诊断、15 秒模拟停顿/重试 |
| PowerShell 语法与纯函数 | 通过：AST 0 错误；白名单纯函数模拟合并行、WIP 范围、UTF-8 无 BOM JSON、拒绝覆盖；未调用 Excel |
| 历史 `npm run test:model` | 失败：旧 V0.4 断言仍禁止 BD 支援 POL，与当前已确认的任意员工支援规则不一致。保留该结果和原测试，未改生产模型 |
| 完整 PowerShell + Excel COM | **未验证**：本机未注册 Excel COM，执行策略 Restricted 阻止脚本文件；未绕过策略 |
| 用户真实约 245 KB 日报 | **未验证**：未提供该文件，不能确定它的真实格式 |
| Win7 / Chrome 109 真机 | **未验证**：构建目标保持 `chrome109`，浏览器测试使用 Chromium 131 |

正常页面测试控制台错误和资源失败均为 0。缺图与 Worker 停顿为故意注入的错误测试，不计作正常运行成功。合成加密夹具仅包含加密容器标记，不代表真实加密工作簿提取验收。

原场景、生产模型、工艺规则、美术文件未修改。本轮仅独立分支提交，未合并、未上传或部署。浏览器 JSON 结果和真实截图见随附 evidence 包。
