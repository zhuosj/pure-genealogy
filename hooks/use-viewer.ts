"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/permissions";

export interface ViewerState {
  loading: boolean;
  isAdmin: boolean;
  isLoggedIn: boolean;
  email: string | null;
}

const INITIAL_STATE: ViewerState = {
  loading: true,
  isAdmin: false,
  isLoggedIn: false,
  email: null,
};

/**
 * 读取当前登录态并判定是否为管理员(邮箱白名单)。
 * - loading 为 true 期间不要渲染需要权限判断的 UI,避免闪烁;
 * - 组件卸载后不再 setState。
 */
export function useViewer(): ViewerState {
  const [state, setState] = React.useState<ViewerState>(INITIAL_STATE);

  React.useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled) return;
        const email = data?.user?.email ?? null;
        const isLoggedIn = Boolean(data?.user);
        setState({
          loading: false,
          isLoggedIn,
          email,
          isAdmin: isAdminEmail(email),
        });
      })
      .catch(() => {
        if (cancelled) return;
        // 获取用户失败按未登录/只读处理,避免界面卡在 loading
        setState({ ...INITIAL_STATE, loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
