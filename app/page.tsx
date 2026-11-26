import Image from "next/image";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { SiteFooter } from "@/components/site-footer";
import { Navbar } from "@/components/navbar";
import { HomeHero } from "@/components/home-hero";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await requireUser(cookies().toString());
  if (user) redirect("/settings");

  return (
    <HomeHero navigation={<Navbar user={user} />} footer={<SiteFooter home />}>
        <div className="relative z-10">
          <Image
            src="/penguin-text.png"
            alt="Penguin"
            width={1534}
            height={979}
            priority
            sizes="(max-width: 640px) calc(100vw - 48px), 512px"
            className="mx-auto h-auto w-full max-w-lg object-contain invert"
          />
          {searchParams.error && (
            <p
              role="alert"
              className="mx-auto mt-6 max-w-md rounded-xl bg-white/95 px-4 py-3 text-sm text-signin-error"
            >
              {errorMessage(searchParams.error)}
            </p>
          )}
        </div>
    </HomeHero>
  );
}

function errorMessage(error: string) {
  switch (error) {
    case "invalid_state":
      return "Invalid security state. Please try signing in again.";
    case "missing_params":
      return "GitHub sign-in was cancelled or missing parameters.";
    case "token_exchange_failed":
    case "callback_failed":
      return "GitHub sign-in failed. Please try again.";
    default:
      return "Something went wrong. Please try signing in again.";
  }
}
