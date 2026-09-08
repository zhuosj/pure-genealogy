# pure-genealogy Docker 运行说明

本文档对应两种"本地化/自部署"目标,请按需选择:

| 方式 | 数据库在哪 | 改代码? | 适合 |
|---|---|---|---|
| 一:应用容器化 | 继续用 Supabase(云端或你已有项目) | 无 | 只想把 Next.js 应用跑在自己服务器/本机 Docker |
| 二:Supabase 整套自托管 | 本机 Docker 或云主机(Postgres+Auth+Storage+Realtime) | 无 | 不想用 Supabase 云、数据完全自持,但保持架构不变 |
| (三:彻底去 Supabase) | 任意自建 PostgreSQL/MySQL | 需要重构数据访问+鉴权 | 长期路线,见文末说明 |

## 方式一:应用容器 + 已有 Supabase 项目(推荐先跑)

```bash
cd pure-genealogy
cp .env.example .env        # 或 .env.local
# 编辑 .env,填入:
#   NEXT_PUBLIC_SUPABASE_URL=你的项目 https://xxxx.supabase.co
#   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的 key(Supabase 项目 Settings > API)
#   NEXT_PUBLIC_FAMILY_SURNAME=你的姓氏
docker compose up -d --build
# 打开 http://localhost:3000
```

- `NEXT_PUBLIC_*` 属构建期变量:改了 `.env` 要 `docker compose build` 重新构建再起。
- 登录账号需先在 Supabase Auth 里启用 Email/密码登录,再在库里手动建账号,或用项目自带注册页。

> 注:本项目已去除 `next/font/google` 联网拉取字体(改为系统字体栈:Noto Serif SC / 思源宋体 / 宋体-简 / SimSun 等),因此**构建与运行都不依赖 Google 服务**,国内 CI/云主机可离线构建。

## 方式二:Supabase 整套自托管(数据也放自己机器/云主机)

数据库格式与云端 Supabase 100% 一致(Schema 就是标准 PostgreSQL,见 `.github/family_members.sql`),所以**应用代码一行都不用改**,只需让应用指向自托管的 Supabase 地址:

1. 在目标机器装好 Docker,然后任选:
   - 官方自托管仓库:https://github.com/supabase/supabase(仓库根目录自带 `docker-compose.yml`,`docker compose up` 即起整套:Postgres、GoTrue(Auth)、Storage、Realtime、Kong 网关);
   - 或云主机上装 PostgreSQL 等组件,但不推荐手拼——直接用官方 compose 最省事。
2. 起好后拿到本地 Supabase 的 `URL` 与 `anon/publishable key`(官方自托管默认提供),填入 `.env`(同方式一)。
3. 在 Supabase SQL Editor(自托管后打开 `http://localhost:8000` 之类管理台)执行 `.github/family_members.sql` 建表;并按 README 配置对应 RLS/索引。
4. `docker compose up -d --build` 构建应用容器,即完成"应用+数据库都在自己机器"的自部署。

> 迁移性:此 schema 与自托管/云上 Supabase 完全互通——以后可随时把这份 PG 库整体搬到云主机 PostgreSQL 或 Supabase 云。

## 方式三(了解即可):彻底去掉 Supabase

仓库对 Supabase 的耦合点(代码证据):
- 数据读写:`app/family-tree/**/actions.ts` 等多处 `supabase.from("family_members")`
- 鉴权:`login/signup/confirm`、根 `proxy.ts` 中间件(@supabase/ssr 会话 cookie)
- 实时:`hooks/use-realtime-chat.tsx`(`supabase.channel`)

如果目标是"任意 SQL 数据库(含 MySQL)",需要:把上述调用抽象成 repository 层(如 Prisma/Drizzle + pg),鉴权换成自建(next-auth/JWT),去掉或替换 Realtime。**不建议在跑通方式一/二之前做**,因为 schema 本身只兼容 PostgreSQL 系。

## 本地(非 Docker)开发

```bash
npm install
cp .env.example .env.local   # 填入 Supabase 凭证
npm run dev                  # http://localhost:3000
```
