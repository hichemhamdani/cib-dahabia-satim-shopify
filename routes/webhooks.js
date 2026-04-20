import { Router } from 'express'
import { createHmac } from 'crypto'
import { savePendingOrder } from '../lib/storage.js'
import { sendPaymentEmail } from '../lib/email.js'

const router = Router()

function verifyShopifyWebhook(rawBody, hmacHeader) {
  const hash = createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64')
  return hash === hmacHeader
}

router.post('/orders-create', async (req, res) => {
  const hmac = req.headers['x-shopify-hmac-sha256']
  const rawBody = req.body.toString('utf8')

  if (hmac && !verifyShopifyWebhook(rawBody, hmac)) {
    console.warn('Webhook HMAC invalide — ignoré pour compatibilité webhook manuel')
  }

  const order = JSON.parse(rawBody)
  const shop = req.headers['x-shopify-shop-domain']

  // Envoyer uniquement pour les commandes en attente de paiement
  const financialStatus = (order.financial_status || '').toLowerCase()
  if (financialStatus !== 'pending') {
    return res.status(200).send('OK')
  }

  res.status(200).send('OK')

  const base = process.env.HOST
  const paymentLink = `${base}/payment/start?order_id=${order.id}&amount=${order.total_price}&shop=${shop}&token=${order.token}`

  savePendingOrder(String(order.id), {
    shop,
    shopifyOrderId: order.id,
    token: order.token,
    total: parseFloat(order.total_price),
    email: order.email,
    customerName: `${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim(),
    paymentLink,
  })

  if (order.email) {
    try {
      await sendPaymentEmail({
        to: order.email,
        customerName: `${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim(),
        orderNumber: order.order_number,
        amount: order.total_price,
        paymentLink,
      })
      console.log(`Email paiement envoyé à ${order.email} pour commande #${order.order_number}`)
    } catch (err) {
      console.error('Erreur envoi email paiement:', err.message)
    }
  }
})

export default router
