(function () {
  const cfg = window.__AUTH__ || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    window.location.href = '/auth';
    return;
  }

  const supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  });

  supabase.auth.getSession().then(async ({ data, error }) => {
    if (error || !data.session) {
      window.location.href = '/auth';
      return;
    }
    document.cookie = `sb_access_token=${data.session.access_token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    window.location.href = '/';
  });
})();
