import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { HomeDashboardDesktop } from "@/components/lrh/DashboardDesktop";
import { DashboardMobile } from "@/components/lrh/DashboardMobile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
