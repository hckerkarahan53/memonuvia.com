const BASE = "https://api.printify.com/v1";

function printifyToken() {
  return process.env.PRINTIFY_API_TOKEN || process.env.PRINTIFY_API_KEY || "";
}

export function printifyConfigured() {
  return Boolean(printifyToken() && process.env.PRINTIFY_SHOP_ID);
}

async function request(path: string, init: RequestInit = {}) {
  const token = printifyToken();
  const shopId = process.env.PRINTIFY_SHOP_ID;
  if (!token || !shopId) throw new Error("Printify is not configured");

  const res = await fetch(`${BASE}${path.replace("{shop}", shopId)}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Printify HTTP ${res.status}`);
  }
  return data;
}

export async function createPrintifyOrder(payload: Record<string, unknown>) {
  return request("/shops/{shop}/orders.json", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitPrintifyOrder(orderId: string) {
  return request(`/shops/{shop}/orders/${orderId}/send_to_production.json`, {
    method: "POST",
  });
}

export async function listPrintifyProducts() {
  return request("/shops/{shop}/products.json?limit=50");
}
