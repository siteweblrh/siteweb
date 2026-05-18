import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { IdleTimer } from "@/components/lrh/auth/IdleTimer";

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
      <IdleTimer />
      {children}
    </div>
  );
}
