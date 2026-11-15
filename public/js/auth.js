(function () {
  const cfg = window.__AUTH__ || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return;

  const supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  });

  const msg = document.getElementById('authMessage');

  function setMsg(text, isError) {
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = isError ? '#9b2c2c' : 'var(--muted)';
  }

  async function persistToken() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      document.cookie = `sb_access_token=${token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    }
  }

  document.getElementById('googleBtn')?.addEventListener('click', async () => {
    setMsg('Redirecting to Google…');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setMsg(error.message, true);
  });

  document.getElementById('emailAuthForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    setMsg('Signing in…');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMsg(error.message, true);
      return;
    }
    await persistToken();
    window.location.href = cfg.next || '/';
  });

  document.getElementById('signUpBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    setMsg('Creating account…');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMsg(error.message, true);
      return;
    }
    await persistToken();
    setMsg('Account created. You can continue.');
    window.location.href = cfg.next || '/';
  });

  supabase.auth.getSession().then(({ data }) => {
    if (data.session) {
      persistToken().then(() => {
        setMsg('Already signed in. Redirecting…');
        window.location.href = cfg.next || '/';
      });
    }
  });
})();
