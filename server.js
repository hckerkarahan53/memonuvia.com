const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { attachUser } = require('./middleware/auth');
const pageRoutes = require('./routes/pages');
const apiRoutes = require('./routes/api');
const stripeService = require('./services/stripe');
const ordersService = require('./services/orders');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors({ origin: true, credentials: true }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(cookieParser());

// Stripe webhook needs raw body — mount before json parser
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      if (!stripeService.isConfigured()) {
        return res.status(400).send('Stripe not configured');
      }
      const signature = req.headers['stripe-signature'];
      const event = stripeService.constructWebhookEvent(req.body, signature);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = session.metadata?.order_id;
        const { duplicate } = await ordersService.recordWebhookEvent(
          event.id,
          'stripe',
          event.type,
          { order_id: orderId, session_id: session.id }
        );
        if (!duplicate && orderId) {
          await ordersService.fulfillPaidOrder(orderId, {
            session_id: session.id,
            payment_intent: session.payment_intent,
          });
        }
      }
      return res.json({ received: true });
    } catch (err) {
      console.error('[stripe webhook]', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(attachUser);

app.locals.siteName = 'MemoNuvia';
app.locals.siteUrl = config.siteUrl;
app.locals.year = new Date().getFullYear();

app.use('/api', apiRoutes);
app.use('/', pageRoutes);

app.use((req, res) => {
  res.status(404).render('pages/error', {
    title: 'Not Found',
    message: 'The page you are looking for does not exist.',
    status: 404,
  });
});

app.use((err, req, res, _next) => {
  console.error('[error]', err);
  const status = err.status || 500;
  if (req.path.startsWith('/api/')) {
    return res.status(status).json({ error: err.message || 'Server error' });
  }
  return res.status(status).render('pages/error', {
    title: 'Something went wrong',
    message: err.message || 'Unexpected server error.',
    status,
  });
});

// Local / traditional hosting only — Vercel uses the exported app
if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`MemoNuvia running at ${config.siteUrl} (port ${config.port})`);
    console.log(
      `Integrations — Supabase: ${Boolean(config.supabase.url)} | Printify: ${Boolean(
        config.printify.apiKey && config.printify.shopId
      )} | Stripe: ${Boolean(config.stripe.secretKey)}`
    );

    // Background Printify retry worker (every 2 minutes)
    const RETRY_MS = 2 * 60 * 1000;
    setInterval(() => {
      ordersService.processPendingFulfillmentJobs(5).catch((err) => {
        console.warn('[fulfillment worker]', err.message);
      });
    }, RETRY_MS);
  });
}

module.exports = app;
