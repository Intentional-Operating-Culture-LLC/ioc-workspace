import { LoginForm } from "@ioc/shared/ui";

export const metadata = {
  title: 'Login - IOC Core',
  description: 'Sign in to your IOC Core account'
};

export default function LoginPage() {
  return <LoginForm />;
}