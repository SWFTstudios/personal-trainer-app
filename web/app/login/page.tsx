import { AuthForm } from "./AuthForm";
import { signIn } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <AuthForm mode="login" action={signIn} error={(await searchParams).error} />;
}
