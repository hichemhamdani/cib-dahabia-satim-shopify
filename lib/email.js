import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev'

export async function sendPaymentEmail({ to, customerName, orderNumber, amount, paymentLink }) {
  const name = customerName || 'Client'
  const amountFormatted = Number(amount).toLocaleString('fr-DZ') + ' DZD'

  await resend.emails.send({
    from: `CIB / Dahabia <${FROM}>`,
    to,
    subject: `Votre lien de paiement — Commande #${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html lang="fr">
      <head><meta charset="UTF-8"></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f6f6f7;margin:0;padding:32px 16px">
        <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
          <h2 style="color:#1a1a1a;margin:0 0 8px">Bonjour ${name},</h2>
          <p style="color:#555;line-height:1.6;margin:0 0 24px">
            Merci pour votre commande <strong>#${orderNumber}</strong>.<br>
            Montant à régler : <strong>${amountFormatted}</strong>
          </p>
          <p style="color:#555;line-height:1.6;margin:0 0 24px">
            Cliquez sur le bouton ci-dessous pour effectuer votre paiement par carte <strong>CIB / Dahabia</strong> :
          </p>
          <div style="text-align:center;margin:32px 0">
            <a href="${paymentLink}"
               style="display:inline-block;padding:14px 32px;background:#008060;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px">
              Payer maintenant — CIB / Dahabia
            </a>
          </div>
          <p style="color:#999;font-size:12px;margin:24px 0 0;line-height:1.6">
            Si vous n'êtes pas à l'origine de cette commande, ignorez cet email.<br>
            Ce lien est valable 24h.
          </p>
        </div>
      </body>
      </html>
    `,
  })
}
