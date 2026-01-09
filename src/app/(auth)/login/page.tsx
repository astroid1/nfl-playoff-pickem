import { LoginForm } from '@/components/auth/LoginForm'

export const metadata = {
  title: "Alex's Pigskin Picks",
  description: "Alex's Pigskin Picks",
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <LoginForm />
    </div>
  )
}
