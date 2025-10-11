// src/app/history/page.tsx
import HistoryClient from "./HistoryClient";

export const metadata = {
  title: "History — OneLine",
  description: "Browse, edit and delete your daily lines.",
};

export default function HistoryPage() {
  return <HistoryClient />;
}