import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // IMPORTANT: Refreshes the session before checking roles
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  
  // Define the Protected Zones
  const isAdminPath = pathname.startsWith('/admin')
  const isWriterPath = pathname.startsWith('/writer')
  
  /** * 1. CONFIGURE ADMIN ACCESS
   * Replace with your actual administrative email address.
   */
  const ADMIN_EMAIL = "nationaldevs@gmail.com"

  /**
   * 2. ADMIN SECURITY LOGIC
   * We allow access to the login page (/admin/login) 
   * but lock everything else under /admin to ONLY the admin email.
   */
  if (isAdminPath && pathname !== '/admin/login') {
    if (!user || user.email !== ADMIN_EMAIL) {
      // If unauthorized, kick back to Admin Login
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  /**
   * 3. WRITER SECURITY LOGIC
   * We allow access to /writer/login
   * but lock all other /writer routes to any authenticated user.
   */
  if (isWriterPath && pathname !== '/writer/login') {
    if (!user) {
      // If not logged in, kick to Writer Login
      return NextResponse.redirect(new URL('/writer/login', request.url))
    }

    // EXTRA SAFETY: If an Admin tries to go to Writer pages, they can,
    // but if you want to keep them separate, you could add logic here.
  }

  return response
}

// Ensure the middleware runs on all relevant routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}