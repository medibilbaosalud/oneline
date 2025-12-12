"use client";

import type { ReactNode } from "react";
import { TourProvider } from "@/components/InteractiveTour";
import { VisitorProvider } from "@/components/VisitorMode";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <VisitorProvider>
      <TourProvider>{children}</TourProvider>
    </VisitorProvider>
  );
}
