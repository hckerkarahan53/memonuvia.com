const { v4: uuidv4 } = require('uuid');
const { getAdminClient, isConfigured } = require('./supabase');
const printify = require('./printify');
const catalog = require('../data/catalog');

function generateOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MN-${stamp}-${rand}`;
}

const memoryStore = {
  orders: new Map(),
  jobs: new Map(),
  webhooks: new Set(),
};

function resolveProduct(slugOrId) {
  return catalog.getProductBySlug(slugOrId);
}

function normalizeLineItem(raw) {
  const product = resolveProduct(raw.product_slug || raw.product_id);
  if (!product) {
    const err = new Error(`Product not found: ${raw.product_slug || raw.product_id}`);
    err.status = 404;
    throw err;
  }
  const quantity = Number(raw.quantity) || 1;
  const unitPrice = Number(raw.unit_price != null ? raw.unit_price : product.price);
  return {
    id: uuidv4(),
    product_id: product.id,
    product_slug: product.slug,
    product_name: product.name,
    quantity,
    unit_price: unitPrice,
    size: raw.size || product.sizes?.[0] || null,
    shape: raw.shape || product.shapes?.[0] || null,
    personalization_text: raw.personalization_text || raw.custom_text || '',
    photo_url: raw.photo_url || null,
    photo_original_name: raw.photo_original_name || null,
    photo_storage_path: raw.photo_storage_path || null,
    font_family: raw.font_family || 'script',
    personalization_meta: raw.personalization_meta || {},
    printify_product_id: raw.printify_product_id || product.printify_product_id,
    printify_variant_id: raw.printify_variant_id || product.printify_variant_id,
  };
}

async function createOrderDraft(payload) {
  const orderId = uuidv4();
  const orderNumber = generateOrderNumber();
  const now = new Date().toISOString();

  const lineInputs = Array.isArray(payload.items) && payload.items.length
    ? payload.items
    : [
        {
          product_slug: payload.product_slug,
          quantity: payload.quantity,
          size: payload.size,
          shape: payload.shape,
          personalization_text: payload.personalization_text,
          photo_url: payload.photo_url,
          photo_original_name: payload.photo_original_name,
          photo_storage_path: payload.photo_storage_path,
          font_family: payload.font_family,
          personalization_meta: payload.personalization_meta,
        },
      ];

  const items = lineInputs.map(normalizeLineItem);
  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const shippingCost = Number(payload.shipping_cost) || 0;
  const total = subtotal + shippingCost;

  const order = {
    id: orderId,
    order_number: orderNumber,
    user_id: payload.user_id || null,
    status: 'pending_payment',
    fulfillment_status: 'pending',
    payment_status: 'unpaid',
    currency: items[0]?.currency || payload.currency || 'USD',
    subtotal,
    shipping_cost: shippingCost,
    total,
    customer_email: payload.customer_email || null,
    customer_name: payload.customer_name || null,
    shipping_address: payload.shipping_address || null,
    items,
    printify_order_id: null,
    printify_status: null,
    printify_last_error: null,
    printify_attempts: 0,
    stripe_session_id: null,
    stripe_payment_intent: null,
    notes: payload.notes || null,
    created_at: now,
    updated_at: now,
  };

  const db = getAdminClient();
  if (db && isConfigured()) {
    const orderRow = {
      id: order.id,
      order_number: order.order_number,
      user_id: order.user_id,
      status: order.status,
      payment_status: order.payment_status,
      currency: order.currency,
      subtotal: order.subtotal,
      shipping_cost: order.shipping_cost,
      total: order.total,
      customer_email: order.customer_email,
      customer_name: order.customer_name,
      shipping_address: order.shipping_address,
      notes: order.notes,
    };

    let { error: orderErr } = await db.from('orders').insert({
      ...orderRow,
      fulfillment_status: order.fulfillment_status,
    });

    // Backward compatible until platform_hardening migration is applied
    if (orderErr && /fulfillment_status|schema cache/i.test(orderErr.message || '')) {
      ({ error: orderErr } = await db.from('orders').insert(orderRow));
    }
    if (orderErr) throw orderErr;

    const itemRowsFull = order.items.map((item) => ({
      id: item.id,
      order_id: order.id,
      product_id: item.product_id,
      product_slug: item.product_slug,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      size: item.size,
      shape: item.shape,
      personalization_text: item.personalization_text,
      photo_url: item.photo_url,
      photo_original_name: item.photo_original_name,
      photo_storage_path: item.photo_storage_path,
      font_family: item.font_family,
      personalization_meta: item.personalization_meta,
      printify_product_id: item.printify_product_id,
      printify_variant_id: item.printify_variant_id,
    }));

    let { error: itemsErr } = await db.from('order_items').insert(itemRowsFull);
    if (itemsErr && /font_family|photo_original_name|personalization_meta|schema cache/i.test(itemsErr.message || '')) {
      ({ error: itemsErr } = await db.from('order_items').insert(
        order.items.map((item) => ({
          id: item.id,
          order_id: order.id,
          product_id: item.product_id,
          product_slug: item.product_slug,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          size: item.size,
          shape: item.shape,
          personalization_text: item.personalization_text,
          photo_url: item.photo_url,
          printify_product_id: item.printify_product_id,
          printify_variant_id: item.printify_variant_id,
        }))
      ));
    }
    if (itemsErr) throw itemsErr;

    const personalizationRows = order.items.map((item) => ({
      order_item_id: item.id,
      order_id: order.id,
      photo_url: item.photo_url,
      photo_storage_path: item.photo_storage_path,
      photo_original_name: item.photo_original_name,
      custom_text: item.personalization_text,
      font_family: item.font_family,
      meta: item.personalization_meta || {},
    }));
    const { error: persErr } = await db.from('personalizations').insert(personalizationRows);
    if (persErr) {
      console.warn('[orders] personalizations insert skipped:', persErr.message);
    }
  } else {
    memoryStore.orders.set(order.id, order);
  }

  return order;
}

async function getOrderById(orderId) {
  const db = getAdminClient();
  if (db && isConfigured()) {
    const { data: order, error } = await db
      .from('orders')
      .select('*, order_items(*), personalizations(*)')
      .eq('id', orderId)
      .maybeSingle();
    if (error) {
      // Fallback without personalizations relation if migration not applied
      const { data: fallback, error: err2 } = await db
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .maybeSingle();
      if (err2) throw err2;
      if (!fallback) return null;
      return { ...fallback, items: fallback.order_items || [], personalizations: [] };
    }
    if (!order) return null;
    return {
      ...order,
      items: order.order_items || [],
      personalizations: order.personalizations || [],
    };
  }
  return memoryStore.orders.get(orderId) || null;
}

async function updateOrder(orderId, patch) {
  const updatedAt = new Date().toISOString();
  const db = getAdminClient();
  if (db && isConfigured()) {
    const { data, error } = await db
      .from('orders')
      .update({ ...patch, updated_at: updatedAt })
      .eq('id', orderId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  const existing = memoryStore.orders.get(orderId);
  if (!existing) return null;
  const next = { ...existing, ...patch, updated_at: updatedAt };
  memoryStore.orders.set(orderId, next);
  return next;
}

async function listOrders({ limit = 50, status, userId } = {}) {
  const db = getAdminClient();
  if (db && isConfigured()) {
    let query = db
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (status) query = query.eq('status', status);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((o) => ({ ...o, items: o.order_items || [] }));
  }

  let orders = Array.from(memoryStore.orders.values());
  if (status) orders = orders.filter((o) => o.status === status);
  if (userId) orders = orders.filter((o) => o.user_id === userId);
  return orders
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

async function recordWebhookEvent(id, source, eventType, payload) {
  if (!id) return { duplicate: false };
  const db = getAdminClient();
  if (db && isConfigured()) {
    const { error } = await db.from('webhook_events').insert({
      id,
      source,
      event_type: eventType,
      payload,
    });
    if (error) {
      if (error.code === '23505') return { duplicate: true };
      // Table may not exist yet
      if (String(error.message || '').includes('does not exist')) {
        if (memoryStore.webhooks.has(id)) return { duplicate: true };
        memoryStore.webhooks.add(id);
        return { duplicate: false };
      }
      throw error;
    }
    return { duplicate: false };
  }
  if (memoryStore.webhooks.has(id)) return { duplicate: true };
  memoryStore.webhooks.add(id);
  return { duplicate: false };
}

async function enqueueFulfillmentJob(orderId, jobType = 'printify_push') {
  const job = {
    id: uuidv4(),
    order_id: orderId,
    job_type: jobType,
    status: 'pending',
    attempts: 0,
    max_attempts: 5,
    last_error: null,
    next_run_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const db = getAdminClient();
  if (db && isConfigured()) {
    const { data, error } = await db
      .from('fulfillment_jobs')
      .insert(job)
      .select('*')
      .maybeSingle();
    if (error && !String(error.message || '').includes('does not exist')) {
      console.warn('[orders] enqueue job:', error.message);
      memoryStore.jobs.set(job.id, job);
      return job;
    }
    return data || job;
  }
  memoryStore.jobs.set(job.id, job);
  return job;
}

async function pushOrderToPrintify(order) {
  if (!printify.isConfigured()) {
    return { printifyOrderId: null, error: 'Printify not configured' };
  }

  const shipping = order.shipping_address || {};
  const nameParts = String(order.customer_name || shipping.name || 'Customer').split(' ');
  const firstName = shipping.first_name || nameParts[0] || 'Customer';
  const lastName = shipping.last_name || nameParts.slice(1).join(' ') || 'MemoNuvia';

  const lineItems = (order.items || [])
    .filter((i) => i.printify_product_id && i.printify_variant_id)
    .map((i) => ({
      printify_product_id: Number(i.printify_product_id),
      printify_variant_id: Number(i.printify_variant_id),
      quantity: i.quantity,
      print_areas: i.photo_url ? { front: i.photo_url } : undefined,
    }));

  if (!lineItems.length) {
    return {
      printifyOrderId: null,
      error: 'Printify product/variant IDs missing — order saved locally only',
    };
  }

  const payload = printify.buildOrderPayload({
    externalId: order.order_number,
    shipping: {
      first_name: firstName,
      last_name: lastName,
      email: order.customer_email || shipping.email,
      phone: shipping.phone || '',
      country: shipping.country || 'US',
      region: shipping.region || shipping.state || '',
      address1: shipping.address1 || shipping.line1 || '',
      address2: shipping.address2 || shipping.line2 || '',
      city: shipping.city || '',
      zip: shipping.zip || shipping.postal_code || '',
    },
    lineItems,
    metadata: {
      personalization: (order.items || []).map((i) => ({
        product: i.product_name,
        text: i.personalization_text,
        photo: i.photo_url,
        font: i.font_family,
        size: i.size,
      })),
    },
  });

  const created = await printify.createOrder(payload);
  const printifyOrderId = created?.id || created?.order_id || null;

  if (printifyOrderId) {
    try {
      await printify.submitOrder(printifyOrderId);
    } catch (submitErr) {
      console.warn('[printify] submit deferred:', submitErr.message);
    }
  }

  return { printifyOrderId, error: null, raw: created };
}

/**
 * After successful Stripe payment: mark paid, push to Printify, queue retry on failure.
 */
async function fulfillPaidOrder(orderId, stripeMeta = {}) {
  const order = await getOrderById(orderId);
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }

  if (order.payment_status === 'paid' && order.printify_order_id) {
    return order;
  }

  try {
    await updateOrder(orderId, {
      payment_status: 'paid',
      status: 'processing',
      fulfillment_status: 'processing',
      paid_at: order.paid_at || new Date().toISOString(),
      stripe_session_id: stripeMeta.session_id || order.stripe_session_id,
      stripe_payment_intent: stripeMeta.payment_intent || order.stripe_payment_intent,
    });
  } catch (err) {
    if (!/fulfillment_status|paid_at|schema cache/i.test(err.message || '')) throw err;
    await updateOrder(orderId, {
      payment_status: 'paid',
      status: 'processing',
      stripe_session_id: stripeMeta.session_id || order.stripe_session_id,
      stripe_payment_intent: stripeMeta.payment_intent || order.stripe_payment_intent,
    });
  }

  const refreshed = await getOrderById(orderId);
  const attempts = Number(refreshed.printify_attempts || 0) + 1;

  let printifyOrderId = null;
  let printifyError = null;

  try {
    const result = await pushOrderToPrintify(refreshed);
    printifyOrderId = result.printifyOrderId;
    printifyError = result.error;
  } catch (err) {
    printifyError = err.message;
    console.error('[printify] create order failed:', err);
  }

  const patch = {
    printify_order_id: printifyOrderId || refreshed.printify_order_id,
    status: printifyOrderId ? 'sent_to_printify' : 'paid_awaiting_printify',
    notes: printifyError
      ? `${refreshed.notes || ''}\n[Printify] ${printifyError}`.trim()
      : refreshed.notes,
  };

  let updated;
  try {
    updated = await updateOrder(orderId, {
      ...patch,
      printify_attempts: attempts,
      printify_last_error: printifyError,
      printify_status: printifyOrderId ? 'submitted' : 'error',
      fulfillment_status: printifyOrderId ? 'processing' : 'pending',
    });
  } catch (err) {
    if (!/printify_|fulfillment_status|schema cache/i.test(err.message || '')) throw err;
    updated = await updateOrder(orderId, patch);
  }

  if (!printifyOrderId) {
    await enqueueFulfillmentJob(orderId, 'printify_push');
  }

  return updated;
}

async function processPendingFulfillmentJobs(limit = 10) {
  const db = getAdminClient();
  let jobs = [];

  if (db && isConfigured()) {
    const { data, error } = await db
      .from('fulfillment_jobs')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lte('next_run_at', new Date().toISOString())
      .order('next_run_at', { ascending: true })
      .limit(limit);
    if (error && !String(error.message || '').includes('does not exist')) {
      console.warn('[fulfillment] list jobs:', error.message);
    } else {
      jobs = data || [];
    }
  } else {
    jobs = Array.from(memoryStore.jobs.values())
      .filter((j) => j.status === 'pending' || j.status === 'failed')
      .slice(0, limit);
  }

  const results = [];
  for (const job of jobs) {
    if (job.attempts >= job.max_attempts) {
      await markJob(job.id, { status: 'dead', last_error: 'Max attempts reached' });
      continue;
    }

    await markJob(job.id, {
      status: 'running',
      attempts: Number(job.attempts || 0) + 1,
    });

    try {
      const order = await fulfillPaidOrder(job.order_id);
      if (order?.printify_order_id) {
        await markJob(job.id, { status: 'succeeded', last_error: null });
        results.push({ jobId: job.id, ok: true });
      } else {
        const delayMin = Math.min(60, 2 ** Number(job.attempts || 1));
        await markJob(job.id, {
          status: 'failed',
          last_error: order?.printify_last_error || 'Printify push incomplete',
          next_run_at: new Date(Date.now() + delayMin * 60 * 1000).toISOString(),
        });
        results.push({ jobId: job.id, ok: false });
      }
    } catch (err) {
      const delayMin = Math.min(60, 2 ** Number(job.attempts || 1));
      await markJob(job.id, {
        status: 'failed',
        last_error: err.message,
        next_run_at: new Date(Date.now() + delayMin * 60 * 1000).toISOString(),
      });
      results.push({ jobId: job.id, ok: false, error: err.message });
    }
  }
  return results;
}

async function markJob(jobId, patch) {
  const db = getAdminClient();
  if (db && isConfigured()) {
    const { error } = await db
      .from('fulfillment_jobs')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', jobId);
    if (!error) return;
  }
  const existing = memoryStore.jobs.get(jobId);
  if (existing) {
    memoryStore.jobs.set(jobId, { ...existing, ...patch, updated_at: new Date().toISOString() });
  }
}

async function updateFulfillmentStatus(orderId, fulfillmentStatus) {
  const patch = { fulfillment_status: fulfillmentStatus };
  if (fulfillmentStatus === 'shipped') {
    patch.status = 'shipped';
    patch.shipped_at = new Date().toISOString();
  }
  if (fulfillmentStatus === 'delivered') {
    patch.status = 'delivered';
    patch.delivered_at = new Date().toISOString();
  }
  if (fulfillmentStatus === 'processing') {
    patch.status = 'processing';
  }
  return updateOrder(orderId, patch);
}

module.exports = {
  createOrderDraft,
  getOrderById,
  updateOrder,
  listOrders,
  fulfillPaidOrder,
  recordWebhookEvent,
  enqueueFulfillmentJob,
  processPendingFulfillmentJobs,
  updateFulfillmentStatus,
  memoryStore,
};
