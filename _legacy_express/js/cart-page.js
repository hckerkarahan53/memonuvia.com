(function () {
  const panel = document.getElementById('cartPanel');
  if (!panel) return;

  function render() {
    const items = window.MemoCart?.read() || [];
    if (!items.length) {
      panel.innerHTML = '<p>Your cart is empty. <a href="/shop">Browse designs</a>.</p>';
      return;
    }

    const total = items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity || 1), 0);
    panel.innerHTML = `
      ${items
        .map(
          (item, idx) => `
        <div style="display:flex;gap:1rem;align-items:center;padding:0.75rem 0;border-bottom:1px solid var(--line)">
          ${item.photo_url ? `<img src="${item.photo_url}" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:12px" />` : `<div style="width:72px;height:72px;border-radius:12px;background:linear-gradient(145deg,#ce93d8,#4a1525)"></div>`}
          <div style="flex:1">
            <strong>${item.product_name}</strong>
            <div style="color:var(--muted)">${item.personalization_text || ''}</div>
            <div>Qty ${item.quantity || 1} · $${Number(item.price).toFixed(2)}</div>
          </div>
          <button class="btn btn-ghost btn-sm" data-remove="${idx}" type="button">Remove</button>
        </div>`
        )
        .join('')}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1rem">
        <strong class="price">Total $${total.toFixed(2)}</strong>
        <a class="btn btn-primary" href="/shop">Continue shopping</a>
      </div>
      <p style="color:var(--muted);font-size:0.9rem;margin-top:0.75rem">Personalize a design to create a checkout-ready order.</p>
    `;

    panel.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cart = window.MemoCart.read();
        cart.splice(Number(btn.getAttribute('data-remove')), 1);
        window.MemoCart.write(cart);
        render();
      });
    });
  }

  render();
})();
