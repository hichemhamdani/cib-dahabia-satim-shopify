import { Router } from 'express'
import { satimRegisterOrder } from '../lib/satim.js'
import { getSession, savePendingPayment, generateOrderNumber } from '../lib/storage.js'

const router = Router()

/**
 * POST /payment/initiate
 * Body: { shop, lineItems, customer }
 *
 * Calculates total from lineItems, registers with SATIM, returns formUrl.
 */
router.post('/initiate', async (req, res) => {
  const { shop, lineItems, customer } = req.body

  if (!shop || !lineItems || !customer) {
    return res.status(400).json({ error: 'Missing required fields: shop, lineItems, customer' })
  }

  const session = getSession(shop)
  if (!session) {
    return res.status(401).json({ error: 'App not installed on this store. Visit /auth?shop=' + shop })
  }

  try {
    const orderNumber = generateOrderNumber()
    const base = process.env.HOST || `http://localhost:${process.env.PORT || 3001}`

    // Calculate total locally from lineItems
    const total = lineItems.reduce((sum, item) => {
      return sum + parseFloat(item.price) * (item.quantity || 1)
    }, 0)

    // Register the payment with SATIM
    const satimResponse = await satimRegisterOrder({
      orderNumber,
      amount: total,
      returnUrl: `${base}/payment/return?order_id=${orderNumber}`,
      failUrl: `${base}/payment/fail?order_id=${orderNumber}`,
    })

    if (satimResponse.errorCode !== '0' || !satimResponse.formUrl) {
      return res.status(502).json({
        error: 'SATIM registration failed',
        details: satimResponse,
      })
    }

    // Save everything locally — Shopify order created after payment confirmation
    savePendingPayment(orderNumber, {
      shop,
      satimOrderId: satimResponse.orderId,
      lineItems,
      total,
      customer,
    })

    res.json({ formUrl: satimResponse.formUrl, orderNumber })
  } catch (err) {
    console.error('Payment initiation error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
