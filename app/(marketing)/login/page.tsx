import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage(props: any) {
  const resolvedProps = props as LoginPageProps;
  const searchParams = (await resolvedProps?.searchParams) ?? {};
  const callbackUrlRaw = searchParams?.callbackUrl;
  const callbackUrl =
    typeof callbackUrlRaw === "string" && callbackUrlRaw.trim().length > 0 ? callbackUrlRaw : null;

  const redirectUrl =
    callbackUrl && callbackUrl !== "/"
      ? `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/auth/login";
  redirect(redirectUrl);
}
