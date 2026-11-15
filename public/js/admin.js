(function () {
  const msg = document.getElementById('adminMsg');
  const badge = document.getElementById('liveBadge');
  const cfg = window.__ADMIN__ || {};

  function setMsg(text) {
    if (msg) msg.textContent = text || '';
  }

  document.getElementById('refreshOrders')?.addEventListener('click', () => {
    window.location.reload();
  });

  document.getElementById('syncPrintify')?.addEventListener('click', async () => {
    setMsg('Syncing Printify → Supabase…');
    try {
      const res = await fetch('/api/admin/printify/sync', { method: 'POST', credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setMsg(`Synced ${data.synced || 0} products${data.persisted ? '' : ' (not persisted)'}`);
    } catch (err) {
      setMsg(err.message);
    }
  });

  document.getElementById('retryFulfillment')?.addEventListener('click', async () => {
    setMsg('Retrying Printify jobs…');
    try {
      const res = await fetch('/api/admin/fulfillment/retry', {
        method: 'POST',
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Retry failed');
      setMsg(`Processed ${(data.results || []).length} jobs`);
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setMsg(err.message);
    }
  });

  async function refreshStats() {
    try {
      const res = await fetch('/api/admin/orders?limit=100', { credentials: 'same-origin' });
      if (!res.ok) return;
      const data = await res.json();
      const orders = data.orders || [];
      const total = orders.length;
      const paid = orders.filter((o) => o.payment_status === 'paid').length;
      const printify = orders.filter((o) => o.printify_order_id).length;
      const pending = orders.filter((o) => o.payment_status === 'paid' && !o.printify_order_id).length;
      const elTotal = document.getElementById('statTotal');
      const prev = elTotal ? Number(elTotal.textContent) : total;
      if (elTotal) elTotal.textContent = String(total);
      const elPaid = document.getElementById('statPaid');
      const elPrintify = document.getElementById('statPrintify');
      const elPending = document.getElementById('statPending');
      if (elPaid) elPaid.textContent = String(paid);
      if (elPrintify) elPrintify.textContent = String(printify);
      if (elPending) elPending.textContent = String(pending);
      if (prev !== total) {
        window.location.reload();
      }
    } catch {
      /* ignore */
    }
  }

  // Supabase Realtime when publishable key is available
  if (window.supabase && cfg.supabaseUrl && cfg.publishableKey) {
    try {
      const client = window.supabase.createClient(cfg.supabaseUrl, cfg.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      client
        .channel('admin-orders')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            if (badge) {
              badge.textContent = 'Realtime update';
              badge.classList.add('live-badge--pulse');
            }
            refreshStats();
          }
        )
        .subscribe((status) => {
          if (!badge) return;
          if (status === 'SUBSCRIBED') {
            badge.textContent = 'Realtime live';
            badge.classList.add('live-badge--on');
          } else if (status === 'CHANNEL_ERROR') {
            badge.textContent = 'Realtime fallback poll';
          }
        });
    } catch {
      if (badge) badge.textContent = 'Polling every 15s';
    }
  } else if (badge) {
    badge.textContent = 'Polling every 15s';
  }

  setInterval(refreshStats, 15000);
})();
