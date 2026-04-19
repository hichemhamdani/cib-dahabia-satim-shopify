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

app.get('/', (req, res) => {
  const shop = req.query.shop || ''
  res.redirect(`/settings?shop=${shop}`)
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
