const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const catalog = require('../data/catalog');
const config = require('../config');
const ordersService = require('../services/orders');
const printify = require('../services/printify');
const stripeService = require('../services/stripe');
const productsService = require('../services/products');
const profilesService = require('../services/profiles');
const {
  getAdminClient,
  isConfigured,
  hasSecretKey,
  checkConnection,
} = require('../services/supabase');
const { requireAdmin, requireAuth } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    return cb(null, true);
  },
});

router.get('/health', async (_req, res) => {
  const supabaseStatus = isConfigured() ? await checkConnection() : { ok: false, reason: 'not_configured' };
  res.json({
    ok: true,
    supabase: isConfigured(),
    supabaseSecret: hasSecretKey(),
    supabaseStatus,
    printify: printify.isConfigured(),
    stripe: stripeService.isConfigured(),
  });
});

router.get('/config/public', (_req, res) => {
  res.json({
    siteUrl: config.siteUrl,
    supabaseUrl: config.supabase.url || null,
    supabasePublishableKey: config.supabase.publishableKey || null,
    supabaseAnonKey: config.supabase.publishableKey || null,
    stripePublishableKey: config.stripe.publishableKey || null,
    currency: config.currency,
  });
});

router.get('/products', (req, res) => {
  const collection = req.query.collection || 'all';
  res.json({ products: catalog.getProductsByCollection(collection) });
});

router.get('/products/:slug', (req, res) => {
  const product = catalog.getProductBySlug(req.params.slug);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  return res.json({ product });
});

router.get('/collections', (_req, res) => {
  res.json({ collections: catalog.collections });
});

