import SignUpClient from "./SignUpClient";

type SearchParams = {
  redirectTo?: string | string[];
};

type PageProps = {
  searchParams?: SearchParams;
};

export default function SignUpPage({ searchParams }: PageProps) {
  const redirectParam = searchParams?.redirectTo;
  const redirectTo = Array.isArray(redirectParam) ? redirectParam[0] : redirectParam ?? undefined;

  return <SignUpClient redirectTo={redirectTo} />;
}
