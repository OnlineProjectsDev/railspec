import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"

export const createClient = async () => {
  const cookieStore = await cookies()

  const { getIdToken } = getKindeServerSession()
  const idToken = await getIdToken()

  let token: string
  if (idToken) {
    token = jwt.sign(idToken, process.env.KINDE_CLIENT_SECRET!)
  } else {
    token = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}