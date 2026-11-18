(function () {
  const form = document.getElementById('trackForm');
  const result = document.getElementById('trackResult');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const order = document.getElementById('order').value.trim();
    const email = document.getElementById('email').value.trim();
    result.style.display = 'block';
    result.innerHTML = '<p>Looking up…</p>';

    try {
      const res = await fetch(`/api/track?order=${encodeURIComponent(order)}&email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Not found');
      const o = data.order;
      result.innerHTML = `
        <p><strong>${o.order_number}</strong></p>
        <p>Status: ${o.status}</p>
        <p>Payment: ${o.payment_status}</p>
        <p>Printify: ${o.printify_order_id || 'Pending production sync'}</p>
        <p>Placed: ${new Date(o.created_at).toLocaleString()}</p>
      `;
    } catch (err) {
      result.innerHTML = `<p style="color:#9b2c2c">${err.message}</p>`;
    }
  });
})();
