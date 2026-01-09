import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata = {
  title: "Alex's Pigskin Picks",
  description: "Alex's Pigskin Picks",
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ResetPasswordForm />
    </div>
  )
}
