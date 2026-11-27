# 卫戍协议：规程 LITE

《明日方舟》「卫戍协议」玩法的**独立克隆运行版**：不依赖原站，本仓库自带服务端与前端，克隆下来配一份素材包就能自己开服、自己玩、局域网联机。

- 线上站点：https://stronghold-336344-11-1316112015.sh.run.tcloudbase.com
- 素材服务：https://stronghold-assets-336344-11-1316112015.sh.run.tcloudbase.com
- 版本：**0.4.0-lite**

> 本项目是玩家自制的非官方同人作品，与鹰角网络、Yostar 无任何关系，未获授权。游戏名称、角色、美术、音频、文本与数据版权归原权利人所有，**不适用**本仓库的 GPL-3.0；GPL 仅覆盖本项目自己写的代码。仅供学习交流，禁止任何形式盈利。

## 快速开始（本地运行）

前提：Node.js 22 或 24。

```bash
git clone https://github.com/Failpen/stronghold-protocol-lite.git
cd stronghold-protocol-lite

# 1. 放素材：把资源包解压到 public/ 下，得到 public/assets/（见 Releases 里的 stronghold-lite-assets.zip）
# 2. 装依赖
npm install
# 3. 起服
npm start
```

浏览器打开 `http://localhost:3000`。仓库本身**不含**美术与音频素材（体积太大），只带数据表，必须先放资源包，否则模型和立绘会空。

不需要设置任何素材服务地址：不配置 `SP_ASSETS_ORIGIN` 时，服务直接从本地 `public/assets` 读文件。

## 资源包

在 [Releases](../../releases/latest) 下载 `stronghold-lite-assets.zip`，解压后目录结构为 `public/assets/...`。

```bash
unzip stronghold-lite-assets.zip -d public/
```

包里是当前线上实例正在用的那套素材：干员头像、干员立绘（alter/异格 138 张）、敌人模型、敌人 spine（978 个）、UI、字体、技能图标。

**不含**：语音与 BGM 等全部音频，以及普通干员的 spine（约 520MB）。所以本地跑起来是静音的，普通干员的卡面用头像兜底显示。需要完整素材可自行从镜像补齐到 `public/assets/`，目录结构与包内一致，无需改代码。

## 局域网联机

服务端只管经济与回合，战斗在各玩家浏览器里模拟，所以一台机器就能带一桌人。

1. 主机运行 `npm start`，确认监听 `0.0.0.0:3000`（默认就是）。
2. 查主机内网地址：`ip addr`（Linux/macOS）或 `ipconfig`（Windows），形如 `192.168.1.23`。
3. 同一 Wi-Fi / 同一交换机的其他设备访问 `http://192.168.1.23:3000`。
4. 在大厅建「同盟」房间，把房间号发给队友；1–4 人合作，空位可以补 AI。

跨网段或外网访问需要自己做端口映射或内网穿透，仓库不内置公网联机方案。

## 部署到自己的服务器

```bash
docker build -t stronghold-lite .
docker run -p 3000:3000 -v $PWD/public/assets:/app/public/assets stronghold-lite
```

也可以直接 `npm start` 挂在 systemd / pm2 后面。素材目录挂载进去即可，不必打进镜像。

## 引用资源

本实例运行依赖以下外部资源与资料，均为原权利人或社区公开内容：

- 原始工程（玩法逻辑与数据的来源）：https://github.com/Failpen/stronghold-protocol-lite 的上游项目 `sganggs/Stronghold-Protocol`
- 游戏数据与文案：PRTS 卫戍协议词条、官方客户端数据表
- 素材来源：官方客户端资源（美术、音频、字体），仅作本实例运行所需，不再分发到本项目以外
- 本项目线上实例与素材服务：见上方两条链接

素材版权不随代码授权，请勿将从本仓库或其 Releases 取得的素材用于其他项目或单独再分发。

## 许可证

代码：GPL-3.0-or-later。素材：版权归原权利人，不适用 GPL。完整声明见 [NOTICE.md](NOTICE.md)。
