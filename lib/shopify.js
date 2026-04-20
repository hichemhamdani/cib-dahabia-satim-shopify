import '@shopify/shopify-api/adapters/node'
import { shopifyApi, ApiVersion, LogSeverity } from '@shopify/shopify-api'

let _shopify = null

export function getShopify() {
  if (_shopify) return _shopify
  _shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: (process.env.SHOPIFY_SCOPES || 'read_orders,write_orders,read_draft_orders,write_draft_orders').split(','),
    hostName: (process.env.HOST || '').replace(/https?:\/\//, ''),
    apiVersion: ApiVersion.October24,
    isEmbeddedApp: false,
    logger: { level: LogSeverity.Warning },
  })
  return _shopify
}
