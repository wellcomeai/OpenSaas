"use client";

import { useEffect, useRef } from "react";
import { useUiStore } from "@/store/uiStore";

export default function CodeAILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen, setSidebarOpen, setAutoCollapsed, setHideHeader } =
    useUiStore();
  const wasOpenRef = useRef(sidebarOpen);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    setSidebarOpen(false);
    setAutoCollapsed(true);
    setHideHeader(true);
    return () => {
      if (wasOpen) setSidebarOpen(true);
      setAutoCollapsed(false);
      setHideHeader(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
