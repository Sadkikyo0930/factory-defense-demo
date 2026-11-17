# 工厂攻防战 V0.7.1 · 人员到岗派工版

试玩：https://sadkikyo0930.github.io/factory-defense-demo/

Phaser 3 + TypeScript + Vite，沿用现有独立试玩站。源码在 `source/`，本地源提交 `5199d9fbe4144ffd0a7bfe4fefadd7286bb6f446`。

本轮加入公共 WIP、人员到岗/设备可用检查、公平轮转派工、调岗保留在制进度、待命人员回派及手动停用/恢复。保留全部现有美术、动画、日报格式诊断、标准及兼容 Excel 导入、Windows Excel COM 只读 JSON 提取备用工具。VI 四位由实际部署人员决定能力；共享脱泡机仍唯一，机器/额外手撕共用队列。

详细修改和测试范围见 [source/STAFFED-DISPATCH.md](source/STAFFED-DISPATCH.md)，只读提取工具说明见 [source/tools/daily-report/README.md](source/tools/daily-report/README.md)。源码中的“未发布”说明记录的是当地开发阶段，本次发布状态以仓库部署记录为准。

FA 人数/节拍和额外手撕产能仍有演练/待确认项。真实公司电脑、Win7/Chrome109、真实帆软文件及完整 Excel COM 提取未验收；自动化使用合成数据。日报只在浏览器本机解析，不上传。

回退标签与备份分支：`backup/v071-before-staffed-20261118` → `9503da474b7c37ecf9b964860daf37c784f9e73a`。需要回退时对本次合并执行 `git revert -m 1 <merge-commit>`，正常推送，保留历史；不强推。

构建：`cd source && npm ci && npm run test:production && npm run test:report && npm run build`。发布继续采用 main 根目录的现有 Pages 流程。
