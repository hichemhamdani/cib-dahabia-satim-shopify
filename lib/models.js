import mongoose from 'mongoose'

// Session OAuth par shop
const shopSessionSchema = new mongoose.Schema({
  shop: { type: String, required: true, unique: true },
  accessToken: { type: String, required: true },
  scope: String,
  tokenExpiresAt: { type: Date, default: null },
  updatedAt: { type: Date, default: Date.now },
})

// Config SATIM par shop
const shopConfigSchema = new mongoose.Schema({
  shop: { type: String, required: true, unique: true },
  satimUsername: { type: String, default: '' },
  satimPassword: { type: String, default: '' },
  terminalId: { type: String, default: '' },
  testMode: { type: Boolean, default: false },
  mockMode: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
})

export const ShopSession = mongoose.models.ShopSession
  || mongoose.model('ShopSession', shopSessionSchema)

export const ShopConfig = mongoose.models.ShopConfig
  || mongoose.model('ShopConfig', shopConfigSchema)
