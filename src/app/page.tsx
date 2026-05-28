import { LoginForm } from "@/components/login-form";
import { Workbench } from "@/components/workbench";
import { logoutAction } from "@/app/actions";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, authenticated] = await Promise.all([searchParams, isAuthenticated()]);

  if (!authenticated) {
    return <LoginForm error={error} />;
  }

  return <Workbench logoutAction={logoutAction} />;
}
