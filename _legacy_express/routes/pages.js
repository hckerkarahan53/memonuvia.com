const express = require('express');
const catalog = require('../data/catalog');
const config = require('../config');
const { requireAdmin, requireAuth } = require('../middleware/auth');
const ordersService = require('../services/orders');
const { isConfigured: supabaseConfigured } = require('../services/supabase');
const adminController = require('../controllers/adminController');
const profilesService = require('../services/profiles');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('pages/home', {
    title: 'MemoNuvia — Personalized Photo Slates',
    products: catalog.getShowcaseProducts().slice(0, 6),
    collections: catalog.collections,
    giftOccasions: catalog.giftOccasions,
    faqs: catalog.faqs,
  });
});

router.get('/shop', (req, res) => {
  const collection = req.query.collection || 'all';
  const products = catalog.getProductsByCollection(collection);
  res.render('pages/shop', {
    title: 'Shop — MemoNuvia',
    products,
    collections: catalog.collections,
    activeCollection: collection,
  });
});

router.get('/collections/:slug', (req, res) => {
  const collection = catalog.collections.find((c) => c.slug === req.params.slug);
  if (!collection) {
    return res.status(404).render('pages/error', {
      title: 'Not Found',
      message: 'Collection not found.',
      status: 404,
    });
  }
  const products = catalog.getProductsByCollection(collection.id);
  return res.render('pages/shop', {
    title: `${collection.name} — MemoNuvia`,
    products,
    collections: catalog.collections,
    activeCollection: collection.id,
    collection,
  });
});

router.get('/product/:slug', (req, res) => {
  const product = catalog.getProductBySlug(req.params.slug);
  if (!product) {
    return res.status(404).render('pages/error', {
      title: 'Not Found',
      message: 'Product not found.',
      status: 404,
    });
  }
  return res.render('pages/product', {
    title: `${product.name} — MemoNuvia`,
    product,
  });
});

router.get('/personalize/:slug', (req, res) => {
  const product = catalog.getProductBySlug(req.params.slug);
  if (!product) {
    return res.status(404).render('pages/error', {
      title: 'Not Found',
      message: 'Product not found.',
      status: 404,
    });
  }
  return res.render('pages/personalize', {
    title: `Personalize ${product.name} — MemoNuvia`,
    product,
    supabaseConfigured: supabaseConfigured(),
    supabaseUrl: config.supabase.url,
    supabaseAnonKey: config.supabase.anonKey,
  });
});

router.get('/how-it-works', (req, res) => {
  res.render('pages/how-it-works', {
    title: 'How It Works — MemoNuvia',
  });
});

router.get('/track', (req, res) => {
  res.render('pages/track', {
    title: 'Track Your Order — MemoNuvia',
    order: null,
    query: req.query.order || '',
  });
});

router.get('/cart', (req, res) => {
  res.render('pages/cart', {
    title: 'Cart — MemoNuvia',
  });
});

router.get('/checkout', (req, res) => {
  res.render('pages/checkout', {
    title: 'Checkout — MemoNuvia',
    stripePublishableKey: config.stripe.publishableKey,
    supabaseUrl: config.supabase.url,
    supabaseAnonKey: config.supabase.anonKey,
  });
});

router.get('/auth', (req, res) => {
  res.render('pages/auth', {
    title: 'Sign In — MemoNuvia',
    next: req.query.next || '/',
    supabaseUrl: config.supabase.url,
    supabaseAnonKey: config.supabase.anonKey,
  });
});

router.get('/auth/callback', (req, res) => {
  res.render('pages/auth-callback', {
    title: 'Signing you in…',
    supabaseUrl: config.supabase.url,
    supabaseAnonKey: config.supabase.anonKey,
  });
});

router.get('/order/success', async (req, res) => {
  const orderId = req.query.order_id;
  let order = null;
  if (orderId) {
    try {
      order = await ordersService.getOrderById(orderId);
    } catch (err) {
      console.warn('[order/success]', err.message);
    }
  }
  res.render('pages/order-success', {
    title: 'Order Confirmed — MemoNuvia',
    order,
  });
});

router.get('/contact', (req, res) => {
  res.render('pages/legal', {
    title: 'Contact — MemoNuvia',
    heading: 'Contact',
    body: 'Reach us at hello@memonuvia.com. We typically reply within one business day.',
  });
});

router.get('/about', (req, res) => {
  res.render('pages/legal', {
    title: 'About Us — MemoNuvia',
    heading: 'About Us',
    body: 'MemoNuvia turns favorite photos into personalized natural slate keepsakes — made with your photo and names, fulfilled through Printify.',
  });
});

router.get('/shipping', (req, res) => {
  res.render('pages/legal', {
    title: 'Shipping & Returns — MemoNuvia',
    heading: 'Shipping & Returns',
    body: 'Orders are produced after payment confirmation. Production usually takes 2–5 business days. Damaged items are replaced when reported with photos within 7 days of delivery.',
  });
});

router.get('/privacy', (req, res) => {
  res.render('pages/legal', {
    title: 'Privacy Policy — MemoNuvia',
    heading: 'Privacy Policy',
    body: 'We store account, order, shipping, and personalization data securely in Supabase. Payment card details are handled by Stripe and never stored on our servers.',
  });
});

router.get('/terms', (req, res) => {
  res.render('pages/legal', {
    title: 'Terms & Conditions — MemoNuvia',
    heading: 'Terms & Conditions',
    body: 'By placing an order you confirm that you own the rights to uploaded photos and agree to personalized production. Custom items may not be returnable unless defective or damaged in transit.',
  });
});

router.get('/account', requireAuth, async (req, res) => {
  let profile = null;
  let orders = [];
  try {
    profile = await profilesService.getProfile(req.user.id);
    orders = await ordersService.listOrders({ limit: 50, userId: req.user.id });
  } catch (err) {
    console.warn('[account]', err.message);
  }
  res.render('pages/account', {
    title: 'My Account — MemoNuvia',
    profile,
    orders,
    supabaseUrl: config.supabase.url,
    supabaseAnonKey: config.supabase.anonKey,
  });
});

router.get('/admin', requireAdmin, adminController.dashboard);
router.get('/admin/orders', requireAdmin, adminController.dashboard);
router.get('/admin/orders/:id', requireAdmin, adminController.orderDetail);
router.get('/admin/products', requireAdmin, adminController.productsPage);

module.exports = router;
