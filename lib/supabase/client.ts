import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  // Strip trailing '/rest/v1/' or '/rest/v1' to yield clean base url for Supabase SDK
  const sanitizedUrl = rawUrl.replace(/\/rest\/v1\/?$/, '')

  return createBrowserClient(
    sanitizedUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
