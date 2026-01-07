
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    // 1. Initialize Supabase Client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                    })
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 2. Refresh Session
    // This will refresh the session if needed and update the cookie
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // 3. Protected Routes Logic
    // Route: /settings (Auth Required - accessible to all authenticated users)
    if (request.nextUrl.pathname.startsWith('/settings')) {
        if (!user || !user.id) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        // Settings page is accessible to all authenticated users
        // No role check needed - this is for personal profile settings
    }

    // Route: /vault (Auth Required)
    if (request.nextUrl.pathname.startsWith('/vault')) {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - /images files
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
