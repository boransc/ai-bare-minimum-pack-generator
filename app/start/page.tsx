import type { Metadata } from "next";
import { PackFlow } from "@/components/pack-flow";

export const metadata: Metadata = {
  title: "Create your pack — AI Bare Minimum Pack",
  robots: { index: false, follow: false },
};

export default function StartPage() {
  return <PackFlow />;
}
