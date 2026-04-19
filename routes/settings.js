import { Router } from 'express'
import { getSession, getShopConfig, saveShopConfig } from '../lib/storage.js'

const router = Router()

router.get('/', async (req, res) => {
  const { shop } = req.query
  const session = shop ? await getSession(shop) : null
  const isConnected = !!session
  const config = shop ? (await getShopConfig(shop) || {}) : {}

  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CIB/Dahabia — Configuration SATIM</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f6f6f7; min-height: 100vh; padding: 32px 16px; }
        .container { max-width: 560px; margin: 0 auto; }
        h1 { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 24px; }
        .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .card h2 { font-size: 15px; font-weight: 600; color: #333; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0; }
        .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .ok { background: #dcfce7; color: #15803d; }
        .warn { background: #fef9c3; color: #854d0e; }
        .err { background: #fee2e2; color: #991b1b; }
        .field { margin-bottom: 16px; }
        label { display: block; font-size: 13px; font-weight: 500; color: #555; margin-bottom: 6px; }
        input[type="text"], input[type="password"] {
          width: 100%; padding: 10px 12px; border: 1.5px solid #e0e0e0; border-radius: 8px; font-size: 14px;
        }
        input:focus { outline: none; border-color: #008060; }
        .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
        .toggle-row:last-child { border-bottom: none; }
        .toggle { position: relative; width: 40px; height: 22px; }
        .toggle input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; inset: 0; background: #ccc; border-radius: 22px; cursor: pointer; transition: 0.2s; }
        .slider:before { content: ''; position: absolute; width: 16px; height: 16px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.2s; }
        input:checked + .slider { background: #008060; }
        input:checked + .slider:before { transform: translateX(18px); }
        .btn { width: 100%; padding: 12px; background: #008060; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; }
        .btn:hover { background: #006e52; }
        .alert { padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
        .alert.success { background: #dcfce7; color: #15803d; }
        .status-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 13px; color: #555; border-bottom: 1px solid #f5f5f5; }
        .status-row:last-child { border-bottom: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>CIB / Dahabia — Configuration</h1>

        ${req.query.saved === '1' ? '<div class="alert success">✓ Configuration sauvegardée.</div>' : ''}
        ${req.query.error ? `<div class="alert" style="background:#fee2e2;color:#991b1b">✗ ${req.query.error}</div>` : ''}

        <div class="card">
          <h2>Statut</h2>
          <div class="status-row"><span>Store</span><strong>${shop || 'non spécifié'}</strong></div>
          <div class="status-row">
            <span>OAuth</span>
            <span class="badge ${isConnected ? 'ok' : 'err'}">${isConnected ? '✓ Connecté' : '✗ Non installé'}</span>
          </div>
          <div class="status-row">
            <span>Credentials SATIM</span>
            <span class="badge ${config.satimUsername ? 'ok' : 'warn'}">${config.satimUsername ? '✓ Configurés' : '⚠ Manquants'}</span>
          </div>
          <div class="status-row">
            <span>Mode</span>
            <span class="badge ${config.mockMode ? 'warn' : config.testMode ? 'warn' : 'ok'}">
              ${config.mockMode ? 'Mock' : config.testMode ? 'Test SATIM' : 'Production'}
            </span>
          </div>
          ${!isConnected && shop ? `<p style="margin-top:12px"><a href="/auth?shop=${shop}">→ Installer l'app sur ce store</a></p>` : ''}
        </div>

        <form method="POST" action="/settings?shop=${shop || ''}">
          <div class="card">
            <h2>Identifiants SATIM</h2>
            <div class="field">
              <label>Nom d'utilisateur (userName)</label>
              <input type="text" name="satimUsername" value="${config.satimUsername || ''}" placeholder="ex: monstore_user" autocomplete="off" />
            </div>
            <div class="field">
              <label>Mot de passe (password)</label>
              <input type="password" name="satimPassword" value="${config.satimPassword || ''}" autocomplete="off" />
            </div>
            <div class="field">
              <label>Terminal ID</label>
              <input type="text" name="terminalId" value="${config.terminalId || ''}" placeholder="ex: E004000026" autocomplete="off" />
            </div>
          </div>

          <div class="card">
            <h2>Options</h2>
            <div class="toggle-row">
              <span style="font-size:13px;color:#444">Mode test SATIM (test.satim.dz)</span>
              <label class="toggle">
                <input type="checkbox" name="testMode" ${config.testMode ? 'checked' : ''} />
                <span class="slider"></span>
              </label>
            </div>
            <div class="toggle-row">
              <span style="font-size:13px;color:#444">Mode mock (sans appel SATIM réel)</span>
              <label class="toggle">
                <input type="checkbox" name="mockMode" ${config.mockMode ? 'checked' : ''} />
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <button type="submit" class="btn">Sauvegarder</button>
        </form>
      </div>
    </body>
    </html>
  `)
})

router.post('/', async (req, res) => {
  const { shop } = req.query
  try {
    await saveShopConfig(shop, {
      satimUsername: req.body.satimUsername?.trim() || '',
      satimPassword: req.body.satimPassword?.trim() || '',
      terminalId: req.body.terminalId?.trim() || '',
      testMode: req.body.testMode === 'on',
      mockMode: req.body.mockMode === 'on',
    })
    res.redirect(`/settings?shop=${shop || ''}&saved=1`)
  } catch (err) {
    res.redirect(`/settings?shop=${shop || ''}&error=${encodeURIComponent(err.message)}`)
  }
})

export default router
