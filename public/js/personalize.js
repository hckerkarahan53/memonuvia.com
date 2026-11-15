(function () {
  const form = document.getElementById('personalizeForm');
  const photoInput = document.getElementById('photoInput');
  const textInput = document.getElementById('personalizationText');
  const previewPhoto = document.getElementById('previewPhoto');
  const previewPlaceholder = document.getElementById('previewPlaceholder');
  const previewText = document.getElementById('previewText');
  const uploadStatus = document.getElementById('uploadStatus');
  const formError = document.getElementById('formError');
  let uploadedUrl = null;

  textInput?.addEventListener('input', () => {
    if (previewText) previewText.textContent = textInput.value || 'Your text';
  });

  photoInput?.addEventListener('change', async () => {
    const file = photoInput.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    if (previewPhoto) {
      previewPhoto.src = localPreview;
      previewPhoto.style.display = 'block';
    }
    if (previewPlaceholder) previewPlaceholder.style.display = 'none';
    uploadStatus.textContent = 'Uploading…';

    const body = new FormData();
    body.append('photo', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      uploadedUrl = data.url;
      uploadStatus.textContent = 'Photo ready';
    } catch (err) {
      uploadStatus.textContent = err.message;
      uploadedUrl = null;
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.style.display = 'none';

    const personalizationText = textInput.value.trim();
    if (!personalizationText) {
      formError.textContent = 'Please add personalization text.';
      formError.style.display = 'block';
      return;
    }

    const quantity = Number(document.getElementById('qty').value) || 1;
    const size = document.getElementById('sizeSelect').value;
    const meta = window.__PERSONALIZE__ || {};

    const cartItem = {
      product_slug: meta.productSlug,
      product_name: meta.productName,
      price: meta.price,
      quantity,
      size,
      personalization_text: personalizationText,
      photo_url: uploadedUrl,
      theme: meta.theme,
    };

    window.MemoCart?.add(cartItem);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cartItem),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create order');
      sessionStorage.setItem('memonuvia_order_id', data.order.id);
      sessionStorage.setItem('memonuvia_pending_item', JSON.stringify(cartItem));
      window.location.href = `/checkout?order_id=${encodeURIComponent(data.order.id)}`;
    } catch (err) {
      formError.textContent = err.message;
      formError.style.display = 'block';
    }
  });
})();
