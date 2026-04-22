import { connectDB } from './mongodb.js'
import { ShopSession, ShopConfig } from './models.js'

// Pending payments restent en mémoire (courte durée de vie)
const pendingPayments = new Map()
const pendingOrders = new Map()

// ── Sessions (MongoDB) ────────────────────────────────────────────────────────

export async function saveSession(shop, session) {
  await connectDB()
  await ShopSession.findOneAndUpdate(
    { shop },
    {
      shop,
      accessToken: session.accessToken,
      scope: session.scope,
      tokenExpiresAt: session.tokenExpiresAt || null,
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  )
}

async function refreshTokenIfNeeded(doc) {
  if (!doc.tokenExpiresAt) return doc.accessToken
  const expiresAt = new Date(doc.tokenExpiresAt)
  const refreshBefore = new Date(expiresAt.getTime() - 60 * 60 * 1000) // 1h avant expiry
  if (new Date() < refreshBefore) return doc.accessToken

  const apiKey = process.env.SHOPIFY_API_KEY
  const apiSecret = process.env.SHOPIFY_API_SECRET
  if (!apiKey || !apiSecret) return doc.accessToken

  try {
    const resp = await fetch(`https://${doc.shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: apiKey, client_secret: apiSecret }),
    })
    const data = await resp.json()
    if (!data.access_token) return doc.accessToken

    const expiresIn = data.expires_in || 86400
    const newExpiry = new Date(Date.now() + expiresIn * 1000)
    await ShopSession.findOneAndUpdate(
      { shop: doc.shop },
      { accessToken: data.access_token, tokenExpiresAt: newExpiry, updatedAt: new Date() }
    )
    console.log(`Token auto-refreshed pour ${doc.shop}`)
    return data.access_token
  } catch (err) {
    console.warn(`Erreur refresh token pour ${doc.shop}:`, err.message)
    return doc.accessToken
  }
}

export async function getSession(shop) {
  await connectDB()
  const doc = await ShopSession.findOne({ shop })
  if (!doc) return null
  const accessToken = await refreshTokenIfNeeded(doc)
  return { shop, accessToken, scope: doc.scope }
}

// ── Config SATIM par shop (MongoDB) ──────────────────────────────────────────

export async function saveShopConfig(shop, data) {
  await connectDB()
  await ShopConfig.findOneAndUpdate(
    { shop },
    { ...data, shop, updatedAt: new Date() },
    { upsert: true, new: true }
  )
}

export async function getShopConfig(shop) {
  await connectDB()
  const doc = await ShopConfig.findOne({ shop })
  if (!doc) return null
  return {
    satimUsername: doc.satimUsername,
    satimPassword: doc.satimPassword,
    terminalId: doc.terminalId,
    testMode: doc.testMode,
    mockMode: doc.mockMode,
  }
}

// ── Pending payments (mémoire) ────────────────────────────────────────────────

export function savePendingPayment(orderNumber, data) {
  pendingPayments.set(orderNumber, { ...data, createdAt: new Date() })
}

export function getPendingPayment(orderNumber) {
  return pendingPayments.get(orderNumber) || null
}

export function deletePendingPayment(orderNumber) {
  pendingPayments.delete(orderNumber)
}

// ── Pending orders (mémoire) ──────────────────────────────────────────────────

export function savePendingOrder(shopifyOrderId, data) {
  pendingOrders.set(shopifyOrderId, { ...data, createdAt: new Date() })
}

export function getPendingOrder(shopifyOrderId) {
  return pendingOrders.get(shopifyOrderId) || null
}

export function deletePendingOrder(shopifyOrderId) {
  pendingOrders.delete(shopifyOrderId)
}

export function generateOrderNumber() {
  return `${Date.now()}${Math.floor(Math.random() * 9000) + 1000}`
}
