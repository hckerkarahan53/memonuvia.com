const config = require('../config');
const { getAdminClient, createUserClient } = require('../services/supabase');

async function attachUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = bearer || req.cookies?.sb_access_token || null;

    res.locals.user = null;
    res.locals.isAdmin = false;
    req.user = null;
    req.accessToken = token;

    if (!token) return next();

    const client = createUserClient(token);
    if (!client) return next();

    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) return next();

    req.user = data.user;
    res.locals.user = data.user;

    const admin = getAdminClient();
    let role = 'customer';
    if (admin) {
      const { data: profile } = await admin
        .from('profiles')
        .select('role, full_name, avatar_url')
        .eq('id', data.user.id)
        .maybeSingle();
      role = profile?.role || 'customer';
      if (profile) {
        req.user.profile = profile;
        res.locals.user.profile = profile;
      }
    }

    if (
      role !== 'admin' &&
      config.adminEmails.includes(String(data.user.email || '').toLowerCase())
    ) {
      role = 'admin';
      if (admin) {
        await admin.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          role: 'admin',
        });
      }
    }

    req.user.role = role;
    res.locals.isAdmin = role === 'admin';
    return next();
  } catch (err) {
    console.warn('[auth] attachUser:', err.message);
    return next();
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    return res.redirect(`/auth?next=${encodeURIComponent(req.originalUrl)}`);
  }
  return next();
}

function requireAdmin(req, res, next) {
  const { isConfigured } = require('../services/supabase');
  // Local demo: allow admin routes when Supabase is not configured yet
  if (!isConfigured() && config.nodeEnv !== 'production') {
    req.user = req.user || { id: 'demo-admin', email: 'admin@memonuvia.com', role: 'admin' };
    res.locals.isAdmin = true;
    return next();
  }

  if (!req.user || req.user.role !== 'admin') {
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    return res.status(403).render('pages/error', {
      title: 'Forbidden',
      message: 'Admin access required. Sign in with an admin account.',
      status: 403,
    });
  }
  return next();
}

module.exports = {
  attachUser,
  requireAuth,
  requireAdmin,
};
