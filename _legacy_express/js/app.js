(function () {
  const CART_KEY = 'memonuvia_cart';

  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function writeCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartCount();
  }

  function updateCartCount() {
    const el = document.getElementById('cartCount');
    if (!el) return;
    const count = readCart().reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
    el.textContent = String(count);
  }

  window.MemoCart = {
    read: readCart,
    write: writeCart,
    add(item) {
      const cart = readCart();
      cart.push({ ...item, id: item.id || `c_${Date.now()}` });
      writeCart(cart);
      return cart;
    },
    clear() {
      writeCart([]);
    },
  };

  const menuToggle = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  menuToggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  document.getElementById('searchToggle')?.addEventListener('click', () => {
    window.location.href = '/shop';
  });

  const localeSelect = document.getElementById('localeSelect');
  if (localeSelect) {
    localeSelect.value = localStorage.getItem('memonuvia_locale') || 'US-USD';
    localeSelect.addEventListener('change', () => {
      localStorage.setItem('memonuvia_locale', localeSelect.value);
    });
  }

  const filterButtons = document.querySelectorAll(
    '.design-filter[data-filter], .filter-chip[data-filter]'
  );
  filterButtons.forEach((chip) => {
    chip.addEventListener('click', () => {
      const group = chip.classList.contains('design-filter')
        ? document.querySelectorAll('.design-filter[data-filter]')
        : document.querySelectorAll('.filter-chip[data-filter]');
      group.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.getAttribute('data-filter');
      document
        .querySelectorAll('#homeProductGrid .design-card, #homeProductGrid .product-card')
        .forEach((card) => {
          const collection = card.getAttribute('data-collection');
          card.style.display = filter === 'all' || collection === filter ? '' : 'none';
        });
    });
  });

  const faqAccordion = document.getElementById('faqAccordion');
  if (faqAccordion) {
    faqAccordion.querySelectorAll('details.faq-pill').forEach((item) => {
      item.addEventListener('toggle', () => {
        if (!item.open) return;
        faqAccordion.querySelectorAll('details.faq-pill').forEach((other) => {
          if (other !== item) other.open = false;
        });
      });
    });
  }

  updateCartCount();
})();
