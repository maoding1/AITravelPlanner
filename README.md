# AI Travel Planner (Web)

面向中文用户的语音驱动智能旅行规划应用。支持浏览器语音输入、AI 生成行程、预算拆分、Supabase 云端存储、高德地图展示，并提供 Docker 化部署与推送到阿里云镜像仓库的自动化流程。

---

## ✅ 功能亮点

- 🤖 **LLM 行程助手**：调用 OpenAI 兼容接口生成可执行的每日行程、预算条目与出行提示。
- 🎙️ **语音解析**：浏览器端录音自动转换为 16k PCM，通过 WebSocket 向科大讯飞 / 阿里云识别服务发起实时转写，并将识别结果交给 LLM 做意图解析，自动回填表单。
- 🗺️ **地图联动**：高德地图展示每日活动地点，方便查看路线分布。
- � **Supabase 持久化**：登录后将行程写入 Postgres，支持再次编辑与详情页回填。
- 🐳 **开箱即用部署**：提供多阶段 Dockerfile、阿里云 ACR 推送工作流、环境变量模板和一键运行脚本。

---

## 🧱 技术栈

- Frontend：Next.js 14 App Router、TypeScript、Tailwind CSS、lucide-react
- Backend：Next.js Route Handler + Supabase PostgREST + RLS（可扩展）
- AI：任意 OpenAI 兼容 LLM（支持阿里云百炼）、可插拔的语音识别服务
- Infra：Docker、GitHub Actions、阿里云容器镜像服务（ACR）

---

## ⚙️ 环境变量

将 `.env.example` 复制为 `.env.local` 并补齐。下表列出核心配置，列出的默认值为示例，请在提交前替换为真实可用的 key。

| 变量                            | 说明                                  | 示例值 / 占位符                                     |
| ------------------------------- | ------------------------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase 项目 URL                     | `https://xxx.supabase.co`                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥                     | `supabase-anon-key`                                 |
| `AI_PROVIDER_URL`               | LLM 接口根路径                        | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `AI_PROVIDER_API_KEY`           | LLM API Key（需满足 3 个月有效期）    | `请在提交前替换为真实 key`                          |
| `AI_PROVIDER_MODEL`             | LLM 模型名                            | `deepseek-chat` / `qwen-max`                          |
| `VOICE_API_URL`                 | 语音识别 WebSocket 地址               | `wss://xxx/v2/iat`                                  |
| `VOICE_API_APP_ID`              | 语音服务 AppId                        | `your-app-id`                                       |
| `VOICE_API_KEY`                 | 语音服务 ApiKey                       | `请在提交前替换为真实 key`                          |
| `VOICE_API_SECRET`              | 语音服务 ApiSecret                    | `请在提交前替换为真实 key`                          |
| `NEXT_PUBLIC_AMAP_KEY`          | 高德地图 Web JS Key                   | `amap-key`                                          |
| `NEXT_PUBLIC_SITE_URL`          | 部署站点根地址                        | `https://your-domain.com`                           |

> ⚠️ **安全提醒**：项目源码不会提交真实密钥。

---

## 🚀 本地开发

```powershell
npm install
npm run dev
```

- 访问 `http://localhost:3000`
- `/auth` 页面可完成 Supabase OAuth / 邮箱登录
- 语音录入完成后，表单字段会根据 AI 意图解析自动刷新

运行质量检查：

```powershell
npm run lint
npm run build
```

> 构建过程中如遇 `Dynamic server usage` 提示，属于 Next.js 在生成静态页面时访问 cookies 的预期行为，不影响生产部署。

---

## 🗃️ 数据库初始化

Supabase SQL 编辑器执行 `supabase/migrations/20251026000000_create_itineraries.sql` 创建 `itineraries` 表。如需启用 Row Level Security，请结合 `supabase/policies/`（可自定义）配置访问策略。

---

## 🎙️ 语音 & AI 逻辑入口

