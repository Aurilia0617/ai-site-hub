# SiteHub

公益站聚合管理工具 — 管理签到站、福利站的站点信息，支持站长 CRUD、批量导入导出。

## 技术栈

- **后端**: Express.js + JSON 文件存储（原子写入）
- **前端**: React + Vite + Tailwind CSS v4 + TanStack Query
- **部署**: Docker Compose / Zeabur

## 本地运行

```bash
docker compose up --build -d
```

访问 http://localhost:3000，本地模式下无需密码。

## 部署到 Zeabur

### 1. 创建项目

登录 [Zeabur](https://dash.zeabur.com)，创建新项目，选择区域。

### 2. 添加服务

点击 `Add Service` → `Git` → 选择本仓库。Zeabur 会自动识别根目录的 Dockerfile，构建为单个服务。

### 3. 配置服务

- **Storage**: 挂载持久化卷，路径 `/app/data`（保存站点数据）
- **Networking**: 绑定域名（使用 Zeabur 提供的 `.zeabur.app` 域名或自定义域名），端口 `8080`
- **Variables**:
  - `ACCESS_PASSWORD` = `你的访问密码`（可选，设置后需输入密码才能访问）

### 4. 访问

通过绑定的域名直接访问，前端和后端 API 由同一服务提供。

## 访问控制

通过环境变量 `ACCESS_PASSWORD` 控制：

| 环境 | ACCESS_PASSWORD | 行为 |
|------|----------------|------|
| 本地 Docker Compose | 未设置 | 无需密码，直接访问 |
| Zeabur | 设置密码值 | 显示密码输入界面，验证后访问 |

## 功能

- 站点 CRUD（名称、网址、站长信息）
- 签到站 / 福利站标记（可点击跳转）
- 搜索与标签筛选
- 批量导入 / 导出（JSON）
