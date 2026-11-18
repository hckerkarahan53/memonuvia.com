(function () {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order_id') || sessionStorage.getItem('memonuvia_order_id');
  const summary = document.getElementById('checkoutSummary');
  const form = document.getElementById('checkoutForm');
  const errorEl = document.getElementById('checkoutError');

  function showError(text) {
    errorEl.style.display = 'block';
    errorEl.textContent = text;
  }

  async function loadSummary() {
    if (!orderId) {
      summary.innerHTML = '<p>No order found. <a href="/shop">Choose a design</a>.</p>';
      form.style.display = 'none';
      return;
    }

    const pending = sessionStorage.getItem('memonuvia_pending_item');
    if (pending) {
      try {
        const item = JSON.parse(pending);
        summary.innerHTML = `
          <div style="display:flex;gap:1rem;align-items:center">
            ${item.photo_url ? `<img src="${item.photo_url}" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:12px" />` : `<div style="width:72px;height:72px;border-radius:12px;background:linear-gradient(145deg,#ff8ec8,#880e4f)"></div>`}
            <div>
              <strong>${item.product_name}</strong>
              <div style="color:var(--muted)">${item.personalization_text || ''}</div>
              <div class="price">$${(Number(item.price) * Number(item.quantity || 1)).toFixed(2)}</div>
            </div>
          </div>`;
        return;
      } catch {
        /* fall through */
      }
    }

    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order not found');
      const item = (data.order.items || [])[0] || {};
      summary.innerHTML = `
        <div>
          <strong>${item.product_name || 'Personalized slate'}</strong>
          <div style="color:var(--muted)">${item.personalization_text || ''}</div>
          <div class="price">$${Number(data.order.total).toFixed(2)}</div>
        </div>`;
    } catch (err) {
      summary.innerHTML = `<p>${err.message}</p>`;
    }
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    if (!orderId) return showError('Missing order id');

    const payload = {
      order_id: orderId,
      customer_name: document.getElementById('customer_name').value.trim(),
      customer_email: document.getElementById('customer_email').value.trim(),
      shipping_address: {
        first_name: document.getElementById('customer_name').value.trim().split(' ')[0],
        last_name: document.getElementById('customer_name').value.trim().split(' ').slice(1).join(' ') || 'Customer',
        email: document.getElementById('customer_email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        address1: document.getElementById('address1').value.trim(),
        address2: document.getElementById('address2').value.trim(),
        city: document.getElementById('city').value.trim(),
        region: document.getElementById('region').value.trim(),
        zip: document.getElementById('zip').value.trim(),
        country: document.getElementById('country').value,
      },
    };

    const btn = document.getElementById('payBtn');
    btn.disabled = true;
    btn.textContent = 'Processing…';

    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');

      window.MemoCart?.clear();
      sessionStorage.removeItem('memonuvia_pending_item');

      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('No checkout URL returned');
    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      btn.textContent = 'Pay with card →';
    }
  });

  async function prefillFromProfile() {
    try {
      const res = await fetch('/api/account/profile', { credentials: 'same-origin' });
      if (!res.ok) return;
      const data = await res.json();
      const profile = data.profile;
      if (!profile) return;
      const addr = profile.shipping_address || {};
      const nameEl = document.getElementById('customer_name');
      const emailEl = document.getElementById('customer_email');
      if (nameEl && !nameEl.value && profile.full_name) nameEl.value = profile.full_name;
      if (emailEl && !emailEl.value && profile.email) emailEl.value = profile.email;
      const map = [
        ['address1', addr.address1],
        ['address2', addr.address2],
        ['city', addr.city],
        ['region', addr.region || addr.state],
        ['zip', addr.zip || addr.postal_code],
        ['phone', profile.phone || addr.phone],
        ['country', addr.country || profile.preferred_country],
      ];
      map.forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && val && !el.value) el.value = val;
      });
    } catch {
      /* guest checkout */
    }
  }

  loadSummary();
  prefillFromProfile();
})();
