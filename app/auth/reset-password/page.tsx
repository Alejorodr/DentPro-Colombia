import ResetPasswordForm from "./reset-password-form";

type ResetPasswordPageProps = {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage(props: any) {
  const resolvedProps = props as ResetPasswordPageProps;
  const searchParams = (await resolvedProps?.searchParams) ?? {};
  const tokenParam = searchParams.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] ?? "" : tokenParam ?? "";

  return <ResetPasswordForm token={token} />;
}
