const Stripe = require('stripe');
const config = require('../config');

let stripe = null;

function getStripe() {
  if (!config.stripe.secretKey) return null;
  if (!stripe) {
    stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: '2024-11-20.acacia',
    });
  }
  return stripe;
}

function isConfigured() {
  return Boolean(config.stripe.secretKey);
}

async function createCheckoutSession({
  orderId,
  lineItems,
  customerEmail,
  successUrl,
  cancelUrl,
  metadata = {},
}) {
  const client = getStripe();
  if (!client) {
    const err = new Error('Stripe is not configured');
    err.code = 'STRIPE_NOT_CONFIGURED';
    throw err;
  }

  return client.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: customerEmail,
    line_items: lineItems.map((item) => ({
      quantity: item.quantity || 1,
      price_data: {
        currency: (item.currency || 'usd').toLowerCase(),
        unit_amount: Math.round(Number(item.unit_amount) * 100),
        product_data: {
          name: item.name,
          description: item.description || undefined,
          images: item.image ? [item.image] : undefined,
        },
      },
    })),
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      order_id: orderId,
      ...metadata,
    },
  });
}

function constructWebhookEvent(rawBody, signature) {
  const client = getStripe();
  if (!client || !config.stripe.webhookSecret) {
    const err = new Error('Stripe webhook is not configured');
    err.code = 'STRIPE_WEBHOOK_NOT_CONFIGURED';
    throw err;
  }
  return client.webhooks.constructEvent(
    rawBody,
    signature,
    config.stripe.webhookSecret
  );
}

module.exports = {
  getStripe,
  isConfigured,
  createCheckoutSession,
  constructWebhookEvent,
  publishableKey: config.stripe.publishableKey,
};
