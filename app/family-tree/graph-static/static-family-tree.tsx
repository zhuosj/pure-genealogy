"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dagre from "@dagrejs/dagre";
import { Search, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toChineseNum } from "../graph/utils/chinese-num";
import { getBranchBaseColor, generateBranchColor } from "../graph/utils/colors";
import { MemberDetailDialog } from "../member-detail-dialog";
import type { FamilyMemberNode } from "../graph/actions";

/** 静态树:不用缩放画布,按文档流渲染整棵树(超宽时横向滚动) */
const NODE_W = 132;
const NODE_H = 78;
const H_GAP = 12;
const V_GAP = 34;
const PAD = 26;

interface LayoutNode {
  member: FamilyMemberNode;
  x: number;
  y: number;
  color: string;
}

interface LayoutLink {
  id: string;
  fatherId: number;
  childId: number;
}

interface GenerationRow {
  generation: number;
  y: number;
  count: number;
}

interface StaticFamilyTreeProps {
  data: FamilyMemberNode[];
}

function computeLayout(data: FamilyMemberNode[]) {
  const memberMap = new Map(data.map((m) => [m.id, m]));
  const childrenMap = new Map<number, number[]>();
  data.forEach((m) => {
    if (m.father_id) {
      const arr = childrenMap.get(m.father_id) || [];
      arr.push(m.id);
      childrenMap.set(m.father_id, arr);
    }
  });

  const roots = data.filter((m) => !m.father_id || !memberMap.has(m.father_id));
  const rootGeneration = roots.length
    ? Math.min(...roots.map((r) => r.generation || 1))
    : 1;
  const baseColor = getBranchBaseColor(0);

  const colorOf = (m: FamilyMemberNode) =>
    generateBranchColor(baseColor, Math.max(0, (m.generation || rootGeneration) - (rootGeneration + 1)));

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    nodesep: H_GAP,
    ranksep: V_GAP,
    align: "DL", // 紧凑对齐,和动态视图的紧凑模式保持一致
  });

  data.forEach((m) => g.setNode(String(m.id), { width: NODE_W, height: NODE_H }));
  data.forEach((m) => {
    if (m.father_id && memberMap.has(m.father_id)) {
      g.setEdge(String(m.father_id), String(m.id));
    }
  });
  dagre.layout(g);

  // 中心点坐标 -> 左上角坐标
  const raw = data.map((m) => {
    const p = g.node(String(m.id));
    return { member: m, cx: p.x, cy: p.y };
  });

  const minX = Math.min(...raw.map((r) => r.cx - NODE_W / 2));
  const minY = Math.min(...raw.map((r) => r.cy - NODE_H / 2));
  const shiftX = PAD - minX;
  const shiftY = PAD - minY;

  const nodes: LayoutNode[] = raw.map((r) => ({
    member: r.member,
    x: r.cx - NODE_W / 2 + shiftX,
    y: r.cy - NODE_H / 2 + shiftY,
    color: colorOf(r.member),
  }));
  const nodeMap = new Map(nodes.map((n) => [n.member.id, n]));

  // 父子连线端点交给组件按"实测卡片高度"计算,保证两端都贴住卡片
  const links: LayoutLink[] = [];
  nodes.forEach((n) => {
    const fatherId = n.member.father_id;
    if (!fatherId || !nodeMap.has(fatherId)) return;
    links.push({ id: `${fatherId}-${n.member.id}`, fatherId, childId: n.member.id });
  });

  // 世代行(用于左侧世代锚点/参考线)
  const rowMap = new Map<number, { total: number; count: number }>();
  nodes.forEach((n) => {
    const gen = n.member.generation;
    if (!gen) return;
    const cur = rowMap.get(gen) || { total: 0, count: 0 };
    rowMap.set(gen, { total: cur.total + n.y + NODE_H / 2, count: cur.count + 1 });
  });
  const rows: GenerationRow[] = [...rowMap.entries()]
    .map(([generation, v]) => ({ generation, y: v.total / v.count, count: v.count }))
    .sort((a, b) => b.generation - a.generation);

  const width = Math.max(...nodes.map((n) => n.x + NODE_W)) + PAD;
  const height = Math.max(...nodes.map((n) => n.y + NODE_H)) + PAD;

  return { nodes, links, rows, width, height };
}

