export interface TripCollection {
  id: string
  title: string
  description?: string
  cover_image?: string
  created_at: string
  trips?: Trip[] 
}

export interface Trip {
  id: string
  user_id: string
  title: string
  destination: string
  start_date: string
  end_date: string
  accommodation_info?: string
  image_url?: string
  collection_id?: string | null
  order_index?: number
  owner?: {
    full_name?: string
    email: string
    avatar_url?: string
  }
  trip_collaborators?: { user_id: string; status: string}[]
}