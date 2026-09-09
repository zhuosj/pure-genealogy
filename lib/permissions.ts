// 访问权限:游客只读浏览,仅管理员(邮箱白名单)可增删改。
// 白名单来自环境变量 ADMIN_EMAILS(服务端)或 NEXT_PUBLIC_ADMIN_EMAILS(客户端),
// 逗号分隔;默认只有一个管理员邮箱(可在 .env 修改)。

const ADMIN_EMAILS_RAW =
  process.env.ADMIN_EMAILS ??
  process.env.NEXT_PUBLIC_ADMIN_EMAILS ??
  "zsj285009671@163.com";

const ADMIN_SET: ReadonlySet<string> = new Set(
  ADMIN_EMAILS_RAW.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_SET.has(email.trim().toLowerCase());
}
