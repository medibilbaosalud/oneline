// src/lib/supabaseRouteHandler.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for use in API route handlers (Route Handlers).
 * Use this in /api routes instead of the old createRouteHandlerClient.
 */
export async function supabaseRouteHandler() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );
}
