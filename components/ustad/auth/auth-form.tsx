'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, User, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'signup'
type AccountType = 'customer' | 'technician'
type Step = 'email' | 'otp'

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const supabase = createClient()
  
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('customer')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignup = mode === 'signup'
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!emailValid) return
    setErrorMsg(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
      })

      if (error) {
        setErrorMsg(error.message)
      } else {
        setStep('otp')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length < 6) return
    setErrorMsg(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      })

      if (error) {
        setErrorMsg(error.message)
        setLoading(false)
        return
      }

      // Upsert profiles details into profiles table
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            name: isSignup ? 'New User' : (data.user.user_metadata?.name || 'User'),
            email: email,
            account_type: accountType,
          })

        if (profileError) {
          console.error('Error saving profile:', profileError.message)
        }
      }

      localStorage.setItem('ustad_account_type', accountType)
      localStorage.setItem('ustad_email', email)
      
      if (accountType === 'technician') {
        router.push('/technician-dashboard')
      } else {
        router.push('/home')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="rounded-3xl border border-border bg-card p-6 soft-shadow sm:p-8">
        {errorMsg && (
          <div className="mb-4 text-xs font-semibold text-destructive bg-destructive/5 border border-destructive/20 rounded-xl p-3 leading-normal">
            {errorMsg}
          </div>
        )}

        {step === 'email' ? (
          <>
            <div className="mb-6 flex flex-col gap-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {isSignup ? 'Create your account' : 'Welcome back'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isSignup
                  ? 'Sign up with your email address to get started.'
                  : 'Log in with your email address to continue.'}
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
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email address
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 focus-within:border-primary">
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    placeholder="you@example.com"
                    className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={!emailValid || loading}
                className="tap h-11 w-full"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
            </form>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep('email')}
              disabled={loading}
              className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
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
                <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>

            <form onSubmit={handleVerify} className="flex flex-col gap-5">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                disabled={loading}
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
                disabled={otp.length < 6 || loading}
                className="tap h-11 w-full"
              >
                {loading ? 'Verifying...' : 'Verify & continue'}
              </Button>
            </form>
          </>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {isSignup ? (
          <>
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            Don't have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </>
        )}
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
  icon: any
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
        'tap flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-3 text-center transition-colors',
        active ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground hover:bg-muted/50'
      )}
    >
      <Icon className="size-5" />
      <div>
        <p className="text-xs font-semibold">{label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  )
}
