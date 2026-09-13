import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Network } from "lucide-react";
import { fetchAllFamilyMembers } from "../graph/actions";
import { StaticFamilyTree } from "./static-family-tree";
import { Button } from "@/components/ui/button";
import { FAMILY_SURNAME } from "@/lib/utils";

export const metadata: Metadata = {
  title: `${FAMILY_SURNAME}氏族谱 · 静态树`,
  description: "以文档流方式铺开的静态族谱树(无缩放画布)",
};

function Skeleton() {
  return (
    <div className="h-[60vh] w-full animate-pulse rounded-lg border bg-muted/20 flex items-center justify-center">
      <div className="text-muted-foreground">加载静态族谱树...</div>
    </div>
  );
}

async function TreeLoader() {
  const { data, error } = await fetchAllFamilyMembers();

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
        <p>加载数据失败: {error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg bg-muted/50 p-8 text-center text-muted-foreground">
        <p>暂无族谱数据,请先添加成员。</p>
      </div>
    );
  }

  return <StaticFamilyTree data={data} />;
}

export default function StaticTreePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="module-hero mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <span className="module-hero__accent" aria-hidden="true" />
        <div>
          <h1 className="text-3xl font-bold">族谱关系图(静态树)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            固定树状布局 · 直接在页面上铺开查看,无缩放画布
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/family-tree/graph">
            <Network className="mr-2 h-4 w-4" />
            切换到可缩放视图
          </Link>
        </Button>
      </div>

      <Suspense fallback={<Skeleton />}>
        <TreeLoader />
      </Suspense>
    </div>
  );
}
