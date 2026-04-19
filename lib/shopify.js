import '@shopify/shopify-api/adapters/node'
import { shopifyApi, ApiVersion, LogSeverity } from '@shopify/shopify-api'

if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET || !process.env.HOST) {
  throw new Error('Missing required env vars: SHOPIFY_API_KEY, SHOPIFY_API_SECRET, HOST')
}

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: (process.env.SHOPIFY_SCOPES || 'read_orders,write_orders,read_draft_orders,write_draft_orders').split(','),
  hostName: process.env.HOST.replace(/https?:\/\//, ''),
  apiVersion: ApiVersion.October24,
  isEmbeddedApp: false,
  logger: { level: LogSeverity.Warning },
})

/**
 * Create a draft order in Shopify.
 * @param {object} session - Shopify session with accessToken + shop
 * @param {{ lineItems: Array, customer: object, note?: string }} params
 * @returns {Promise<object>} draft_order object
 */
export async function createDraftOrder(session, { lineItems, customer, note }) {
  const client = new shopify.clients.Rest({ session })

  const body = {
    draft_order: {
      line_items: lineItems,
      note: note || `Paiement CIB/Dahabia — ${customer.firstName} ${customer.lastName} — ${customer.phone}`,
    },
  }

  const response = await client.post({ path: 'draft_orders', data: body })
  return response.body.draft_order
}

/**
 * Complete a draft order and mark it as paid.
 * @param {object} session
 * @param {string|number} draftOrderId
 * @returns {Promise<object>} completed order object
 */
export async function completeDraftOrder(session, draftOrderId) {
  const client = new shopify.clients.Rest({ session })
  const response = await client.put({
    path: `draft_orders/${draftOrderId}/complete`,
    data: { payment_pending: false },
  })
  return response.body.draft_order
}

/**
 * Cancel (delete) a draft order.
 * @param {object} session
 * @param {string|number} draftOrderId
 */
export async function cancelDraftOrder(session, draftOrderId) {
  const client = new shopify.clients.Rest({ session })
  await client.delete({ path: `draft_orders/${draftOrderId}` })
}
