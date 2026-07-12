import { Logo } from '@/components/ustad/logo'
import { AuthForm } from '@/components/ustad/auth/auth-form'

export default function SignupPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-background px-4 py-10">
      <div className="mb-10">
        <Logo />
      </div>
      <div className="flex w-full flex-1 items-start justify-center">
        <AuthForm mode="signup" />
      </div>
    </main>
  )
}
