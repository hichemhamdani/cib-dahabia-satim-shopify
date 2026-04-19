import { Router } from 'express'
import { createHmac } from 'crypto'
import { savePendingOrder } from '../lib/storage.js'

const router = Router()

function verifyShopifyWebhook(rawBody, hmacHeader) {
  const hash = createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64')
  return hash === hmacHeader
}

// POST /webhooks/orders-create
router.post('/orders-create', (req, res) => {
  const hmac = req.headers['x-shopify-hmac-sha256']
  const rawBody = req.body.toString('utf8')

  if (!verifyShopifyWebhook(rawBody, hmac)) {
    console.warn('Webhook HMAC invalide')
    return res.status(401).send('Unauthorized')
  }

  const order = JSON.parse(rawBody)
  const shop = req.headers['x-shopify-shop-domain']

  // Ignorer les commandes qui ne sont pas CIB/Dahabia
  const gateway = (order.gateway || '').toLowerCase()
  if (!gateway.includes('cib') && !gateway.includes('dahabia')) {
    return res.status(200).send('OK')
  }

  const base = process.env.HOST || `http://localhost:${process.env.PORT || 3001}`
  const paymentLink = `${base}/payment/order?shop=${shop}&order_id=${order.id}&token=${order.token}`

  savePendingOrder(String(order.id), {
    shop,
    shopifyOrderId: order.id,
    token: order.token,
    total: parseFloat(order.total_price),
    email: order.email,
    customerName: `${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim(),
    paymentLink,
  })

  console.log(`Nouvelle commande CIB/Dahabia #${order.order_number} — lien: ${paymentLink}`)
  res.status(200).send('OK')
})

export default router
