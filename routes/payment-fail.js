import { Router } from 'express'
import { getPendingPayment, deletePendingPayment } from '../lib/storage.js'

const router = Router()

/**
 * GET /payment/fail?order_id=...
 * SATIM redirects here on failed or cancelled payment.
 */
router.get('/', async (req, res) => {
  const { order_id, reason } = req.query

  if (order_id) {
    const payment = getPendingPayment(order_id)
    if (payment) {
      deletePendingPayment(order_id)
    }
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Paiement échoué</title>
      <style>
        body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f4f4f4; }
        .card { background: white; border-radius: 12px; padding: 40px; text-align: center; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        h1 { color: #ef4444; }
        p { color: #555; }
        a { color: #3b82f6; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>✗ Paiement refusé</h1>
        <p>Le paiement pour la commande <strong>#${order_id || 'inconnue'}</strong> a échoué.</p>
        ${reason ? `<p>Raison: ${reason}</p>` : ''}
        <p>Veuillez réessayer ou contacter le support.</p>
      </div>
    </body>
    </html>
  `)
})

export default router
