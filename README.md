# Web 开发课程项目

这是一个用于 Web 全栈开发课程的 npm workspaces 单仓库。项目以一个最小的课程目录应用为例，串起 Next.js、Tailwind CSS、Midway.js、SQLite、OpenAPI、自动化测试和容器化部署。

## 技术栈

- 前端：Next.js 16、React 19、TypeScript、Tailwind CSS 4
- 后端：Midway.js 4、Koa、TypeScript
- 数据库：Node.js 内置 SQLite
- 工程化：npm workspaces、Prettier、ESLint、Playwright、GitHub Actions、Docker Compose

## 快速开始

环境要求：Node.js 24.14.1 及以上、npm 11 及以上。

```bash
npm install
cp .env.example .env
npm run dev
```

启动后访问：

- Web 页面：http://localhost:3000
- 后端健康检查：http://localhost:7001/api/health
- API 契约：`contracts/openapi.yaml`

前端通过同源 `/api/*` 路径代理后端，因此浏览器端不需要额外配置 CORS。

## 常用命令

```bash
npm run dev           # 同时启动前端与后端
npm run build         # 构建全部工作区
npm run build:image   # 使用 Docker Buildx 构建 X64 应用镜像
npm run test          # 运行全部测试
npm run test:e2e      # 启动前后端并运行 Playwright 端到端测试
npm run lint          # 运行静态检查
npm run typecheck     # 检查全部工作区的 TypeScript 类型
npm run format        # 格式化代码与文档
npm run format:check  # 检查代码与文档格式，不写入文件
npm run check         # 执行格式、lint、类型、测试和构建检查
npm run check:env     # 检查本地 Node/npm 环境
```

首次运行端到端测试前，需要安装 Chromium：

```bash
npx playwright install chromium
```

也可以只操作一个工作区：

```bash
npm run dev --workspace frontend
npm run dev --workspace backend
```

格式化命令统一从仓库根目录运行，不在各工作区重复定义。根级 `lint`、`typecheck`、`test` 和 `build` 会严格遍历两个工作区；任一工作区缺少对应脚本都会使命令失败。

## 容器化运行

前端和后端会构建到同一个镜像，并在同一个应用容器中运行。Compose 只对外发布前端端口；浏览器和其他客户端通过同源 `/api/*` 路径访问后端。

### 使用 Buildx 打包镜像

需要 Docker 已启用 Buildx（Docker Desktop 默认包含）。以下命令默认构建 `linux/amd64`（X64）镜像，并以 `course-demo:latest` 加载到本地 Docker：

```bash
npm run build:image
```

可将脚本参数放在 npm 的 `--` 之后。构建 ARM64 镜像：

```bash
npm run build:image -- --platform linux/arm64 --tag course-demo:arm64
```

同时构建 X64 和 ARM64 并推送多架构镜像（请替换为可写入的镜像仓库地址并提前登录）：

```bash
npm run build:image -- \
  --platform linux/amd64,linux/arm64 \
  --tag registry.example.com/course-demo:latest \
  --push
```

Buildx 不能把多架构结果同时加载到本地 Docker，因此多架构构建需要使用 `--push`；只验证构建且不导出镜像时可改用 `--no-load`。运行 `npm run build:image -- --help` 可查看全部参数。

### 使用 Compose 运行

```bash
docker compose -f infra/compose.yaml up --build
```

Compose 默认使用 `course-demo:latest`。发布时建议使用明确版本号，并确保这里的 `IMAGE_TAG` 与 Buildx 构建或 `docker load` 加载的镜像标签一致：

```bash
# 构建并以 1.0.0 作为镜像版本
IMAGE_TAG=1.0.0 docker compose -f infra/compose.yaml up --build

# 服务端已经加载 course-demo:1.0.0 时，直接启动而不重新构建
IMAGE_TAG=1.0.0 docker compose -f infra/compose.yaml up -d --no-build
```

启动后访问 http://localhost:3000。SQLite 数据保存在 Compose 管理的 `course-data` 数据卷中，重建应用容器不会删除已有课程数据。

## 目录说明

```text
.
├── frontend/          # Next.js 用户界面
├── backend/           # Midway.js API 与 SQLite 数据访问
├── specs/             # 需求与验收标准
├── contracts/         # OpenAPI 等跨端契约
├── docs/              # 架构及课程资料
├── scripts/           # 本地开发脚本
├── infra/             # Docker 等部署配置
├── .github/           # CI 工作流
└── .cursor/           # 编辑器项目规则
```

建议从 [课程指南](docs/course-guide.md) 开始，再阅读 [系统架构](docs/architecture.md)、[模板结构审查](docs/architecture-review.md) 和第一个 [功能规格](specs/001-course-catalog.md)。开始功能开发前先阅读 [Spec 编写规范](specs/README.md)；涉及 HTTP 时同时阅读 [Contract 编写规范](contracts/README.md)。

## 环境变量

默认值足以完成本地开发。需要覆盖时，将 `.env.example` 复制为 `.env` 并在启动命令所在的终端加载它：

```bash
set -a && source .env && set +a
npm run dev
```

不要提交 `.env`、数据库文件或密钥。
