# QQ Farm Bot

一个面向 QQ 农场的多账号自动化管理工具，提供 Web 管理面板、实时状态与日志、农场和好友任务自动化，以及商城、宠物、图鉴、活动等辅助功能。

> 本项目仅供学习与技术交流。使用自动化工具可能违反相关平台规则，并可能导致账号受限；请自行评估风险并妥善保管账号凭据。

## 功能特性

- **多账号管理**：每个账号运行在独立 Worker 中，可单独启动、停止和配置
- **账号接入**：支持手动填写登录 Code / 官方 WebSocket URL，以及微信扫码登录
- **农场自动化**：自动收获、种植、出售、施肥、清理与土地升级
- **种植策略**：支持经验、收益、化肥收益、背包优先和任务优先等策略
- **好友互动**：自动偷菜、帮忙、处理好友申请、好友黑名单与免打扰时段
- **任务与奖励**：支持日常任务、免费礼包、分享奖励、邮箱奖励等自动领取
- **扩展模块**：商城、神秘商人、宠物、图鉴、职业和限时活动管理
- **实时面板**：展示账号状态、资产、背包、农场、运行日志与统计分析
- **资源自适应**：低配置设备自动启用低内存策略，也可通过环境变量手动限制资源
- **数据持久化**：账号、设置、日志和统计数据统一保存到数据目录

## 技术栈

- 后端：Node.js、Express、Socket.IO、Worker Threads、Protobuf
- 前端：Vue 3、TypeScript、Vite、Pinia、Vue Router、UnoCSS
- 部署：Docker Compose / pnpm workspace

## 快速开始

### Docker Compose（推荐）

需要预先安装 Docker 与 Docker Compose。

```bash
git clone https://github.com/XooUooX/QQ-Farm-Bot.git
cd QQ-Farm-Bot
cp .env.compose.example .env
```

编辑 `.env`，至少修改管理员密码：

```dotenv
ADMIN_PORT=3007
ADMIN_USERNAME=admin
ADMIN_PASSWORD=请替换为强密码
```

启动服务：

```bash
docker compose up -d --build
```

打开 `http://localhost:3007`，使用 `.env` 中配置的管理员账号登录。

常用命令：

```bash
# 查看运行状态
docker compose ps

# 查看实时日志
docker compose logs -f

# 停止服务
docker compose down

# 更新后重新构建
git pull
docker compose up -d --build
```

Compose 默认将数据保存到项目上级目录的 `data/`。升级或重建容器不会删除该目录；请定期备份。

### 从源码运行

环境要求：

- Node.js 20 或更高版本
- pnpm 10（项目声明版本为 `10.30.2`）

```bash
git clone https://github.com/XooUooX/QQ-Farm-Bot.git
cd QQ-Farm-Bot
corepack enable
pnpm install
pnpm build:web
pnpm dev:core
```

服务启动后访问 `http://localhost:3007`。源码模式的数据默认保存在 `core/data/`。

如需前端热更新，可分别启动后端和 Vite 开发服务器：

```bash
# 终端 1
pnpm dev:core

# 终端 2
pnpm dev:web
```

Vite 会将 `/api`、`/socket.io` 和 `/game-config` 代理到 `http://localhost:3007`。

## 首次使用

1. 打开管理面板并登录。
2. 进入“设置 → 账号管理”，添加 QQ 或微信农场账号。
3. 为账号配置自动种植、好友互动、任务、化肥和活动等功能。
4. 启动账号，在“概览”中查看连接状态与实时日志。
5. 首次部署请立即在系统设置中修改默认管理员账号和密码。

如果没有通过环境变量配置管理员信息，默认登录凭据为 `admin / admin`。不要将默认凭据暴露在公网环境中。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `ADMIN_PORT` | `3007` | Web 管理面板与 API 端口 |
| `ADMIN_USERNAME` | `admin` | 初始管理员账号 |
| `ADMIN_PASSWORD` | `admin` | 初始管理员密码，生产环境务必修改 |
| `FARM_DATA_DIR` | `core/data` | 数据持久化目录 |
| `FARM_LOG_DIR` | 数据目录下的日志目录 | 自定义日志目录 |
| `LOG_LEVEL` | `info` | 日志级别 |
| `FARM_LOW_MEMORY_MODE` | 自动判断 | 是否强制启用低内存模式 |
| `FARM_MAX_RUNNING_ACCOUNTS` | `0` | 最大同时运行账号数，`0` 表示不限制 |
| `FARM_WORKER_START_CONCURRENCY` | 自动判断 | Worker 启动并发数 |
| `FARM_WORKER_START_DELAY_MS` | 自动判断 | Worker 启动间隔（毫秒） |
| `FARM_MAX_RSS_MB` | 自动判断 | 进程 RSS 内存上限，`0` 表示不限制 |
| `FARM_GLOBAL_TASK_CONCURRENCY` | 自动判断 | 全局任务并发数，`0` 表示不限制 |
| `FARM_TSDK_ACE_ENABLED` | `true` | 是否启用 TSDK ACE 运行时 |

大多数用户只需要配置前三项。账号策略、通知与游戏连接参数可在管理面板中维护。

## 项目结构

```text
QQ-Farm-Bot/
├── core/                  # Node.js 后端、Worker、协议与游戏服务
│   ├── src/controllers/   # 管理面板 API
│   ├── src/runtime/       # 多账号运行时与资源策略
│   ├── src/services/      # 农场、好友、商城、活动等服务
│   ├── src/proto/         # Protobuf 协议定义
│   └── test/              # 后端测试
├── web/                   # Vue 3 管理面板
│   ├── src/components/    # 页面组件
│   ├── src/stores/        # Pinia 状态管理
│   └── src/views/         # 功能页面
├── docs/                  # 文档与图片资源
├── docker-compose.yml     # Compose 部署配置
└── pnpm-workspace.yaml    # pnpm 工作区配置
```

## 开发命令

```bash
pnpm dev:core        # 启动后端
pnpm dev:web         # 启动前端开发服务器
pnpm build:web       # 构建管理面板
pnpm lint            # 检查并修复代码风格
pnpm -C core test    # 运行后端测试
```

## 安全建议

- 首次登录后立即更换默认管理员密码。
- 不要提交 `.env`、`core/data/`、日志或任何登录 Code。
- 公网部署时建议通过 HTTPS 反向代理访问，并限制管理面板来源 IP。
- 定期备份数据目录；排障时分享日志前先移除账号、Token 和连接地址。
- 新功能建议先使用非主要账号验证，再逐步启用自动化选项。

## 常见问题

### 页面可以打开，但账号无法连接

检查登录 Code 是否过期、平台类型是否正确，并查看“概览”中的运行日志。必要时重新获取 Code 或使用扫码登录。

### 修改代码后页面没有变化

生产模式需要重新构建前端并重启服务：

```bash
pnpm build:web
pnpm dev:core
```

Docker 部署请执行：

```bash
docker compose up -d --build
```

### 容器重建后数据丢失

确认 `docker-compose.yml` 中的数据卷仍映射到宿主机目录，并且没有删除宿主机的 `data/` 目录。

## 参与贡献

欢迎提交 Issue 和 Pull Request。提交前请运行：

```bash
pnpm lint
pnpm build:web
pnpm -C core test
```

## 免责声明

本项目与腾讯、QQ 农场及其关联公司无关，也未获得其官方授权。项目作者与贡献者不对使用本项目产生的账号风险、数据损失或其他后果承担责任。
