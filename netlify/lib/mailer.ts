import nodemailer from 'nodemailer'
import type { Config, Mail, SendMail } from './reminders'

/** From = the Dalilak Gmail account, Reply-To = Yousef, so owners renew by simply replying. */
export const messageFields = (cfg: Config, m: Mail) => ({ from: `Dalilak – دليلك <${cfg.gmailUser}>`, replyTo: cfg.replyTo, ...m })

/** Gmail SMTP with an app password (GMAIL_APP_PASSWORD, set only in Netlify). Replies go to Yousef. */
export function gmailSender(cfg: Config): SendMail {
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: cfg.gmailUser, pass: cfg.gmailPassword },
  })
  return async (m) => {
    await transport.sendMail(messageFields(cfg, m))
  }
}
