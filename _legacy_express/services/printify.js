const config = require('../config');

class PrintifyService {
  constructor() {
    this.apiKey = config.printify.apiKey;
    this.shopId = config.printify.shopId;
    this.baseUrl = config.printify.baseUrl;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.shopId);
  }

  async request(path, options = {}) {
    if (!this.isConfigured()) {
      const err = new Error('Printify is not configured');
      err.code = 'PRINTIFY_NOT_CONFIGURED';
      throw err;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      const err = new Error(data?.message || data?.error || `Printify HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  async listShops() {
    return this.request('/shops.json');
  }

  async listProducts(page = 1, limit = 50) {
    return this.request(
      `/shops/${this.shopId}/products.json?page=${page}&limit=${limit}`
    );
  }

  async getProduct(productId) {
    return this.request(`/shops/${this.shopId}/products/${productId}.json`);
  }

  /**
   * Create an order in Printify shop.
   * Docs: POST /v1/shops/{shop_id}/orders.json
   */
  async createOrder(payload) {
    return this.request(`/shops/${this.shopId}/orders.json`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async submitOrder(orderId) {
    return this.request(`/shops/${this.shopId}/orders/${orderId}/send_to_production.json`, {
      method: 'POST',
    });
  }

  async getOrder(orderId) {
    return this.request(`/shops/${this.shopId}/orders/${orderId}.json`);
  }

  /**
   * Map MemoNuvia order + line items into Printify order payload.
   */
  buildOrderPayload({ externalId, shipping, lineItems, metadata = {} }) {
    return {
      external_id: externalId,
      label: `MemoNuvia ${externalId}`,
      line_items: lineItems.map((item) => ({
        product_id: item.printify_product_id,
        variant_id: item.printify_variant_id,
        quantity: item.quantity || 1,
        print_provider_id: item.print_provider_id || undefined,
        blueprint_id: item.blueprint_id || undefined,
        // Custom print files / personalization fields when available
        ...(item.print_areas ? { print_areas: item.print_areas } : {}),
      })),
      shipping_method: 1,
      is_printify_express: false,
      is_economy_shipping: false,
      send_shipping_notification: true,
      address_to: {
        first_name: shipping.first_name,
        last_name: shipping.last_name,
        email: shipping.email,
        phone: shipping.phone || '',
        country: shipping.country,
        region: shipping.region || shipping.state || '',
        address1: shipping.address1,
        address2: shipping.address2 || '',
        city: shipping.city,
        zip: shipping.zip,
      },
      metadata: {
        source: 'memonuvia.com',
        ...metadata,
      },
    };
  }
}

module.exports = new PrintifyService();
