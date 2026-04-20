import { Router } from 'express'
import { satimConfirmOrder } from '../lib/satim.js'
import { getSession, getPendingPayment, deletePendingPayment, deletePendingOrder } from '../lib/storage.js'
import { getShopify } from '../lib/shopify.js'

const router = Router()

/**
 * GET /payment/return?order_id=...&orderId=...&shopify_order_id=...
 * SATIM redirects here on successful payment.
 */
router.get('/', async (req, res) => {
  const { order_id, orderId: satimOrderId, shopify_order_id } = req.query

  if (!order_id) return res.status(400).send('Paramètre manquant.')

  const payment = getPendingPayment(order_id)
  if (!payment) return res.status(404).send('Paiement introuvable ou déjà traité.')

  try {
    // Confirmer avec SATIM
    const confirmation = await satimConfirmOrder(satimOrderId || payment.satimOrderId)

    if (confirmation.ErrorCode !== 0) {
      return res.redirect(
        `/payment/fail?order_id=${order_id}&shopify_order_id=${shopify_order_id}&reason=${encodeURIComponent(confirmation.ErrorMessage)}`
      )
    }

    // Marquer la commande Shopify comme payée
    const shopifyOrderId = shopify_order_id || payment.shopifyOrderId
    if (shopifyOrderId) {
      const session = getSession(payment.shop)
      if (session) {
        try {
          const client = new getShopify().clients.Rest({ session })
          await client.post({
            path: `orders/${shopifyOrderId}/transactions`,
            data: {
              transaction: {
                kind: 'capture',
                status: 'success',
                amount: String(payment.total),
                gateway: 'CIB / Dahabia',
              },
            },
          })
          deletePendingOrder(shopifyOrderId)
        } catch (err) {
          console.error('Erreur marquage commande payée:', err.message)
        }
      }
    }

    deletePendingPayment(order_id)

    res.send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Paiement réussi</title>
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f4f4f4; }
          .card { background: white; border-radius: 12px; padding: 40px; text-align: center; max-width: 420px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          h1 { color: #22c55e; margin-bottom: 12px; }
          p { color: #555; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>✓ Paiement accepté</h1>
          <p>Votre paiement a été confirmé avec succès.</p>
          <p>Vous recevrez une confirmation de commande par email.</p>
        </div>
      </body>
      </html>
    `)
  } catch (err) {
    console.error('Erreur payment-return:', err)
    res.status(500).send('Erreur lors de la confirmation: ' + err.message)
  }
})

export default router