- `src/hooks/useVoiceRecorder.ts`：浏览器录音、PCM16 转码、上传 `/api/voice/transcribe`
- `src/app/api/voice/transcribe/route.ts`：调用讯飞/阿里云 WebSocket 服务（16k PCM）
- `src/app/api/voice/interpret/route.ts`：调用 LLM，将转写文本结构化为表单意图
- `src/lib/aiPlanner.ts`：根据表单参数构造 prompt，生成行程 + 预算 + 提示

若接入阿里云百炼或讯飞星火，可直接替换 `AI_PROVIDER_*` 与 `VOICE_API_*` 环境变量，无需改动业务代码。

---

## 🐳 Docker 运行

### 1. 使用已构建镜像

GitHub Actions 会将镜像推送至阿里云 ACR：

```bash
docker pull registry.cn-hangzhou.aliyuncs.com/<namespace>/<repo>:latest
docker run --rm -p 3000:3000 --env-file .env.docker registry.cn-hangzhou.aliyuncs.com/<namespace>/<repo>:latest
```

> `.env.docker` 请参考 `.env.example`，仅保留生产必需变量。

若需离线提交镜像文件，可在任意安装了 Docker 的机器上执行：

```bash
docker pull registry.cn-hangzhou.aliyuncs.com/<namespace>/<repo>:<tag>
docker save registry.cn-hangzhou.aliyuncs.com/<namespace>/<repo>:<tag> -o ai-travel-planner.tar
```

将生成的 `ai-travel-planner.tar` 附加到作业提交包中，助教可使用 `docker load -i ai-travel-planner.tar` 导入。

### 2. 本地构建镜像

```bash
docker build -t ai-travel-planner:local .
docker run --rm -p 3000:3000 --env-file .env.docker ai-travel-planner:local
```

---

## 🔁 GitHub Actions → 阿里云 ACR

工作流文件：`.github/workflows/ci-cd.yml`

1. `push` 至 `main` 或手动 `workflow_dispatch`
2. Node 20 安装依赖 -> `npm run lint` -> `npm run build`
3. 登录 ACR（`ALIYUN_REGISTRY`, `ALIYUN_USERNAME`, `ALIYUN_PASSWORD`）
4. 构建并推送镜像至 `registry/owner/repo:${GITHUB_SHA}` 与 `:latest`

必需仓库 Secrets：

- `ALIYUN_REGISTRY`
- `ALIYUN_USERNAME`
- `ALIYUN_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AI_PROVIDER_URL`
- `AI_PROVIDER_API_KEY`
- `AI_PROVIDER_MODEL`
- `VOICE_API_URL`
- `VOICE_API_APP_ID`
- `VOICE_API_KEY`
- `VOICE_API_SECRET`
- `NEXT_PUBLIC_AMAP_KEY`
- `NEXT_PUBLIC_SITE_URL`

---

## 🧪 测试与排障

- `npm run lint`：ESLint + TypeScript 检查
- `npm run build`：生产构建验证（会调用语音/AI 环境变量）
- 语音录制失败 → 检查浏览器麦克风权限或语音服务密钥是否有效
- `Failed to fetch` → 确认 Supabase、AI、语音识别服务的网络连通性与密钥有效性

---

## 🧾 评阅用密钥

根据课程要求，请在最终提交前将可用的 API Key 写入下表或附录，确保至少 3 个月有效：

| 服务           | Key                      | 生效时间     | 失效时间     |
| -------------- | ------------------------ | ------------ | ------------ |
| AI Provider    | `请在提交前填写真实 key` | `YYYY-MM-DD` | `YYYY-MM-DD` |
| Voice Provider | `请在提交前填写真实 key` | `YYYY-MM-DD` | `YYYY-MM-DD` |

建议通过阿里云百炼提供的免费额度或课堂专用账号完成填写，并在公开仓库提交后立即关注账户安全。

---

## 🗂️ Git 提交建议

- 功能点小步提交，包括：语音模块、AI 解析、Supabase 接入、UI 调整等
- PR 描述与 Commit 消息建议对齐实验报告，方便助教追踪
- 若需展示录屏，可在 Releases 附加 Demo 视频或 GIF（非必须）

---

