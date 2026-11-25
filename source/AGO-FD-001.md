# AGO-FD-001 candidate
授权：AI Growth Office Issue20 comments7148991806/7149006282；factory-defense-demo Issue21。
基线 main bebfdd7fb94a06df7a0f1899a1cd5d7f7a183ca4，源码在 source/；未修改根目录编译产物。
本轮由用户在既有客户端明确触发，非自动接单；Scheduled保持原暂停状态/只读范围，未扩权。

改动：
- 本机localStorage factory-v10-scores-v1保存真实结算ScoreRecord；沿用challengeId及finish的saving/saved门禁。相同ID重复保存幂等，冲突拒绝。
- 查询合并本机与可用共享库旧记录，按ID去重并保留额外字段；姓名/TV/MNT/班次筛选。原共享库不删除不迁移。离线可回看本机分项成绩。
- 损坏数据或配额拒绝时不清空数据，并提示失败。仅保存当前站点浏览器；清除站点数据会丢失，不宣称跨设备同步。
- 移除CombatView的hp/hpFrame绘制对象和更新；内部squadState生命值保留，debug的hp保持102倍原值。
- WIP评分、权重、达标、胜负、engine/spec/session/ResultsView未改。

Windows真实运行的本地检查：
- tests/ago-fd-001.cjs：8组PASS（四BU/班次、去重/冲突、重新创建仓储/筛选、旧字段/损坏数据、存储配额、共享合并、断网、无血条对象检查）。
- tests/v10-engine.cjs：28/28 PASS。
- tests/v10-bu.cjs：PASS。
- tests/v10-presentation.cjs：PASS，含5种VI布阵原数学/评分等价。
- TypeScript noEmit：PASS。
依赖仅只读复用E盘既有tv-factory/node_modules；本次不安装软件/依赖，不改全局配置。
新增存储测试使用内存Storage替身，模拟重建仓储，不能替代真实浏览器刷新/关闭重开验收。
尚未运行浏览器交互、实际完成TV/MNT结算后刷新回看、截图或视觉血条验收；不得宣称这些已经通过。建议主管对PR源码建立隔离本地预览，运行source npm run dev（默认127.0.0.1），不使用正式站验收本候选。
无已部署在线预览；没有覆盖正式站或修改构建工作流。发布工作流仅main push触发，本轮仅独立codex分支/PR。
回滚：不合并PR即可维持当前正式版本；不要清理用户成绩库。当前候选不删除任何既有存储。


## REWORK 7150287376 / 2026-11-25
共享请求及JSON响应体整体1500ms上限，AbortController停止网络，Promise.race保证即使fetch忽略abort也可结束，finally清理timer。本地9组检查PASS，包括fetch永久挂起及JSON永久挂起时save/query均<2500ms返回、abort及已保存记录可查询；TypeScript noEmit PASS。
尝试已有Playwright+Chromium1148（chromiumSandbox:true，不使用禁用沙盒参数），仅127.0.0.1:5199隔离候选；chromium.launch未返回可用页面，20秒BROWSER_TIMEOUT，未执行TV/MNT页面交互、关闭重开或截图。临时Vite已停止。UI验收仍有环境阻断，不宣称通过；本地复制的预览资源未提交。
原官方定时任务automation已按老板本聊天授权更新为AGO-FD-001每30分钟检查，官方返回及元数据读回ACTIVE，提交后继续等待主管，不暂停。旧只读/首次运行暂停规则已替换。遇有效CLOSED/BLOCKED暂停；连续两次确证双方空闲才允许暂停，正常一小时审核等待不计为空闲。
