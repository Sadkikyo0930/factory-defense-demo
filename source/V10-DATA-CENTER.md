# V1.0 生产任务数据中心

## V3 单入口

点击「导入今日生产任务」，选择 `rw-combined-日期-时间.json`。实际 V3 导出使用根节点 `date / rows / targetBaseline / source`，并附 `productionPlan`：`kind: "rw-mdl-plan"`、`schemaVersion: 1`、`date / dateKey`、`rows`。每个计划行含 `model / sizeCode / bu / dayQty / nightQty / expectedDay / expectedNight`，其中四类预测键为 `POL / BD / NDF / FILM`。网页核验日期、BU、尺寸、班次及预测值，再按班次汇总取整。已按 V3 分好的黑胶不再次拆分。旧日报同一入口可读，确认后明确不沿用上一份计划。直接读取的是 ZIP 中的导出代码，浏览器测试使用同结构合成文件，未执行 Excel COM 或使用真实生产数据。

V3 未导出型号 OC／LCM 路线。MNT 可导入和核对计划；有实际预测批次且缺路线时，禁止用猜测路线开战。后续可在 `productionPlan.rules` 明确提供对应型号规则。构建目标为 Chrome 109，测试浏览器为本机 Chromium，未在公司旧电脑实测。

从游戏顶部进入。分别选择 RW 日报和生产计划 JSON，先看到两 BU 的预览，再确认。计划的白班／夜班分别取数；期初 WIP 只按日期使用日报整份时点存量。预计 NG 在首道工序显示，以 forecast 批次在演练到料时点进入；不代表实际 NG。FA/Disa 不入维修任务。无工区的共享黑胶按 20/80 分配，TV 四舍五入、MNT 取余量。同名不同值、共享量与已分区黑胶并存会拒绝，避免重复。

日报兼容现有 {date,rows:[{name,today,group?}],targetBaseline?:{version:1,rows:[{name,group,target}]}}。首次确认可保存双 BU 目标基准；以后默认保留已确认基准，替换需要再次确认。POL 汇总目标需明确撕 POL 的片数。目标基准保存在该浏览器；日报、计划、路线选择仅保留在当前页面。

生产计划使用独立适配协议（工作线尚未提供实际产物，以下为本分支合成验收契约；之后需对照 BAT/VBS 实际 JSON）：

```json
{
  "schema": "rw-mdl-plan",
  "version": 1,
  "records": [{"date":"20261120","rawModel":"AB238AAA1","day":2000,"night":1000,"source":"synthetic"}],
  "rules": {"AB238AAA1":{"panel":"LCM","cut":true,"polBlack":false,"filmBlack":false}}
}
```

同一日期及 BU 无有效计划行显示「未导入」。MNT 预测缺少型号 OC/LCM 时不猜测、阻止该 BU 开战，但允许在数据中心核对计划与已知的预测；补齐 rules 后重新导入。若日报只给 MNT 未分型岗位汇总，须明确选择该批的 OC／LCM 路线才能开战，已独立列出的 OC VI/LCM VI 保持各自归属。

验证：TypeScript、Vite 及 25 项生产引擎回归；Chromium 合成日报、计划预览和确认、TV/MNT 不混算、黑胶分配、MNT 切割、换班保持期初、预测单独注入及目标不覆盖。使用 `node tests/v10-data-center.mjs` 运行浏览器用例。没有真实生产计划样本用于验收，未改提取 BAT/VBS，未发布。
