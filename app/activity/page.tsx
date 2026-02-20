import type { Metadata } from "next";
import { ActivityPageClient } from "@/components/activity-page-client";

export const metadata: Metadata = {
  title: "Activity – Erik Nilsson",
  description: "GitHub activity over time",
};

export default function ActivityPage() {
  return <ActivityPageClient />;
}
