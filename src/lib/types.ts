export type TrainingSlot = {
  slot_id: string
  session_name: string
  training_date: string
  starts_at: string
  duration_minutes: number
  capacity?: number
  location: string
  spots_left?: number
}

export type Booking = {
  id: string
  slot_id: string
  status: string
  created_at: string
  slot: {
    id: string
    session_name: string
    training_date: string
    starts_at: string
    duration_minutes: number
    capacity: number
    location: string
  }
}
