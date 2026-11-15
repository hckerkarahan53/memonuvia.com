const config = require('../config');
const ordersService = require('../services/orders');
const productsService = require('../services/products');
const printify = require('../services/printify');
const stripeService = require('../services/stripe');
const { isConfigured: supabaseConfigured } = require('../services/supabase');

async function dashboard(req, res) {
  let orders = [];
  try {
    orders = await ordersService.listOrders({ limit: 100 });
  } catch (err) {
    console.error('[admin dashboard]', err);
  }
  res.render('admin/dashboard', {
    title: 'Admin — MemoNuvia',
    orders,
    printifyReady: printify.isConfigured(),
    stripeReady: stripeService.isConfigured(),
    supabaseReady: supabaseConfigured(),
    supabaseUrl: config.supabase.url,
    publishableKey: config.supabase.publishableKey,
  });
}

async function orderDetail(req, res) {
  const order = await ordersService.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).render('pages/error', {
      title: 'Not Found',
      message: 'Order not found.',
      status: 404,
    });
  }
  return res.render('admin/order-detail', {
    title: `Order ${order.order_number}`,
    order,
  });
}

async function productsPage(req, res) {
  let products = [];
  let syncError = null;
  try {
    products = await productsService.listDbProducts({ activeOnly: false });
  } catch (err) {
    syncError = err.message;
  }
  res.render('admin/products', {
    title: 'Products — Admin',
    products,
    syncError,
    printifyReady: printify.isConfigured(),
    supabaseReady: supabaseConfigured(),
  });
}

module.exports = {
  dashboard,
  orderDetail,
  productsPage,
};
