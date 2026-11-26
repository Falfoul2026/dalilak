import { useT } from '../i18n'

/** Paid placement must always be visible as such (EU law). */
export const FeaturedBadge = () => <span className="badge badge--featured">{useT()('labels.featured')}</span>
export const VerifiedBadge = () => <span className="badge badge--verified">✓ {useT()('labels.verified')}</span>
export const VerifyArabicTag = () => <span className="badge badge--verify">{useT()('labels.verifyArabic')}</span>
