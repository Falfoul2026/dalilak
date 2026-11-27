// Renewal reminder email, in the owner's language (ar / fr / nl / en). Pure function: easy to test.

export type EmailLang = 'ar' | 'fr' | 'nl' | 'en'

export interface ReminderData {
  lang: EmailLang
  name: string
  endsOn: string        // YYYY-MM-DD, last day of the paid period
  daysLeft: number
  periodStart: string   // YYYY-MM-DD
  today: string         // YYYY-MM-DD (end of the stats window)
  stats: { views: number; calls: number; directions: number }
  priceEur: string      // "20"
  pageUrl: string | null
  test?: boolean
}

const LOCALE: Record<EmailLang, string> = { ar: 'ar-u-nu-latn', fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB' }

const fmtDate = (iso: string, lang: EmailLang) =>
  new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`))
const fmtNum = (n: number, lang: EmailLang) => new Intl.NumberFormat(LOCALE[lang]).format(n)

function daysAr(n: number): string {
  if (n === 0) return 'اليوم'
  if (n === 1) return 'بعد يوم واحد'
  if (n === 2) return 'بعد يومين'
  if (n <= 10) return `بعد ${n} أيام`
  return `بعد ${n} يوماً`
}

const T = {
  ar: {
    subject: (d: ReminderData) => `دليلك: اشتراك «${d.name}» ينتهي ${daysAr(d.daysLeft)}`,
    hello: 'مرحباً،',
    intro: (d: ReminderData, end: string) => `اشتراك «${d.name}» في دليلك (الظهور المميّز) ينتهي بتاريخ ${end}، يعني ${daysAr(d.daysLeft)}.`,
    statsTitle: (from: string, to: string) => `إحصائيات صفحتكم من ${from} إلى ${to}:`,
    views: 'مشاهدات الصفحة', calls: 'ضغطات على رقم الهاتف', directions: 'ضغطات على العنوان / الاتجاهات',
    ask: (p: string) => `هل تريدون التجديد لشهر إضافي بـ ${p} يورو؟ يكفي أن تردّوا على هذا الإيميل وسنتواصل معكم.`,
    after: 'إذا لم يتم التجديد، تبقى صفحتكم ظاهرة بالاسم والعنوان والهاتف فقط، بدون لوغو وصور وبدون الظهور في «خياراتنا المفضلة».',
    page: 'صفحتكم على دليلك:', bye: 'مع التحية،\nفريق دليلك',
  },
  fr: {
    subject: (d: ReminderData) => `Dalilak : l’abonnement de « ${d.name} » se termine dans ${d.daysLeft} jour${d.daysLeft > 1 ? 's' : ''}`,
    hello: 'Bonjour,',
    intro: (d: ReminderData, end: string) => `L’abonnement « Sponsorisé » de « ${d.name} » sur Dalilak se termine le ${end}, soit dans ${d.daysLeft} jour${d.daysLeft > 1 ? 's' : ''}.`,
    statsTitle: (from: string, to: string) => `Statistiques de votre page du ${from} au ${to} :`,
    views: 'Vues de la page', calls: 'Clics sur le numéro de téléphone', directions: 'Clics sur l’adresse / l’itinéraire',
    ask: (p: string) => `Souhaitez-vous renouveler pour un mois de plus à ${p} € ? Il suffit de répondre à cet e-mail et nous vous recontactons.`,
    after: 'Sans renouvellement, votre page reste visible avec le nom, l’adresse et le téléphone seulement, sans logo, sans photos et sans place dans « Nos coups de cœur ».',
    page: 'Votre page sur Dalilak :', bye: 'Bien à vous,\nL’équipe Dalilak',
  },
  nl: {
    subject: (d: ReminderData) => `Dalilak: het abonnement van ‘${d.name}’ loopt af over ${d.daysLeft} dag${d.daysLeft === 1 ? '' : 'en'}`,
    hello: 'Hallo,',
    intro: (d: ReminderData, end: string) => `Het ‘Gesponsord’-abonnement van ‘${d.name}’ op Dalilak loopt af op ${end}, dus over ${d.daysLeft} dag${d.daysLeft === 1 ? '' : 'en'}.`,
    statsTitle: (from: string, to: string) => `Statistieken van je pagina van ${from} tot ${to}:`,
    views: 'Paginaweergaven', calls: 'Klikken op het telefoonnummer', directions: 'Klikken op het adres / de route',
    ask: (p: string) => `Wil je verlengen voor nog een maand aan ${p} euro? Antwoord gewoon op deze e-mail en we nemen contact op.`,
    after: 'Zonder verlenging blijft je pagina zichtbaar met alleen naam, adres en telefoon, zonder logo, foto’s en plaats in ‘Onze favorieten’.',
    page: 'Je pagina op Dalilak:', bye: 'Met vriendelijke groeten,\nHet Dalilak-team',
  },
  en: {
    subject: (d: ReminderData) => `Dalilak: the subscription for “${d.name}” ends in ${d.daysLeft} day${d.daysLeft === 1 ? '' : 's'}`,
    hello: 'Hello,',
    intro: (d: ReminderData, end: string) => `The Featured subscription for “${d.name}” on Dalilak ends on ${end}, in ${d.daysLeft} day${d.daysLeft === 1 ? '' : 's'}.`,
    statsTitle: (from: string, to: string) => `Your page’s statistics from ${from} to ${to}:`,
    views: 'Page views', calls: 'Taps on the phone number', directions: 'Taps on the address / directions',
    ask: (p: string) => `Would you like to renew for another month at ${p} EUR? Just reply to this email and we will get back to you.`,
    after: 'If it is not renewed, your page stays visible with name, address and phone only, without logo, photos or a place in “Our favourites”.',
    page: 'Your page on Dalilak:', bye: 'Kind regards,\nThe Dalilak team',
  },
} as const

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function renderReminder(d: ReminderData): { subject: string; text: string; html: string } {
  const t = T[d.lang] ?? T.ar
  const lang: EmailLang = T[d.lang] ? d.lang : 'ar'
  const end = fmtDate(d.endsOn, lang)
  const from = fmtDate(d.periodStart, lang)
  const to = fmtDate(d.today, lang)
  const rows: [string, number][] = [[t.views, d.stats.views], [t.calls, d.stats.calls], [t.directions, d.stats.directions]]
  const subject = `${d.test ? '[TEST] ' : ''}${t.subject(d)}`

  const text = [
    t.hello, '',
    t.intro(d, end), '',
    t.statsTitle(from, to),
    ...rows.map(([k, v]) => `- ${k}: ${fmtNum(v, lang)}`), '',
    t.ask(d.priceEur), '',
    t.after, '',
    ...(d.pageUrl ? [t.page, d.pageUrl, ''] : []),
    t.bye,
  ].join('\n')

  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const html = `<!doctype html><html lang="${lang}" dir="${dir}"><body style="margin:0;background:#f6f8f7;font-family:Arial,Tahoma,sans-serif;color:#13201f">
<div style="max-width:560px;margin:0 auto;padding:20px">
<div style="background:#0b5d5b;color:#fff;padding:14px 18px;border-radius:12px 12px 0 0;font-size:20px;font-weight:bold">${lang === 'ar' ? 'دليلك' : 'Dalilak'}</div>
<div dir="${dir}" style="background:#fff;padding:18px;border-radius:0 0 12px 12px;line-height:1.6;text-align:${lang === 'ar' ? 'right' : 'left'}">
<p>${esc(t.hello)}</p>
<p>${esc(t.intro(d, end))}</p>
<p style="margin-bottom:6px"><b>${esc(t.statsTitle(from, to))}</b></p>
<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:14px">
${rows.map(([k, v]) => `<tr><td style="padding:8px;border-bottom:1px solid #dbe4e2">${esc(k)}</td><td style="padding:8px;border-bottom:1px solid #dbe4e2;font-weight:bold;font-size:18px;color:#0b5d5b;text-align:center">${fmtNum(v, lang)}</td></tr>`).join('\n')}
</table>
<p style="background:#fbedd6;padding:12px;border-radius:8px"><b>${esc(t.ask(d.priceEur))}</b></p>
<p style="color:#5b6b69;font-size:14px">${esc(t.after)}</p>
${d.pageUrl ? `<p>${esc(t.page)} <a href="${esc(d.pageUrl)}" style="color:#0b5d5b">${esc(d.pageUrl)}</a></p>` : ''}
<p>${esc(t.bye).replace('\n', '<br>')}</p>
</div></div></body></html>`
  return { subject, text, html }
}
