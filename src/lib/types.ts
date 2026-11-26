export interface Listing {
  id: number
  slug: string
  name: string
  category: string
  type_label: string | null
  province: string
  city: string | null
  address: string | null
  phone: string | null
  website: string | null
  rating_google: number | null
  reviews_google: number
  lat: number | null
  lng: number | null
  languages: string[]
  language_verified: boolean
  status: 'active' | 'pending' | 'hidden'
  is_premium: boolean
  premium_until: string | null
  is_verified: boolean
  logo_path: string | null
  description: Record<string, string>
  offer_text: Record<string, string>
  owner_id: string | null
  source: 'google_maps' | 'owner' | 'admin'
  app_rating_avg: number | null
  app_reviews_count: number
  /** computed column: premium and not expired */
  premium_active: boolean
}

export interface Review {
  id: number
  stars: number
  text: string | null
  author: string
  owner_reply: string | null
  owner_replied_at: string | null
  created_at: string
  is_mine: boolean
}

export interface Photo {
  id: number
  kind: 'logo' | 'gallery'
  storage_path: string
  sort_order: number
}

export interface Filters {
  q: string
  category: string | null
  province: string | null
}
