// Translations of the Arabic business-type labels found in the data (`t`).
// Unknown labels fall back to the Arabic text.
import type { Lang } from '../i18n/langs'

type Tr = Record<Exclude<Lang, 'ar'>, string>

export const TYPE_LABELS: Record<string, Tr> = {
  'مسجد': { fr: 'Mosquée', nl: 'Moskee', en: 'Mosque' },
  'ملحمة': { fr: 'Boucherie halal', nl: 'Halal slagerij', en: 'Halal butcher' },
  'محامي': { fr: 'Avocat', nl: 'Advocaat', en: 'Lawyer' },
  'مطعم': { fr: 'Restaurant', nl: 'Restaurant', en: 'Restaurant' },
  'ملابس وقفاطين': { fr: 'Vêtements et caftans', nl: 'Kleding en kaftans', en: 'Clothing & kaftans' },
  'حلويات': { fr: 'Pâtisserie orientale', nl: 'Oosterse patisserie', en: 'Middle Eastern sweets' },
  'جمعية': { fr: 'Association', nl: 'Vereniging', en: 'Association' },
  'مطعم لبناني': { fr: 'Restaurant libanais', nl: 'Libanees restaurant', en: 'Lebanese restaurant' },
  'طبيب عام': { fr: 'Médecin généraliste', nl: 'Huisarts', en: 'General practitioner' },
  'سوبرماركت': { fr: 'Supermarché', nl: 'Supermarkt', en: 'Supermarket' },
  'مطعم سوري': { fr: 'Restaurant syrien', nl: 'Syrisch restaurant', en: 'Syrian restaurant' },
  'حلاقة': { fr: 'Coiffeur / barbier', nl: 'Kapper / barbier', en: 'Barber' },
  'طبيب أسنان': { fr: 'Dentiste', nl: 'Tandarts', en: 'Dentist' },
  'سفر وتحويل': { fr: 'Voyages et transferts d’argent', nl: 'Reizen en geldtransfers', en: 'Travel & money transfer' },
  'أخصائي نفسي': { fr: 'Psychologue', nl: 'Psycholoog', en: 'Psychologist' },
  'مترجم': { fr: 'Traducteur', nl: 'Vertaler', en: 'Translator' },
  'جمعية أو مدرسة': { fr: 'Association ou école', nl: 'Vereniging of school', en: 'Association or school' },
  'نساء وأطفال': { fr: 'Femmes et enfants', nl: 'Vrouwen en kinderen', en: 'Women & children' },
  'بقالة': { fr: 'Épicerie', nl: 'Kruidenier', en: 'Grocery' },
  'مطعم أردني': { fr: 'Restaurant jordanien', nl: 'Jordaans restaurant', en: 'Jordanian restaurant' },
  'محل': { fr: 'Commerce', nl: 'Winkel', en: 'Shop' },
  'مشاوي': { fr: 'Grillades', nl: 'Grill', en: 'Grill' },
  'محاسب': { fr: 'Comptable', nl: 'Boekhouder', en: 'Accountant' },
}

export function typeLabel(label: string | null | undefined, lang: Lang): string {
  if (!label) return ''
  if (lang === 'ar') return label
  return TYPE_LABELS[label]?.[lang] ?? label
}
