import { Router } from 'express'
import { getShopify } from '../lib/shopify.js'
import { saveSession, getSession } from '../lib/storage.js'

const router = Router()

// Step 1: Merchant installs the app → redirect to Shopify OAuth
router.get('/', async (req, res) => {
  const shop = req.query.shop
  if (!shop) return res.status(400).send('Missing ?shop parameter')

  await getShopify().auth.begin({
    shop,
    callbackPath: '/auth/callback',
    isOnline: false,
    rawRequest: req,
    rawResponse: res,
  })
})

// Step 2: Shopify redirects back with auth code → exchange for access token
router.get('/callback', async (req, res) => {
  try {
    const callbackResponse = await getShopify().auth.callback({
      rawRequest: req,
      rawResponse: res,
    })

    const session = callbackResponse.session
    saveSession(session.shop, session)

    // Enregistrer le webhook orders/create
    try {
      const client = new getShopify().clients.Rest({ session })
      await client.post({
        path: 'webhooks',
        data: {
          webhook: {
            topic: 'orders/create',
            address: `${process.env.HOST}/webhooks/orders-create`,
            format: 'json',
          },
        },
      })
      console.log(`Webhook orders/create enregistré pour ${session.shop}`)
    } catch (err) {
      console.warn('Webhook déjà enregistré ou erreur:', err.message)
    }

    console.log(`App installed on: ${session.shop}`)
    res.redirect(`/settings?shop=${session.shop}`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    res.status(500).send('OAuth failed: ' + err.message)
  }
})

export default router
