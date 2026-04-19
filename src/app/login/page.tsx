import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  if (session?.user) {
    redirect(sp.callbackUrl || "/admin");
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
            MoroHub Functional POC
          </div>
          <CardTitle className="text-2xl">Sign in to the admin console</CardTitle>
          <CardDescription>
            Use the seeded credentials or your own account. Data is fetched live
            from PostgreSQL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm callbackUrl={sp.callbackUrl} />
          <div className="mt-6 rounded-md border border-dashed border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
            <div className="font-semibold mb-1">Seeded demo accounts</div>
            <div>
              admin@morohub.local / MoroHub@12345 (ADMIN)
              <br />
              viewer@morohub.local / Viewer@12345 (USER — read-only)
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
