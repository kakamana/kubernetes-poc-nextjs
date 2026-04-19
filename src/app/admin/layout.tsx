import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminNav } from "@/components/admin/nav";
import { PodBanner } from "@/components/admin/pod-banner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex-1 flex flex-col">
      <AdminNav user={session.user} />
      <PodBanner />
      <div className="flex-1">{children}</div>
    </div>
  );
}
