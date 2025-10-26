import SignInClient from "./SignInClient";

type SearchParams = {
  redirectTo?: string | string[];
};

type PageProps = {
  searchParams?: SearchParams;
};

export default function SignInPage({ searchParams }: PageProps) {
  const redirectParam = searchParams?.redirectTo;
  const next = Array.isArray(redirectParam)
    ? redirectParam[0] ?? "/today"
    : redirectParam || "/today";

  return <SignInClient next={next} />;
}
