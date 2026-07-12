'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, User, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

type Mode = 'login' | 'signup'
type AccountType = 'customer' | 'technician'
type Step = 'phone' | 'otp'

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('customer')

  const isSignup = mode === 'signup'
  const phoneValid = phone.replace(/\D/g, '').length >= 10

  function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!phoneValid) return
    setStep('otp')
  }

  function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length < 6) return
    localStorage.setItem('ustad_account_type', accountType)
    if (accountType === 'technician') {
      router.push('/technician-dashboard')
    } else {
      router.push('/home')
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="rounded-3xl border border-border bg-card p-6 soft-shadow sm:p-8">
        {step === 'phone' ? (
          <>
            <div className="mb-6 flex flex-col gap-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {isSignup ? 'Create your account' : 'Welcome back'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isSignup
                  ? 'Sign up with your phone number to get started.'
                  : 'Log in with your phone number to continue.'}
              </p>
            </div>

            {isSignup && (
              <div className="mb-5">
                <p className="mb-2 text-sm font-medium text-foreground">
                  I am a
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <AccountTypeOption
                    icon={User}
                    label="Customer"
                    description="I need services"
                    active={accountType === 'customer'}
                    onClick={() => setAccountType('customer')}
                  />
                  <AccountTypeOption
                    icon={Wrench}
                    label="Technician"
                    description="I provide services"
                    active={accountType === 'technician'}
                    onClick={() => setAccountType('technician')}
                  />
                </div>
              </div>
            )}

            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="phone" className="text-sm font-medium text-foreground">
                  Phone number
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 focus-within:border-primary">
                  <Phone className="size-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    +92
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="300 1234567"
                    className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={!phoneValid}
                className="tap h-11 w-full"
              >
                Send OTP
              </Button>
            </form>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back
            </button>

            <div className="mb-6 flex flex-col gap-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Enter verification code
              </h1>
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to{' '}
                <span className="font-medium text-foreground">+92 {phone}</span>
              </p>
            </div>

            <form onSubmit={handleVerify} className="flex flex-col gap-5">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                containerClassName="justify-between"
              >
                <InputOTPGroup className="flex w-full justify-between gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="size-12 flex-1 rounded-xl border text-base font-semibold first:rounded-l-xl last:rounded-r-xl"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              <Button
                type="submit"
                size="lg"
                disabled={otp.length < 6}
                className="tap h-11 w-full"
              >
                Verify &amp; continue
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Didn&apos;t get the code?{' '}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                >
                  Resend
                </button>
              </p>
            </form>
          </>
        )}
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
        <Link
          href={isSignup ? '/login' : '/signup'}
          className="font-medium text-primary hover:underline"
        >
          {isSignup ? 'Log in' : 'Sign up'}
        </Link>
      </p>
    </div>
  )
}

function AccountTypeOption({
  icon: Icon,
  label,
  description,
  active,
  onClick,
}: {
  icon: typeof User
  label: string
  description: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'tap flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left',
        active
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:bg-muted',
      )}
    >
      <span
        className={cn(
          'flex size-8 items-center justify-center rounded-lg',
          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  )
}
