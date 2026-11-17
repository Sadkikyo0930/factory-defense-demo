# 当前版本 V0.7.1 本地候选

公司电脑渲染降级、导入性能及分阶段诊断见 [V071.md](V071.md)。尚未在公司 Win7/Chrome109 或真实帆软文件验收，本轮未合并或发布；下列历史说明保留。

# 当前版本 V0.7

本地帆软日报 XLSX/XLS/JSON 导入、初始WIP口径及本轮验证见 [V07.md](V07.md)。测试夹具并非实际公司文件。以下历史说明保留。

# 当前版本 V0.6

最新支援类别、手撕待确认产能、临时动画和测试说明见 [V06.md](V06.md)。以下保留历史运行说明。

﻿# 工厂攻防战 V0.4

现有 Phaser 3 + TypeScript + Vite 工程的升级版。上一基线 e27ef6173a76d4f53774589c18fc8810c0f74f62 保留在 feature/v03-workshop，本轮在 feature/v04-factory。

运行：`npm ci` → `npm run build` → `npm run preview`，访问终端给出的本机地址（通常 http://127.0.0.1:4173/）。

测试：`npm run test:model`；先启动生产预览，再安装 Playwright Chromium 并运行 `npm run test:browser`。已有 Chromium 可通过环境变量 PLAYWRIGHT_CHROMIUM_EXECUTABLE 指定。输出在 artifacts/，不提交依赖和测试产物。

玩法：岗位卡可重复点击/拖动部署；点员工再点同资格空工位调动；右键平移、滚轮缩放。班次设置中配置 VI 人工岗数、平均 COF、演示成功率及生产计划。评价优先比较计划达成，再比较人力和未利用工时。

详细设备数量、模型口径、测试记录、美术过渡资源与未完成事项见 [V04.md](V04.md)。全部演练参数不是正式产能承诺；切割数量待确认时不创建设备，相关需求会停在待确认状态。Chrome109为构建目标，Win7/Chrome109未真机验证。

历史记录：ART-INTEGRATION.md、ASSET-AUDIT.txt、V02.md、V03.md 均保留；旧测试对应旧地图坐标。
