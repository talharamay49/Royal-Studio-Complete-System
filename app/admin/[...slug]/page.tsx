import type { Metadata } from "next";
import AdminApp from "@/components/admin/App";

export const metadata: Metadata = {
  title: "Royal Studio ERP — Management Portal",
  description: "Official enterprise resource planning, CRM, event management, financials, and crew dispatch for Royal Studio.",
  robots: { index: false, follow: false },
};

export default function AdminSubPage() {
  return <AdminApp />;
}
