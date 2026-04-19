import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = join(__dirname, '..', 'satim-config.json')

const defaults = {
  satimUsername: process.env.SATIM_USERNAME || '',
  satimPassword: process.env.SATIM_PASSWORD || '',
  terminalId: process.env.SATIM_TERMINAL_ID || '',
  testMode: process.env.SATIM_TEST_MODE !== 'false',
  mockMode: process.env.SATIM_MOCK_MODE === 'true',
}

export function getConfig() {
  if (existsSync(CONFIG_PATH)) {
    try {
      return { ...defaults, ...JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) }
    } catch {
      return defaults
    }
  }
  return defaults
}

export function saveConfig(data) {
  const current = getConfig()
  const updated = { ...current, ...data }
  writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8')
  return updated
}
