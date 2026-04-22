import { Router } from 'express'
import { getSession, saveSession, getShopConfig } from '../lib/storage.js'
import { connectDB } from '../lib/mongodb.js'
import { ShopSession } from '../lib/models.js'

const router = Router()

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'webrocket2024'

function checkAuth(req, res) {
  const auth = req.headers['authorization']
  if (!auth) {
    res.set('WWW-Authenticate', 'Basic realm="Admin"')
    res.status(401).send('Authentification requise.')
    return false
  }
  const [, encoded] = auth.split(' ')
  const [, password] = Buffer.from(encoded, 'base64').toString().split(':')
  if (password !== ADMIN_PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="Admin"')
    res.status(401).send('Mot de passe incorrect.')
    return false
  }
  return true
}

// GET /admin/register — formulaire d'enregistrement manuel d'un store
router.get('/register', async (req, res) => {
  if (!checkAuth(req, res)) return

  const saved = req.query.saved
  const error = req.query.error

  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Enregistrer un store</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f6f6f7; min-height: 100vh; padding: 32px 16px; }
        .container { max-width: 560px; margin: 0 auto; }
        h1 { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; }
        p.sub { font-size: 13px; color: #777; margin-bottom: 24px; }
        .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .card h2 { font-size: 15px; font-weight: 600; color: #333; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0; }
        .field { margin-bottom: 16px; }
        label { display: block; font-size: 13px; font-weight: 500; color: #555; margin-bottom: 6px; }
        input { width: 100%; padding: 10px 12px; border: 1.5px solid #e0e0e0; border-radius: 8px; font-size: 14px; }
        input:focus { outline: none; border-color: #008060; }
        .hint { font-size: 12px; color: #999; margin-top: 4px; }
        .btn { width: 100%; padding: 12px; background: #008060; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; }
        .btn:hover { background: #006e52; }
        .alert { padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
        .alert.success { background: #dcfce7; color: #15803d; }
        .alert.error { background: #fee2e2; color: #991b1b; }
        .steps { background: #f8faff; border: 1px solid #dbeafe; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .steps h3 { font-size: 13px; font-weight: 600; color: #1d4ed8; margin-bottom: 8px; }
        .steps ol { font-size: 13px; color: #374151; padding-left: 20px; line-height: 1.8; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Enregistrer un store manuellement</h1>
        <p class="sub">Pour les stores qui ne passent pas par OAuth</p>

        ${saved === '1' ? '<div class="alert success">✓ Store enregistré avec succès.</div>' : ''}
        ${error ? `<div class="alert error">✗ ${error}</div>` : ''}

        <div class="steps">
          <h3>Comment obtenir l'access token du client ?</h3>
          <ol>
            <li>Client : Shopify Admin → Settings → Apps → Develop apps</li>
            <li>Créer une app → Configuration → Scopes : <strong>read_orders, write_orders</strong></li>
            <li>Install app → copier le <strong>Admin API access token</strong></li>
            <li>Coller ci-dessous avec le domaine du store</li>
          </ol>
        </div>

        <form method="POST" action="/admin/register">
          <div class="card">
            <h2>Informations du store</h2>
            <div class="field">
              <label>Domaine du store</label>
              <input type="text" name="shop" placeholder="ex: tigrou-2.myshopify.com" required />
              <p class="hint">Sans https://</p>
            </div>
            <div class="field">
              <label>Admin API Access Token</label>
              <input type="password" name="accessToken" placeholder="shpat_xxxxxxxxxxxxxxxxxxxx" required />
              <p class="hint">Obtenu depuis Shopify Admin → Apps → Develop apps → Install app</p>
            </div>
          </div>
          <button type="submit" class="btn">Enregistrer le store</button>
        </form>
      </div>
    </body>
    </html>
  `)
})

// GET /admin/sessions — liste tous les tokens en MongoDB
router.get('/sessions', async (req, res) => {
  if (!checkAuth(req, res)) return
  await connectDB()
  const sessions = await ShopSession.find({}, 'shop accessToken updatedAt').lean()
  const rows = sessions.map(s => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #f0f0f0">${s.shop}</td>
      <td style="padding:8px;border-bottom:1px solid #f0f0f0;font-family:monospace">${s.accessToken?.substring(0, 15)}...</td>
      <td style="padding:8px;border-bottom:1px solid #f0f0f0;color:#999;font-size:12px">${new Date(s.updatedAt).toLocaleString('fr-FR')}</td>
    </tr>
  `).join('')
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;padding:32px}table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px;background:#f6f6f7}</style></head><body>
    <h2>Sessions MongoDB (${sessions.length})</h2>
    <table><tr><th>Shop</th><th>Token (début)</th><th>Mis à jour</th></tr>${rows}</table>
    <p style="margin-top:16px"><a href="/admin">← Retour</a></p>
  </body></html>`)
})

// GET /admin/sync-session?from=...&to=... — copie la session d'un domaine à l'autre
router.get('/sync-session', async (req, res) => {
  if (!checkAuth(req, res)) return

  const { from, to } = req.query
  if (!from || !to) return res.status(400).send('Paramètres ?from= et ?to= requis.')

  const session = await getSession(from)
  if (!session) return res.status(404).send(`Session introuvable pour ${from}`)

  const cleanTo = to.trim().replace(/https?:\/\//, '').replace(/\/$/, '')
  await saveSession(cleanTo, { accessToken: session.accessToken, scope: session.scope })

  // Enregistrer le webhook pour le nouveau domaine
  const webhookUrl = `${process.env.HOST}/webhooks/orders-create`
  try {
    const response = await fetch(`https://${cleanTo}/admin/api/2024-10/webhooks.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': session.accessToken,
      },
      body: JSON.stringify({
        webhook: { topic: 'orders/create', address: webhookUrl, format: 'json' },
      }),
    })
    const data = await response.json()
    if (data.errors) {
      console.warn('Webhook sync:', JSON.stringify(data.errors))
    }
  } catch (err) {
    console.warn('Erreur webhook sync:', err.message)
  }

  res.send(`Session copiée de <strong>${from}</strong> vers <strong>${cleanTo}</strong> avec succès.`)
})

// POST /admin/register — enregistre le token manuellement
router.post('/register', async (req, res) => {
  if (!checkAuth(req, res)) return

  const { shop, accessToken } = req.body

  if (!shop || !accessToken) {
    return res.redirect('/admin/register?error=' + encodeURIComponent('Shop et access token requis.'))
  }

  const cleanShop = shop.trim().replace(/https?:\/\//, '').replace(/\/$/, '')
  const cleanToken = accessToken.trim()

  try {
    await saveSession(cleanShop, { accessToken: cleanToken, scope: 'read_orders,write_orders' })

    // Enregistrer le webhook orders/create
    const webhookUrl = `${process.env.HOST}/webhooks/orders-create`
    try {
      const response = await fetch(`https://${cleanShop}/admin/api/2024-10/webhooks.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': cleanToken,
        },
        body: JSON.stringify({
          webhook: { topic: 'orders/create', address: webhookUrl, format: 'json' },
        }),
      })
      const data = await response.json()
      if (data.errors) {
        console.warn('Webhook déjà existant ou erreur:', JSON.stringify(data.errors))
      } else {
        console.log(`Webhook orders/create enregistré pour ${cleanShop}`)
      }
    } catch (whErr) {
      console.warn('Erreur enregistrement webhook:', whErr.message)
    }

    res.redirect(`/admin/register?saved=1`)
  } catch (err) {
    res.redirect('/admin/register?error=' + encodeURIComponent(err.message))
  }
})

// GET /admin/fetch-token?shop=xxx — obtient un token via client_credentials et le sauvegarde
router.get('/fetch-token', async (req, res) => {
  if (!checkAuth(req, res)) return

  const { shop } = req.query
  if (!shop) return res.status(400).send('Paramètre ?shop= requis.')

  const apiKey = process.env.SHOPIFY_API_KEY
  const apiSecret = process.env.SHOPIFY_API_SECRET
  if (!apiKey || !apiSecret) return res.status(500).send('SHOPIFY_API_KEY / SHOPIFY_API_SECRET manquants.')

  try {
    const resp = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: apiKey, client_secret: apiSecret }),
    })
    const data = await resp.json()
    if (!data.access_token) {
      return res.status(400).send(`Erreur Shopify: ${JSON.stringify(data)}`)
    }

    const expiresIn = data.expires_in || 86400
    const expiresAt = new Date(Date.now() + expiresIn * 1000)
    await saveSession(shop, { accessToken: data.access_token, scope: data.scope, tokenExpiresAt: expiresAt })

    res.send(`
      <p>✓ Token obtenu et sauvegardé pour <strong>${shop}</strong></p>
      <p>Préfixe : <code>${data.access_token.substring(0, 15)}...</code></p>
      <p>Expire le : ${expiresAt.toLocaleString('fr-FR')}</p>
      <p>Scopes : ${data.scope}</p>
      <p><a href="/admin">← Retour</a></p>
    `)
  } catch (err) {
    res.status(500).send(`Erreur: ${err.message}`)
  }
})

// GET /admin — liste des stores enregistrés + statut
router.get('/', async (req, res) => {
  if (!checkAuth(req, res)) return

  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin — CIB/Dahabia</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f6f6f7; min-height: 100vh; padding: 32px 16px; }
        .container { max-width: 640px; margin: 0 auto; }
        h1 { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 24px; }
        .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .card h2 { font-size: 15px; font-weight: 600; color: #333; margin-bottom: 16px; }
        .link-btn { display: inline-block; padding: 10px 20px; background: #008060; color: white; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin-right: 8px; }
        .link-btn.secondary { background: #f3f4f6; color: #374151; }
        p { font-size: 14px; color: #555; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Admin — CIB / Dahabia</h1>

        <div class="card">
          <h2>Enregistrer un nouveau store</h2>
          <p style="margin-bottom:16px">Ajouter manuellement un store client avec son access token Shopify.</p>
          <a href="/admin/register" class="link-btn">+ Enregistrer un store</a>
        </div>

        <div class="card">
          <h2>Configurer les credentials SATIM</h2>
          <p style="margin-bottom:16px">Après avoir enregistré un store, configure ses credentials SATIM.</p>
          <a href="/settings?shop=" class="link-btn secondary">Ouvrir Settings</a>
        </div>

        <div class="card">
          <h2>Installation OAuth (stores dev)</h2>
          <p>Pour les stores dev Shopify, l'OAuth fonctionne encore via :</p>
          <p style="margin-top:8px"><code>/auth?shop=LEURSTORE.myshopify.com</code></p>
        </div>
      </div>
    </body>
    </html>
  `)
})

export default router
