import { Router } from 'express'
import { satimRegisterOrder } from '../lib/satim.js'
import { getPendingOrder, savePendingPayment, generateOrderNumber } from '../lib/storage.js'

const router = Router()

/**
 * GET /payment/order?shop=...&order_id=...&token=...
 * Lien envoyé au client après une commande CIB/Dahabia.
 * Redirige vers la page de paiement SATIM.
 */
router.get('/', async (req, res) => {
  const { shop, order_id, token } = req.query

  if (!shop || !order_id) {
    return res.status(400).send('Lien de paiement invalide.')
  }

  const order = getPendingOrder(order_id)
  if (!order || order.token !== token) {
    return res.status(404).send('Commande introuvable ou lien expiré.')
  }

  try {
    const satimOrderNumber = generateOrderNumber()
    const base = process.env.HOST || `http://localhost:${process.env.PORT || 3001}`

    const satimResponse = await satimRegisterOrder({
      orderNumber: satimOrderNumber,
      amount: order.total,
      returnUrl: `${base}/payment/return?order_id=${satimOrderNumber}&shopify_order_id=${order_id}`,
      failUrl: `${base}/payment/fail?order_id=${satimOrderNumber}&shopify_order_id=${order_id}`,
    })

    if (satimResponse.errorCode !== '0' || !satimResponse.formUrl) {
      return res.status(502).send('Erreur lors de l\'initialisation du paiement. Veuillez réessayer.')
    }

    savePendingPayment(satimOrderNumber, {
      shop,
      shopifyOrderId: order_id,
      satimOrderId: satimResponse.orderId,
      total: order.total,
    })

    res.redirect(satimResponse.formUrl)
  } catch (err) {
    console.error('Erreur payment-order:', err)
    res.status(500).send('Erreur serveur: ' + err.message)
  }
})

export default router
