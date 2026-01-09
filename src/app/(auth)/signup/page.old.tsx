import { SignupForm } from '@/components/auth/SignupForm'

export const metadata = {
  title: 'Sign Up | NFL Playoff Pick\'em',
  description: 'Create your account',
}

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <SignupForm />
    </div>
  )
}
