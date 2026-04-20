import { Router } from 'express'
import { getSession, saveSession, getShopConfig } from '../lib/storage.js'

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

// POST /admin/register — enregistre le token manuellement
router.post('/register', async (req, res) => {
  if (!checkAuth(req, res)) return

  const { shop, accessToken } = req.body

  if (!shop || !accessToken) {
    return res.redirect('/admin/register?error=' + encodeURIComponent('Shop et access token requis.'))
  }

  const cleanShop = shop.trim().replace(/https?:\/\//, '').replace(/\/$/, '')

  try {
    await saveSession(cleanShop, { accessToken: accessToken.trim(), scope: 'read_orders,write_orders' })
    res.redirect(`/admin/register?saved=1`)
  } catch (err) {
    res.redirect('/admin/register?error=' + encodeURIComponent(err.message))
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
