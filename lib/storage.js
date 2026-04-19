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
    { shop, accessToken: session.accessToken, scope: session.scope, updatedAt: new Date() },
    { upsert: true, new: true }
  )
}

export async function getSession(shop) {
  await connectDB()
  const doc = await ShopSession.findOne({ shop })
  if (!doc) return null
  return { shop, accessToken: doc.accessToken, scope: doc.scope }
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