router.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const localUrl = `/uploads/${req.file.filename}`;
    let publicUrl = `${config.siteUrl}${localUrl}`;

    // Prefer Supabase Storage when configured
    const db = getAdminClient();
    if (db && isConfigured()) {
      const folder = req.user?.id || 'guest';
      const objectPath = `${folder}/${req.file.filename}`;
      const buffer = fs.readFileSync(req.file.path);
      const { error } = await db.storage
        .from('order-photos')
        .upload(objectPath, buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });
      if (!error) {
        const { data } = db.storage.from('order-photos').getPublicUrl(objectPath);
        if (data?.publicUrl) publicUrl = data.publicUrl;
      }
    }

    return res.json({
      url: publicUrl,
      localPath: localUrl,
      filename: req.file.filename,
    });
  } catch (err) {
    console.error('[upload]', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.product_slug) {
      return res.status(400).json({ error: 'product_slug is required' });
    }
    if (!body.personalization_text) {
      return res.status(400).json({ error: 'personalization_text is required' });
    }

    const order = await ordersService.createOrderDraft({
      ...body,
      user_id: req.user?.id || body.user_id || null,
      customer_email: body.customer_email || req.user?.email || null,
      customer_name:
        body.customer_name ||
        req.user?.user_metadata?.full_name ||
        req.user?.email ||
        null,
    });

    return res.status(201).json({ order });
  } catch (err) {
    console.error('[orders create]', err);
    return res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const order = await ordersService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const isOwner = req.user && order.user_id === req.user.id;
    const isAdmin = req.user?.role === 'admin';
    if (order.user_id && !isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.json({ order });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/account/profile', requireAuth, async (req, res) => {
  try {
    const profile = await profilesService.getProfile(req.user.id);
    return res.json({ profile });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/account/profile', requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const profile = await profilesService.upsertProfile(req.user.id, {
      email: req.user.email,
      full_name: body.full_name,
      phone: body.phone,
      shipping_address: body.shipping_address,
      billing_address: body.billing_address,
      preferences: body.preferences,
      preferred_currency: body.preferred_currency,
      preferred_country: body.preferred_country,
    });
    return res.json({ profile });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/account/orders', requireAuth, async (req, res) => {
  try {
    const orders = await ordersService.listOrders({ limit: 100, userId: req.user.id });
    return res.json({ orders });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/checkout/session', async (req, res) => {
  try {
    const { order_id, shipping_address, customer_email, customer_name } = req.body || {};
    if (!order_id) return res.status(400).json({ error: 'order_id is required' });

    let order = await ordersService.getOrderById(order_id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order = await ordersService.updateOrder(order_id, {
      shipping_address: shipping_address || order.shipping_address,
      customer_email: customer_email || order.customer_email,
      customer_name: customer_name || order.customer_name,
      user_id: order.user_id || req.user?.id || null,
    });

    // Persist address to profile for cross-device checkout
    if (req.user?.id && shipping_address) {
      try {
        await profilesService.saveShippingAddress(req.user.id, shipping_address, {
          email: customer_email || order.customer_email,
          full_name: customer_name || order.customer_name,
          phone: shipping_address.phone,
        });
      } catch (profileErr) {
        console.warn('[checkout] profile save:', profileErr.message);
      }
    }

    // Demo mode without Stripe: mark paid and fulfill locally
    if (!stripeService.isConfigured()) {
      const fulfilled = await ordersService.fulfillPaidOrder(order_id, {
        session_id: `demo_${order_id}`,
      });
      return res.json({
        demo: true,
        url: `${config.siteUrl}/order/success?order_id=${order_id}`,
        order: fulfilled,
      });
    }

    const session = await stripeService.createCheckoutSession({
      orderId: order_id,
      customerEmail: order.customer_email,
      successUrl: `${config.siteUrl}/order/success?order_id=${order_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${config.siteUrl}/checkout?order_id=${order_id}&canceled=1`,
      lineItems: (order.items || []).map((item) => ({
        name: item.product_name,
        description: item.personalization_text
          ? `Personalized: ${item.personalization_text}`
          : undefined,
        unit_amount: item.unit_price,
        quantity: item.quantity,
        currency: order.currency,
        image: item.photo_url || undefined,
      })),
    });

    await ordersService.updateOrder(order_id, {
      stripe_session_id: session.id,
      status: 'awaiting_payment',
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[checkout]', err);
    return res.status(500).json({ error: err.message });
  }
});

// Stripe webhook is mounted in server.js (raw body required)

router.get('/track', async (req, res) => {
  try {
    const orderNumber = String(req.query.order || '').trim();
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!orderNumber || !email) {
      return res.status(400).json({ error: 'order and email are required' });
    }

    const orders = await ordersService.listOrders({ limit: 200 });
    const order = orders.find(
      (o) =>
        o.order_number === orderNumber &&
        String(o.customer_email || '').toLowerCase() === email
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    return res.json({
      order: {
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
        printify_order_id: order.printify_order_id,
        created_at: order.created_at,
        items: (order.items || []).map((i) => ({
          product_name: i.product_name,
          personalization_text: i.personalization_text,
          quantity: i.quantity,
        })),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/admin/orders', requireAdmin, async (req, res) => {
  try {
    const orders = await ordersService.listOrders({
      limit: Number(req.query.limit) || 100,
      status: req.query.status,
    });
    return res.json({ orders });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/admin/printify/sync', requireAdmin, async (_req, res) => {
  try {
    const result = await productsService.syncFromPrintify();
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message, details: err.data });
  }
});

router.get('/admin/products', requireAdmin, async (_req, res) => {
  try {
    const products = await productsService.listDbProducts({ activeOnly: false });
    return res.json({ products });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const product = await productsService.updateProduct(req.params.id, req.body || {});
    return res.json({ product });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/admin/orders/:id/push-printify', requireAdmin, async (req, res) => {
  try {
    const order = await ordersService.fulfillPaidOrder(req.params.id);
    return res.json({ order });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/admin/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { fulfillment_status, status } = req.body || {};
    let order;
    if (fulfillment_status) {
      order = await ordersService.updateFulfillmentStatus(req.params.id, fulfillment_status);
    } else if (status) {
      order = await ordersService.updateOrder(req.params.id, { status });
    } else {
      return res.status(400).json({ error: 'fulfillment_status or status required' });
    }
    return res.json({ order });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/admin/fulfillment/retry', requireAdmin, async (_req, res) => {
  try {
    const results = await ordersService.processPendingFulfillmentJobs(10);
    return res.json({ results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** High-res photo download for admin print review */
router.get('/admin/orders/:orderId/items/:itemId/photo', requireAdmin, async (req, res) => {
  try {
    const order = await ordersService.getOrderById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const item = (order.items || []).find((i) => i.id === req.params.itemId);
    if (!item?.photo_url) return res.status(404).json({ error: 'Photo not found' });

    const filename =
      item.photo_original_name ||
      `memonuvia-${order.order_number}-${item.id}.jpg`;

    // Redirect to signed/public URL with download hint when remote
    if (item.photo_url.startsWith('http')) {
      const upstream = await fetch(item.photo_url);
      if (!upstream.ok) {
        return res.redirect(item.photo_url);
      }
      const contentType = upstream.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
      return res.send(buffer);
    }

    const localPath = path.join(
      __dirname,
      '..',
      item.photo_url.replace(/^\//, '')
    );
    return res.download(localPath, filename);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
