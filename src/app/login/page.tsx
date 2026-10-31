import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandHeader } from "@/components/navigation/PageHeader";
import { LoginPanel } from "./LoginPanel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Switch demo role",
  robots: { index: false, follow: false },
};

const REASONS: Record<string, string> = {
  owner: "Choose a role to open the turf owner dashboard with seeded venue data.",
  admin: "Choose a role to open the super admin console and dispute tools.",
  checkout:
    "Choose a role to continue to checkout. Phone verification is disabled.",
};

function safeNext(value: string | undefined): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return undefined;
  }

  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const reason = params.reason ? REASONS[params.reason] : undefined;

  return (
    <div className="min-h-dvh pb-16">
      <BrandHeader />

      <main className="mx-auto flex max-w-lg flex-col px-4 pt-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 transition hover:text-emerald-300"
        >
          <ArrowLeft className="size-3" />
          Back to venues
        </Link>

        <LoginPanel next={next} reason={reason} />
      </main>
    </div>
  );
}
