'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, User, Wrench, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'signup'
type AccountType = 'customer' | 'technician'

function getErrorMessage(error: any): string {
  if (!error) return 'Something went wrong, please try again.'
  if (typeof error === 'string') return error
  if (error.message && typeof error.message === 'string') return error.message
  if (error.error_description && typeof error.error_description === 'string') return error.error_description
  try {
    const stringified = JSON.stringify(error)
    if (stringified && stringified !== '{}') return stringified
  } catch (e) {}
  return 'Something went wrong, please try again.'
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('customer')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignup = mode === 'signup'
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const formValid = emailValid && password.length >= 6 && (!isSignup || fullName.trim().length > 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formValid) return
    setErrorMsg(null)
    setLoading(true)

    try {
      if (isSignup) {
        // Sign up standard user
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: fullName,
              account_type: accountType,
            }
          }
        })

        if (error) {
          setErrorMsg(getErrorMessage(error))
          setLoading(false)
          return
        }

        // Save account type metadata locally
        localStorage.setItem('ustad_account_type', accountType)
        localStorage.setItem('ustad_email', email)

        // Profiles upsert backup helper
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: email,
            full_name: fullName,
            role: accountType === 'technician' ? 'provider' : accountType,
          })
        }

        // Redirect based on role
        if (accountType === 'technician') {
          router.push('/technician-dashboard')
        } else {
          router.push('/home')
        }
      } else {
        // Log in standard user
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setErrorMsg(getErrorMessage(error))
          setLoading(false)
          return
        }

        // Fetch account type from profile
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single()

          const dbRole = profile?.role || 'customer'
          const role = dbRole === 'provider' ? 'technician' : dbRole
          localStorage.setItem('ustad_account_type', role)
          localStorage.setItem('ustad_email', email)

          if (role === 'technician') {
            router.push('/technician-dashboard')
          } else {
            router.push('/home')
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err))
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

        <div className="mb-6 flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSignup
              ? 'Fill in your details below to get started.'
              : 'Enter your credentials to access your account.'}
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignup && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                Full Name
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 focus-within:border-primary">
                <User className="size-4 shrink-0 text-muted-foreground" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  placeholder="John Doe"
                  required
                  className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          )}

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
                required
                className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 focus-within:border-primary">
              <Lock className="size-4 shrink-0 text-muted-foreground" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••"
                required
                minLength={6}
                className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={!formValid || loading}
            className="tap h-11 w-full mt-2"
          >
            {loading ? 'Processing...' : (isSignup ? 'Create Account' : 'Log In')}
          </Button>
        </form>
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
