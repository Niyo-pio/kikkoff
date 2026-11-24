import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { supabase } from '../lib/supabase'
import type { Booking, TrainingSlot } from '../../../src/lib/types'
import { useAuth } from './AuthProvider'

export type Notice = { text: string; kind: 'success' | 'error' } | null

type MemberContextValue = {
  slots: TrainingSlot[]
  bookings: Booking[]
  loading: boolean
  busySlot: string | null
  notice: Notice
  clearNotice: () => void
  bookSlot: (slot: TrainingSlot) => Promise<void>
}

const MemberContext = createContext<MemberContextValue | null>(null)

async function fetchMemberData(memberId: string) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const [slotsResult, bookingsResult] = await Promise.all([
    supabase.rpc('get_available_training_slots'),
    supabase
      .from('bookings')
      .select('id, slot_id, status, created_at')
      .eq('member_id', memberId)
      .eq('status', 'confirmed'),
  ])
  if (slotsResult.error) throw new Error(slotsResult.error.message)
  if (bookingsResult.error) throw new Error(bookingsResult.error.message)

  const memberBookings = bookingsResult.data ?? []
  const bookedSlotIds = [...new Set(memberBookings.map((booking) => booking.slot_id))]
  const bookedSlotsResult = bookedSlotIds.length
    ? await supabase
        .from('training_slots')
        .select('id, session_name, training_date, starts_at, duration_minutes, capacity, location')
        .in('id', bookedSlotIds)
    : { data: [], error: null }
  if (bookedSlotsResult.error) throw new Error(bookedSlotsResult.error.message)

  const bookedSlots = new Map((bookedSlotsResult.data ?? []).map((slot) => [slot.id, slot]))
  const bookings = memberBookings
    .map((booking) => {
      const slot = bookedSlots.get(booking.slot_id)
      return slot ? { ...booking, slot } : null
    })
    .filter((booking): booking is Booking => booking !== null)
    .sort((a, b) => `${a.slot.training_date}${a.slot.starts_at}`.localeCompare(`${b.slot.training_date}${b.slot.starts_at}`))

  return { slots: slotsResult.data ?? [], bookings }
}

export function MemberProvider({ children }: PropsWithChildren) {
  const { user } = useAuth()
  const [slots, setSlots] = useState<TrainingSlot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null)
  const [busySlot, setBusySlot] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice>(null)
  const loading = Boolean(user && loadedUserId !== user.id)

  const refresh = useCallback(async () => {
    if (!user) return
    const data = await fetchMemberData(user.id)
    setSlots(data.slots)
    setBookings(data.bookings)
    setLoadedUserId(user.id)
  }, [user])

  useEffect(() => {
    if (!user) return

    let active = true
    void fetchMemberData(user.id).then(
      (data) => {
        if (!active) return
        setSlots(data.slots)
        setBookings(data.bookings)
        setLoadedUserId(user.id)
      },
      (error: unknown) => {
        if (!active) return
        setNotice({
          text: error instanceof Error ? error.message : 'Could not load the club schedule.',
          kind: 'error',
        })
        setLoadedUserId(user.id)
      },
    )
    return () => {
      active = false
    }
  }, [user])

  const bookSlot = useCallback(async (slot: TrainingSlot) => {
    if (!supabase) return
    setBusySlot(slot.slot_id)
    setNotice(null)

    try {
      const { data, error } = await supabase.functions.invoke('book-training', {
        body: { slotId: slot.slot_id },
      })
      if (error) {
        let errorCode = ''
        if (error.context instanceof Response) {
          const body: { error?: string } = await error.context.json().catch(() => ({}))
          errorCode = body.error ?? ''
        }
        const messages: Record<string, string> = {
          booking_exists: 'You already have a place in this session.',
          slot_full: 'That session has just filled up. Please choose another one.',
          slot_has_passed: 'That session has already started. Please choose another one.',
          slot_not_found: 'That session is no longer available. Please refresh and try again.',
        }
        throw new Error(messages[errorCode] ?? error.message ?? 'We could not complete that booking. Please try again.')
      }

      setNotice({
        text: data?.emailSent
          ? 'Your place is confirmed. A confirmation email is on its way.'
          : 'Your place is confirmed, but we could not send the email. Please check with the club if you need a copy.',
        kind: 'success',
      })
      await refresh()
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : 'We could not complete that booking. Please try again.',
        kind: 'error',
      })
    } finally {
      setBusySlot(null)
    }
  }, [refresh])

  const value = useMemo(
    () => ({
      slots,
      bookings,
      loading,
      busySlot,
      notice,
      clearNotice: () => setNotice(null),
      bookSlot,
    }),
    [slots, bookings, loading, busySlot, notice, bookSlot],
  )

  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>
}

export function useMember() {
  const context = useContext(MemberContext)
  if (!context) throw new Error('useMember must be used within MemberProvider.')
  return context
}
