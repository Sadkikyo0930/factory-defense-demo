# AGO-FD-001 scheduled REWORK 7151575659
本次官方自然调度上下文：automation / 2026-11-25T03:11:31.781Z（台北11:11:31）。平台未提供独立run ID，不自行生成。
读取两Issue和PR22后，Issue20最新7151575659明确撤销7151527870的终止BLOCKED；因此继续同一工单，未按被替代的BLOCKED停用。代码head ec192cbb05cc095b8588669913d2bd8facef3e21；未重复修改WIP或评分。

## 实际新增证据
- 复用已有Vite6.4.3和依赖，隔离candidate.html生产构建成功：36模块、输出JS/CSS/HTML及public资源；无安装。
- 68个public资源逐一计算Git blob SHA1，全部匹配上述PR源码树，mismatch=[]。
- Node只绑定127.0.0.1:5199，本地GET candidate.html?qa为HTTP200且含实际编译assets/candidate入口。
- 编译告警：Phaser chunk约1.47MB，超500kB建议值；不是构建失败。
- Windows常见Edge/Chrome路径及App Paths未发现可用浏览器；检查现有360/Tencent/Microsoft目录未发现browser.exe。
- 不重复Chromium1148失败路径，改尝试已有WebKit2104/Playwright.exe，20秒WEBKIT_TIMEOUT，未取得可用页面。仅停止本轮自有测试进程；未安装、扩权或使用禁用沙盒参数。
- UI验收仍未通过：TV/MNT真实结算、历史查询、刷新/关闭重开、同班次不重复、旧记录兼容及战斗截图均无新增实机成功证据。不把编译/HTTP200当渲染成功。

## 隔离候选交付
本地 E:\塔防\2026-11-23\habblaud-ai-v1-d-e-windows\outputs\AGO-FD-001-ec192cbb-candidate.zip
SHA256 852C8C3B1812F8CE5A5707733887FEB7182A98EC82009089B08A919A492BD7CC
包含编译游戏、全部匹配资源、serve.cjs、Open-Candidate.cmd（ASCII；调用既有D盘Node）。不覆盖正式站，不正式部署，不修改生产目录。
使用：解压至新E盘目录，双击Open-Candidate.cmd，在已有支持Chrome109+的浏览器打开打印的127.0.0.1:5199/candidate.html?qa，Ctrl+C停止。该端口固定loopback；当前试玩测试服务交付后停止，未装服务/自启。
包仅本地可用，不把本机路径当主管远程可访问URL；没有上传GitHub Release/构建产物或公网部署。
下一步主管审阅本候选交付及剩余UI证据缺项；原Scheduled保持ACTIVE等待正常审核，未暂停、未重复接单。
