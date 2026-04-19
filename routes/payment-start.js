import { Router } from 'express'
import { satimRegisterOrder } from '../lib/satim.js'
import { savePendingPayment, generateOrderNumber, getShopConfig } from '../lib/storage.js'

const router = Router()

/**
 * GET /payment/start?order_id=...&amount=...&shop=...&token=...
 * Lien inclus dans l'email de confirmation Shopify.
 * Redirige directement vers la page de paiement SATIM.
 */
router.get('/', async (req, res) => {
  const { order_id, amount, shop, token } = req.query

  if (!order_id || !amount || !shop) {
    return res.status(400).send('Lien de paiement invalide.')
  }

  const total = parseFloat(amount)
  if (isNaN(total) || total <= 0) {
    return res.status(400).send('Montant invalide.')
  }

  try {
    const satimOrderNumber = generateOrderNumber()
    const base = process.env.HOST

    // Charger la config SATIM spécifique à ce shop
    const shopConfig = await getShopConfig(shop)
    if (!shopConfig?.satimUsername) {
      return res.status(503).send('Paiement non configuré pour ce store. Contactez le marchand.')
    }

    const satimResponse = await satimRegisterOrder({
      orderNumber: satimOrderNumber,
      amount: total,
      returnUrl: `${base}/payment/return?order_id=${satimOrderNumber}&shopify_order_id=${order_id}`,
      failUrl: `${base}/payment/fail?order_id=${satimOrderNumber}&shopify_order_id=${order_id}`,
    }, shopConfig)

    if (String(satimResponse.errorCode) !== '0' || !satimResponse.formUrl) {
      return res.status(502).send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:40px">
          <h2 style="color:#ef4444">Erreur de paiement</h2>
          <p>Impossible d'initialiser le paiement. Veuillez réessayer ou contacter le support.</p>
          <p style="color:#999;font-size:13px">Code: ${satimResponse.errorCode} — ${satimResponse.errorMessage || ''}</p>
        </body></html>
      `)
    }

    savePendingPayment(satimOrderNumber, {
      shop,
      shopifyOrderId: order_id,
      satimOrderId: satimResponse.orderId,
      total,
    })

    res.redirect(satimResponse.formUrl)
  } catch (err) {
    console.error('Erreur payment-start:', err)
    res.status(500).send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2 style="color:#ef4444">Erreur serveur</h2>
        <p>${err.message}</p>
      </body></html>
    `)
  }
})

export default router
