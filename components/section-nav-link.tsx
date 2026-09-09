"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface SectionNavLinkProps {
  href: string;
  children: React.ReactNode;
}

/**
 * 栏目导航链接:当前所在栏目高亮(松柏绿文字 + 底部下划线),
 * 其余灰色悬停加深,替代原先无状态的一排链接。
 */
export function SectionNavLink({ href, children }: SectionNavLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "relative py-1 text-sm font-medium transition-colors",
        active
          ? "text-emerald-700 dark:text-emerald-400"
          : "text-muted-foreground hover:text-foreground",
        active &&
          "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-gradient-to-r after:from-emerald-500 after:to-emerald-300/60"
      )}
    >
      {children}
    </Link>
  );
}
