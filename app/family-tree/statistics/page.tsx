import React, { Suspense } from "react";
import { StatisticsContent } from "./statistics-content";

export const metadata = {
  title: "家族统计分析",
  description: "家族成员数据统计仪表盘",
};

export default function StatisticsPage() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="module-hero mb-6">
        <span className="module-hero__accent" aria-hidden="true" />
        <h1 className="text-3xl font-bold">家族数据统计</h1>
        <p className="mt-1 text-muted-foreground">
          家族成员数据分析仪表盘
        </p>
      </div>
      
      <Suspense fallback={<div className="py-12 text-center text-muted-foreground">正在加载统计数据...</div>}>
        <StatisticsContent />
      </Suspense>
    </div>
  );
}