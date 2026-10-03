import { AuthForm } from "../login/AuthForm";
import { signUp } from "../login/actions";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <AuthForm mode="signup" action={signUp} error={(await searchParams).error} />;
}
