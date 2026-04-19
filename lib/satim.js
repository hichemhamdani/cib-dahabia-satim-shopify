// SATIM payment gateway API wrapper
// Mirrors the logic from cib-next-main/lib/satim.ts
import { getConfig } from './config.js'

const TEST_REGISTER_URL = 'https://test.satim.dz/payment/rest/register.do'
const PROD_REGISTER_URL = 'https://epg.satim.dz/payment/rest/register.do'
const TEST_CONFIRM_URL  = 'https://test.satim.dz/payment/rest/confirmOrder.do'
const PROD_CONFIRM_URL  = 'https://epg.satim.dz/payment/rest/confirmOrder.do'

export const MOCK_ORDER_PREFIX = 'MOCK_'

function isTestMode() {
  return getConfig().testMode
}

function isMockMode() {
  return getConfig().mockMode
}

/**
 * Register a payment order with SATIM.
 * @param {{ orderNumber: string, amount: number, returnUrl: string, failUrl: string, language?: string }} params
 * @returns {Promise<{ errorCode: string, orderId?: string, formUrl?: string, errorMessage?: string }>}
 */
export async function satimRegisterOrder(params, shopConfig = null) {
  const { orderNumber, amount, returnUrl, failUrl, language = 'FR' } = params
  const cfg = shopConfig || getConfig()

  if (cfg.mockMode ?? isMockMode()) {
    const base = process.env.HOST || `http://localhost:${process.env.PORT || 3001}`
    return {
      errorCode: '0',
      orderId: MOCK_ORDER_PREFIX + orderNumber,
      formUrl:
        `${base}/payment/test` +
        `?order_id=${orderNumber}` +
        `&amount=${amount}` +
        `&returnUrl=${encodeURIComponent(returnUrl)}` +
        `&failUrl=${encodeURIComponent(failUrl)}`,
    }
  }

  const userName   = cfg.satimUsername
  const password   = cfg.satimPassword
  const terminalId = cfg.terminalId

  if (!userName || !password || !terminalId) {
    throw new Error('Identifiants SATIM manquants.')
  }

  const registerUrl = (cfg.testMode ?? isTestMode()) ? TEST_REGISTER_URL : PROD_REGISTER_URL

  const searchParams = new URLSearchParams({
    userName,
    password,
    orderNumber,
    currency: '012', // DZD
    amount: String(Math.round(amount * 100)),
    language,
    returnUrl,
    failUrl,
    jsonParams: JSON.stringify({ force_terminal_id: terminalId, udf1: '2018105301346' }),
  })

  const response = await fetch(`${registerUrl}?${searchParams.toString()}`, {
    signal: AbortSignal.timeout(60_000),
  })

  if (!response.ok) {
    throw new Error(`Erreur HTTP SATIM: ${response.status}`)
  }

  const data = await response.json()
  console.log('SATIM register response:', JSON.stringify(data))
  return data
}

/**
 * Confirm a payment order with SATIM after redirect.
 * @param {string} satimOrderId
 * @param {string} [language]
 * @returns {Promise<{ ErrorCode: number, ErrorMessage: string }>}
 */
export async function satimConfirmOrder(satimOrderId, language = 'FR') {
  if (satimOrderId.startsWith(MOCK_ORDER_PREFIX)) {
    return { ErrorCode: 0, ErrorMessage: 'Mock confirmation success' }
  }

  const cfg = getConfig()
  const userName = cfg.satimUsername
  const password = cfg.satimPassword

  if (!userName || !password) {
    throw new Error('Identifiants SATIM manquants.')
  }

  const confirmUrl = isTestMode() ? TEST_CONFIRM_URL : PROD_CONFIRM_URL

  const searchParams = new URLSearchParams({
    userName,
    password,
    orderId: satimOrderId,
    language,
  })

  const response = await fetch(`${confirmUrl}?${searchParams.toString()}`, {
    signal: AbortSignal.timeout(60_000),
  })

  if (!response.ok) {
    throw new Error(`Erreur HTTP SATIM: ${response.status}`)
  }

  return response.json()
}
