"use client";

import type { ReactNode } from "react";
import { TourProvider } from "@/components/InteractiveTour";

export default function Providers({ children }: { children: ReactNode }) {
  return <TourProvider>{children}</TourProvider>;
}