export function StaticFamilyTree({ data }: StaticFamilyTreeProps) {
  const layout = useMemo(() => computeLayout(data), [data]);
  const nodeRefs = useRef(new Map<number, HTMLDivElement>());

  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [selectedMember, setSelectedMember] = useState<FamilyMemberNode | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  // 实测卡片高度(内容不同高度不同),用于让连线两端精确贴住卡片
  const [cardHeights, setCardHeights] = useState<Record<number, number>>({});

  useEffect(() => {
    const measure = () => {
      const next: Record<number, number> = {};
      nodeRefs.current.forEach((el, id) => {
        next[id] = el.offsetHeight;
      });
      if (Object.keys(next).length === 0) return;
      setCardHeights((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (prevKeys.length !== nextKeys.length) return next;
        for (const k of nextKeys) {
          if (Math.abs((prev[Number(k)] ?? 0) - next[Number(k)]) > 0.5) return next;
        }
        return prev;
      });
    };
    measure();
    const timer = setTimeout(measure, 250); // 字体/徽标渲染完成后复测一次
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measure);
    };
  }, [layout]);

  const nodeById = useMemo(
    () => new Map(layout.nodes.map((n) => [n.member.id, n])),
    [layout]
  );

  // 连线:从父卡片实测底部 -> 子卡片顶部,两端各加一个小圆点,更醒目
  const edges = useMemo(
    () =>
      layout.links.flatMap((l) => {
        const p = nodeById.get(l.fatherId);
        const c = nodeById.get(l.childId);
        if (!p || !c) return [];
        const parentH = cardHeights[l.fatherId] ?? NODE_H;
        const x1 = p.x + NODE_W / 2;
        const y1 = p.y + parentH - 1;
        const x2 = c.x + NODE_W / 2;
        const y2 = c.y + 1;
        const midY = (y1 + y2) / 2;
        return [
          {
            id: l.id,
            d: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`,
            x1,
            y1,
            x2,
            y2,
          },
        ];
      }),
    [layout, nodeById, cardHeights]
  );

  const scrollToNode = useCallback((id: number) => {
    const el = nodeRefs.current.get(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  }, []);

  const onSearch = useCallback(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setHighlightedId(null);
      return;
    }
    const found = data.find((m) => m.name.toLowerCase().includes(q));
    if (found) {
      setHighlightedId(found.id);
      scrollToNode(found.id);
    } else {
      setHighlightedId(null);
    }
  }, [searchQuery, data, scrollToNode]);

  const onClearSearch = useCallback(() => {
    setSearchQuery("");
    setHighlightedId(null);
  }, []);

  const scrollToGeneration = useCallback((generation: number) => {
    const el = document.getElementById(`static-gen-anchor-${generation}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const fatherName = useMemo(() => {
    if (!selectedMember?.father_id) return null;
    return data.find((m) => m.id === selectedMember.father_id)?.name || null;
  }, [selectedMember, data]);

  return (
    <div className="space-y-4">
      {/* 工具条:吸顶,搜索 + 世代锚点(倒序) */}
      <div className="sticky top-0 z-20 rounded-lg border bg-background/95 p-2 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 rounded-md border p-1">
            <Input
              placeholder="搜索姓名并定位..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              className="h-8 w-40 border-0 focus-visible:ring-0 sm:w-56"
            />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onSearch} title="搜索定位">
              <Search className="h-4 w-4" />
            </Button>
            {searchQuery && (
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClearSearch} title="清除">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {layout.rows.map((row) => (
              <button
                key={row.generation}
                type="button"
                title={`第${toChineseNum(row.generation)}世 · 共 ${row.count} 人`}
                onClick={() => scrollToGeneration(row.generation)}
                className="shrink-0 rounded-full px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
              >
                {toChineseNum(row.generation)}世
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 静态树本体:页面纵向滚动,超宽横向滚动;无缩放/无网格背景 */}
      <div className="overflow-x-auto rounded-lg border bg-card/60 p-2">
        <div className="relative" style={{ width: layout.width, height: layout.height }}>
          {/* 世代参考线 + 左侧标尺 */}
          {layout.rows.map((row) => (
            <div key={row.generation}>
              <span
                id={`static-gen-anchor-${row.generation}`}
                className="absolute -left-0 block h-px w-px"
                style={{ top: row.y }}
                aria-hidden="true"
              />
              <div
                className="absolute left-0 right-0 border-t border-dashed border-border/60"
                style={{ top: row.y }}
                aria-hidden="true"
              />
              <div
                className="absolute z-10 flex h-5 -translate-y-1/2 items-center rounded-full border bg-background px-1.5 text-[10px] font-medium text-muted-foreground shadow-sm"
                style={{ top: row.y, left: 0 }}
              >
                第{toChineseNum(row.generation)}世
                <span className="ml-1 text-[9px] opacity-70">{row.count}人</span>
              </div>
            </div>
          ))}

          {/* 连线:深松柏绿、加粗,两端带节点圆点 */}
          <svg
            className="pointer-events-none absolute inset-0 text-emerald-700 dark:text-emerald-400"
            width={layout.width}
            height={layout.height}
            aria-hidden="true"
          >
            {edges.map((e) => (
              <g key={e.id}>
                <path
                  d={e.d}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  opacity={0.85}
                />
                <circle cx={e.x1} cy={e.y1} r={2.5} fill="currentColor" opacity={0.9} />
                <circle cx={e.x2} cy={e.y2} r={2.5} fill="currentColor" opacity={0.9} />
              </g>
            ))}
          </svg>

          {/* 节点卡片 */}
          {layout.nodes.map((n) => {
            const m = n.member;
            const active = highlightedId === m.id;
            return (
              <div
                key={m.id}
                ref={(el) => {
                  if (el) nodeRefs.current.set(m.id, el);
                  else nodeRefs.current.delete(m.id);
                }}
                onClick={() => {
                  setSelectedMember(m);
                  setIsDetailOpen(true);
                }}
                className={cn(
                  "absolute cursor-pointer rounded-md border-2 bg-card px-1.5 py-1 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                  m.gender === "男"
                    ? m.is_alive
                      ? "border-blue-400 dark:border-blue-500"
                      : "border-blue-300/50 dark:border-blue-900/50"
                    : m.gender === "女"
                      ? m.is_alive
                        ? "border-pink-400 dark:border-pink-500"
                        : "border-pink-300/50 dark:border-pink-900/50"
                      : "border-border",
                  !m.is_alive && "opacity-90",
                  active && "ring-2 ring-amber-400/70 shadow-md"
                )}
                style={{ left: n.x, top: n.y, width: NODE_W }}
              >
                {/* 顶部世代色条 */}
                <span
                  className="absolute inset-x-0 top-0 h-1 rounded-t-[6px]"
                  style={{ background: n.color }}
                  aria-hidden="true"
                />
                <div className="mt-0.5 truncate text-center text-sm font-bold leading-tight" title={m.name}>
                  {m.name}
                </div>
                {m.spouse && (
                  <div className="truncate text-center text-[10px] leading-tight text-muted-foreground" title={m.spouse}>
                    配:{m.spouse}
                  </div>
                )}
                <div className="mt-0.5 flex flex-wrap items-center justify-center gap-0.5">
                  {m.generation !== null && (
                    <Badge variant="secondary" className="px-1 py-0 text-[9px] leading-4">
                      第{m.generation}世
                    </Badge>
                  )}
                  {m.sibling_order !== null && (
                    <Badge variant="outline" className="px-1 py-0 text-[9px] leading-4">
                      排行{m.sibling_order}
                    </Badge>
                  )}
                  {!m.is_alive && (
                    <span className="text-[9px] italic text-muted-foreground">已故</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          静态树视图:整棵树按文档流铺开,<b>不支持缩放/拖拽</b>;树较宽时请在区域内左右滚动,点击卡片可查看成员详情。
        </p>
      </div>

      <MemberDetailDialog
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        member={selectedMember}
        fatherName={fatherName}
      />
    </div>
  );
}
