import { createServerClient } from '@supabase/ssr';

export const supabaseServer = (Astro) =>
  createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (k) => Astro.cookies.get(k)?.value,
        set: (k, v, o) => Astro.cookies.set(k, v, o),
        remove: (k, o) => Astro.cookies.delete(k, o),
      },
    }
  );

