import { Router } from 'express'
import { getSession } from '../lib/storage.js'

const router = Router()

/**
 * GET /admin?shop=...
 * Simple admin panel for the merchant to verify app status and test payment.
 */
router.get('/', (req, res) => {
  const { shop } = req.query
  const session = shop ? getSession(shop) : null
  const isConnected = !!session
  const satimConfigured = !!(process.env.SATIM_USERNAME && process.env.SATIM_PASSWORD && process.env.SATIM_TERMINAL_ID)
  const testMode = process.env.SATIM_TEST_MODE !== 'false'
  const mockMode = process.env.SATIM_MOCK_MODE === 'true'

  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CIB/Dahabia — Admin</title>
      <style>
        body { font-family: sans-serif; max-width: 640px; margin: 40px auto; padding: 0 20px; background: #f9f9f9; }
        h1 { color: #111; }
        .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600; }
        .ok { background: #dcfce7; color: #15803d; }
        .warn { background: #fef9c3; color: #854d0e; }
        .err { background: #fee2e2; color: #991b1b; }
        label { display: block; font-weight: 600; margin-bottom: 4px; margin-top: 12px; }
        input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
        button { margin-top: 16px; padding: 10px 20px; background: #111; color: white; border: none; border-radius: 6px; cursor: pointer; }
      </style>
    </head>
    <body>
      <h1>CIB/Dahabia Shopify Gateway</h1>

      <div class="card">
        <h2>Statut</h2>
        <p>
          Store: <strong>${shop || 'non spécifié'}</strong><br>
          OAuth: <span class="badge ${isConnected ? 'ok' : 'err'}">${isConnected ? 'Connecté' : 'Non installé'}</span><br>
          SATIM: <span class="badge ${satimConfigured ? 'ok' : 'warn'}">${satimConfigured ? 'Configuré' : 'Non configuré (utilise .env)'}</span><br>
          Mode: <span class="badge ${testMode ? 'warn' : 'ok'}">${mockMode ? 'Mock' : testMode ? 'Test SATIM' : 'Production'}</span>
        </p>
        ${!isConnected && shop ? `<p><a href="/auth?shop=${shop}">→ Installer l'app sur ce store</a></p>` : ''}
      </div>

      <div class="card">
        <h2>Test d'un paiement</h2>
        <p>Envoie une requête POST à <code>/payment/initiate</code> avec le body JSON suivant :</p>
        <pre style="background:#f0f0f0;padding:12px;border-radius:6px;overflow:auto;font-size:13px">{
  "shop": "${shop || 'votre-store.myshopify.com'}",
  "lineItems": [
    { "title": "Produit test", "price": "1000.00", "quantity": 1 }
  ],
  "customer": {
    "firstName": "Ahmed",
    "lastName": "Benali",
    "email": "client@example.com",
    "phone": "0555000000",
    "wilaya": "Alger",
    "address": "1 Rue de la Paix"
  }
}</pre>
      </div>

      <div class="card">
        <h2>Installation</h2>
        <p>Pour installer l'app sur un store, accède à :</p>
        <code>/auth?shop=NOM_DU_STORE.myshopify.com</code>
      </div>
    </body>
    </html>
  `)
})

export default router
