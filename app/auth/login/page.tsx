import { LoginForm } from "@/components/login-form";
import Image from "next/image";
import Link from "next/link";

export default function Page() {
  return (
    <div className="relative flex min-h-svh w-full items-center justify-center p-6 md:p-10 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/login-bg.jpg"
          alt="Family Tree Background"
          fill
          className="object-cover opacity-80"
          priority
        />
        <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]" />
      </div>
      <div className="w-full max-w-sm z-10">
        <div className="mb-4 rounded-lg border bg-card/80 px-4 py-3 text-sm text-muted-foreground shadow-sm backdrop-blur">
          <p>浏览族谱无需登录(游客只读)。登录管理员账号后,可新增 / 编辑 / 删除成员。</p>
          <Link
            href="/family-tree/graph"
            className="mt-1 inline-block font-medium text-primary underline-offset-4 hover:underline"
          >
            以游客身份直接进入族谱 →
          </Link>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
