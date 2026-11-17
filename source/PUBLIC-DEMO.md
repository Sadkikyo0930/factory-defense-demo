# 更新：GitHub Pages 已发布成功

入口：https://sadkikyo0930.github.io/factory-defense-demo/
发布提交：f4028c9c7d9b65577e0bcd5b548c40bc4183aa3c；程序源码：db020eaabbb13b33f63e86223c673eb6b769cb7f。用户桌面夸克实际打开成功，远程资源浏览器验证通过。独立Chromium的本机网络重置通过Node标准TLS传输复测；Chrome109未真机实测。以下保留此前阻塞记录，当前已通过独立GitHub仓库解决。

# 独立公开试玩部署尝试与员工撤下

基线b9a890c97830bc59138260fad60d41014af24e8f，分支release/public-demo-with-withdraw。其他正式项目未写入。

## 已完成
设备/员工详情新增“撤下此员工”，可单独撤下（包括移动中），释放工位，保留原工位在制任务及进度，其他排布不受影响。历史员工工时保留，已产生工时的撤下员工仍计入方案投入人数，避免通过班次末撤人虚减人力；顶部人数为当前部署人数。新部署使用新ID，不重复身份。
TypeScript和Vite生产构建通过；撤下模型不变量、V0.6模型回归通过；真实Chromium131操作1→0→1通过。根路径和/factory-defense-demo/子目录路径下资源404为0，pageerror为0。Vite base保持./，DOM图片及Phaser资源使用相对URL，已验证子目录。
构建目标chrome109；本次源代码未发现toSorted/toReversed/findLast/Promise.withResolvers等新运行时依赖，新增功能只用既有ES2018能力。Win7/Chrome109没有真机实测，不能宣称通过；实际浏览器131。

## 部署状态：未发布，无已验证公网试玩URL
GitHub连接器列出的仓库只有赛车/学习工作台，没有工厂测试仓库；没有create_repository或Pages配置操作，gh CLI未安装且无GitHub令牌环境变量。没有改动这些已有仓库。浏览器github.com/new入口超时。
备用使用Sites新建独立项目appgprj_6afba97739548191bafbace9567df480并设public；版本仍为0，尚无live URL。授权创建的新站不代表构建已上传或已发布。
Sites源码同步helper先遇到Windows schannel SEC_E_NO_CREDENTIALS；改用保持TLS校验的OpenSSL后连接被reset，Node访问同一git.chatgpt-team.site域名亦ECONNRESET。系统未配置代理。额外网络权限请求返回network:null，没有获得连接权限，停止同步，未关闭TLS校验、未假造部署成功。没有保存凭据到项目或Git。
要完成公网发布，需要能够创建独立GitHub仓库并启用Pages的授权入口，或本机可访问Sites源码托管域名。无需用户手动上传大量文件。

交付构建和源代码提交已保留；.openai/hosting.json记录唯一Sites项目ID，可在网络恢复后复用，不要重复创建站点。

