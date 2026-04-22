import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'

import authRouter from './routes/auth.js'
import paymentRouter from './routes/payment.js'
import paymentReturnRouter from './routes/payment-return.js'
import paymentFailRouter from './routes/payment-fail.js'
import paymentOrderRouter from './routes/payment-order.js'
import paymentStartRouter from './routes/payment-start.js'
import adminRouter from './routes/admin.js'
import settingsRouter from './routes/settings.js'
import webhooksRouter from './routes/webhooks.js'

const app = express()
const PORT = process.env.PORT || 3001

// Webhooks doivent recevoir le body brut pour vérification HMAC
app.use('/webhooks', express.raw({ type: 'application/json' }))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use('/auth', authRouter)
app.use('/payment/return', paymentReturnRouter)
app.use('/payment/fail', paymentFailRouter)
app.use('/payment/order', paymentOrderRouter)
app.use('/payment/start', paymentStartRouter)
app.use('/payment', paymentRouter)
app.use('/webhooks', webhooksRouter)
app.use('/admin', adminRouter)
app.use('/settings', settingsRouter)

// Page de simulation mock SATIM
app.get('/payment/test', (req, res) => {
  const { order_id, amount, returnUrl, failUrl } = req.query
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Paiement Mock SATIM</title>
      <style>
        body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f4f4f4; }
        .card { background: white; border-radius: 12px; padding: 40px; text-align: center; max-width: 420px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        h2 { color: #1a1a1a; margin-bottom: 8px; }
        .amount { font-size: 28px; font-weight: 700; color: #008060; margin: 16px 0; }
        .btn { display: inline-block; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; margin: 8px; cursor: pointer; border: none; }
        .btn-success { background: #008060; color: white; }
        .btn-fail { background: #ef4444; color: white; }
        .badge { background: #fef9c3; color: #854d0e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="card">
        <p class="badge">MODE MOCK — Simulation SATIM</p>
        <h2 style="margin-top:16px">Page de paiement</h2>
        <div class="amount">${parseFloat(amount || 0).toLocaleString('fr-DZ')} DZD</div>
        <p style="color:#777;font-size:13px;margin-bottom:24px">Commande #${order_id}</p>
        <div>
          <a href="${decodeURIComponent(returnUrl || '')}" class="btn btn-success">✓ Simuler paiement réussi</a>
          <br>
          <a href="${decodeURIComponent(failUrl || '')}" class="btn btn-fail">✗ Simuler paiement refusé</a>
        </div>
      </div>
    </body>
    </html>
  `)
})

app.get('/', (req, res) => {
  const shop = req.query.shop || ''
  res.redirect(`/settings?shop=${shop}`)
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
