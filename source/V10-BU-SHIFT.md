# V1.0 BU、班次、NG 与成绩演练

开发基线：`a4336df`（包含现有四路战斗及独立日报目标基准）。Excel 提取器未改动。

## 本地试玩

解压完整试玩包，在包内运行 `node services/scores/server.mjs`，再用浏览器打开 http://127.0.0.1:4195/ 。需要 Node 24（含内置 SQLite），不需要安装额外依赖。仅中央主机需要 Node；公司客户端使用浏览器。从源码运行可先执行 `npm ci`、`npm run build`。

选择 TV / MNT、白班 / 夜班与日期，选择后立即切换。布阵后输入姓名再开战，结算后自动提交摘要。「历史成绩」可按姓名、BU、班次过滤。姓名是记录标签，不是认证身份；不同场景、日期和指纹不可作同一排名。页面只能在收到服务器确认后标记保存成功。

## 业务边界

- `PlanRecord` 和 `NgRateTable` 接受标准化输入；未读计划 Excel。15 个尺寸的配置为 `ng-size-v1`。按模式、日期、班次归集各类总期望，再四舍五入；按最大余数把整数分回型号路径。诊断留期望值及差异。过判为 NDF。不同类可能重叠，游戏队列总数代表维修任务，不代表去重实体量。
- 单 BU 只建一台共享脱泡机，不模拟另一 BU 抢占。到料策略接口可替换；默认演练在 1–5 小时分批，不作为期初。切割与黑胶使用明确型号规则。MNT 的 OC VI / LCM VI 为独立队列、工位及产能，均可用本岗位人员处理 OUT。
- MNT 有一个撕POL设备工位（暂用 200 片／人／10 小时演练值），保留一台自动共享脱 POL 设备；贴 POL 后先走共享脱 POL，再按各自比例进入切割和黑胶，两项都需要时先切割。切割演练暂设一个工位。MNT 人数上限：祛除 2、BD 2、贴 POL 1、手贴膜 3、PI 3、OC VI 4、LCM VI 2；全场另受任务人员预算限制。MNT POL 演练批次先撕POL，再贴 POL。
- 仓库已有 MNT 单人产能参数：BD 115、贴 POL 80、覆膜 200、PI 300、OC VI 400、LCM VI 300、切割 260（片／人／10 小时）；OUT 300 为现有共用参数，由 VI 人员兼顾。祛除 150、贴胶 700 COF、UV 260、黑胶 200 是演练值；以上不作为已确认的正式 KPI。四套期初为合成演练输入，不复制真实快照。真实 MNT WIP / 目标与计划接入另行验收。

## 成绩服务

`POST /api/scores` 接受白名单成绩摘要；同 ID 同内容幂等，冲突 409。 `GET /api/scores?player=&bu=&shift=` 返回最近最多 200 条匹配项。默认绑定 127.0.0.1，SQLite 默认 `scores.local.sqlite`，可由 `SCORE_DB` 设置批准的数据位置。真实上线路径建议中央服务器通过 IT 批准的 HTTPS 反代和访问控制接入；配置 `SCORE_PASSWORD`（Basic 用户名 factory）、`SCORE_HOST`（反代请求 Host）、`SCORE_ORIGIN`（完整 HTTPS 站点源）。不要公开成绩服务、数据库或把凭据发到前端代码。服务校验格式和来源，不提供认证玩家或服务端防作弊判分。未部署企业端。

## 验证

- `node tests/v10-bu.cjs`：15 尺寸、清洗、边界、缺失率、班次日期、取整、四模式、检测及条件路线、单脱泡、来源和守恒。
- `node tests/v10-score-browser.mjs`：实 Chromium 四模式姓名门槛到结算，SQLite 重启保存、筛选、幂等、冲突和访问拒绝，离线状态。
- `node tests/v10-engine.cjs`、`node tests/v10-presentation.cjs`、`node tests/report-format.cjs`：原数值与动画数据回归，日报格式回归。
- TypeScript、Vite 生产构建。真实 Win7 Chrome 109、正式服务器与真实日报/计划未验收。
