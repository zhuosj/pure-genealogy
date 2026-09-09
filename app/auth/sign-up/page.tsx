import { SignUpForm } from "@/components/sign-up-form";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="mb-4 rounded-lg border bg-card/80 px-4 py-3 text-sm text-muted-foreground shadow-sm backdrop-blur">
          <p>普通浏览族谱无需注册账号。此处注册的账号需加入管理员邮箱白名单后,才拥有新增 / 编辑 / 删除权限。</p>
          <Link
            href="/family-tree/graph"
            className="mt-1 inline-block font-medium text-primary underline-offset-4 hover:underline"
          >
            以游客身份直接进入族谱 →
          </Link>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
