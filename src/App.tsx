import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Dumbbell,
  LogOut,
  MapPin,
  Menu,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { Booking, TrainingSlot } from './lib/types'
import './App.css'

type Screen = 'overview' | 'training' | 'bookings'

const navigation: { id: Screen; label: string; icon: typeof CalendarDays }[] = [
  { id: 'overview', label: 'Overview', icon: CalendarDays },
  { id: 'training', label: 'Training', icon: Dumbbell },
  { id: 'bookings', label: 'My bookings', icon: Check },
]

function firstName(user: User) {
  const name = user.user_metadata.full_name ?? user.user_metadata.name ?? ''
  return name.trim().split(/\s+/)[0] || user.email?.split('@')[0] || 'there'
}

function initials(user: User) {
  const name = user.user_metadata.full_name ?? user.user_metadata.name ?? user.email ?? 'K'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join('')
}

function formatDate(date: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...options,
  }).format(new Date(`${date}T12:00:00`))
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  const suffix = hours >= 12 ? 'pm' : 'am'
  const hour = hours % 12 || 12
  return `${hour}:${String(minutes).padStart(2, '0')} ${suffix}`
}

async function fetchMemberData(memberId: string) {
  const client = supabase
  if (!client) throw new Error('Supabase is not configured.')

  const [slotsResult, bookingsResult] = await Promise.all([
    client.rpc('get_available_training_slots'),
    client
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
    ? await client
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

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(() => Boolean(supabase))
  const [screen, setScreen] = useState<Screen>('overview')
  const [slots, setSlots] = useState<TrainingSlot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadedMemberId, setLoadedMemberId] = useState<string | null>(null)
  const [busySlot, setBusySlot] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; kind: 'success' | 'error' } | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [signInError, setSignInError] = useState('')
  const [now] = useState(() => new Date())
  const dataLoading = Boolean(user && loadedMemberId !== user.id)

  useEffect(() => {
    const client = supabase
    if (!client) return

    let active = true
    let appUrlListener: PluginListenerHandle | undefined
    client.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setSignInError(error.message)
      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    })

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    if (Capacitor.isNativePlatform()) {
      void CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
        let callbackUrl: URL
        try {
          callbackUrl = new URL(url)
        } catch {
          setSignInError('Google sign-in returned an invalid callback URL.')
          return
        }

        if (callbackUrl.protocol !== 'com.riversidefc.kickoffs:' || callbackUrl.host !== 'auth') return
        const code = callbackUrl.searchParams.get('code')
        if (!code) {
          setSignInError('Google sign-in did not return an authorization code. Please try again.')
          return
        }

        try {
          await Browser.close()
          const { error } = await client.auth.exchangeCodeForSession(code)
          if (error) setSignInError(error.message)
        } catch (error) {
          setSignInError(error instanceof Error ? error.message : 'Google sign-in could not be completed.')
        }
      }).then((listener) => {
        if (active) appUrlListener = listener
        else void listener.remove()
      })
    }

    return () => {
      active = false
      listener.subscription.unsubscribe()
      if (appUrlListener) void appUrlListener.remove()
    }
  }, [])

  const loadMemberData = useCallback(async () => {
    if (!supabase || !user) return

    try {
      const data = await fetchMemberData(user.id)
      setSlots(data.slots)
      setBookings(data.bookings)
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : 'Could not load your club schedule.',
        kind: 'error',
      })
    }
    setLoadedMemberId(user.id)
  }, [user])

  useEffect(() => {
    if (!user) return
    let active = true
    void fetchMemberData(user.id).then(
      (data) => {
        if (!active) return
        setSlots(data.slots)
        setBookings(data.bookings)
        setLoadedMemberId(user.id)
      },
      (error: unknown) => {
        if (!active) return
        setMessage({
          text: error instanceof Error ? error.message : 'Could not load your club schedule.',
          kind: 'error',
        })
        setLoadedMemberId(user.id)
      },
    )
    return () => {
      active = false
    }
  }, [user])

  const upcomingBookings = useMemo(() => {
    const today = now.toISOString().slice(0, 10)
    return bookings.filter((booking) => booking.slot.training_date >= today)
  }, [bookings, now])

  async function signInWithGoogle() {
    if (!supabase) return
    setSignInError('')
    const isNative = Capacitor.isNativePlatform()
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: isNative ? 'com.riversidefc.kickoffs://auth/callback' : window.location.origin,
          skipBrowserRedirect: isNative,
        },
      })
      if (error) {
        setSignInError(error.message)
        return
      }
      if (isNative && data.url) await Browser.open({ url: data.url })
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : 'Google sign-in could not be opened.')
    }
  }

  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setMessage({ text: error.message, kind: 'error' })
  }

  async function bookSlot(slot: TrainingSlot) {
    if (!supabase) return
    setBusySlot(slot.slot_id)
    setMessage(null)

    const { data, error } = await supabase.functions.invoke('book-training', {
      body: { slotId: slot.slot_id },
    })

    if (error) {
      let errorCode = ''
      if (error.context instanceof Response) {
        const body: { error?: string } = await error.context.json().catch(() => ({}))
        errorCode = body.error ?? ''
      }
      const errorText: Record<string, string> = {
        booking_exists: 'You already have a place in this session.',
        slot_full: 'That session has just filled up. Please choose another one.',
        slot_has_passed: 'That session has already started. Please choose another one.',
        slot_not_found: 'That session is no longer available. Please refresh and try again.',
      }
      setMessage({
        text: errorText[errorCode] ?? error.message ?? 'We could not complete that booking. Please try again.',
        kind: 'error',
      })
      setBusySlot(null)
      return
    }

    setMessage({
      text: data?.emailSent
        ? `You're booked for ${formatDate(slot.training_date)} at ${formatTime(slot.starts_at)}. A confirmation is on its way.`
        : 'Your place is confirmed. We could not send the email just now, so please check with the club if you need a copy.',
      kind: 'success',
    })
    await loadMemberData()
    setBusySlot(null)
  }

  if (authLoading) {
    return (
      <main className="loading-screen" aria-label="Loading Kickoffs">
        <BrandMark />
        <span className="loader" />
      </main>
    )
  }

  if (!user || !supabase) {
    return (
      <SignInScreen
        configured={Boolean(supabase)}
        error={signInError}
        onSignIn={() => void signInWithGoogle()}
      />
    )
  }

  const greetingName = firstName(user)
  const displayName = user.user_metadata.full_name ?? user.user_metadata.name ?? user.email ?? 'Club member'

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <a className="brand" href="#overview" onClick={() => setScreen('overview')}>
            <BrandMark />
            <span className="brand-word">kickoffs<span>.</span></span>
          </a>
          <button
            type="button"
            className="icon-button mobile-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <div className="club-switcher">
          <span className="club-crest"><span>FC</span></span>
          <span className="club-copy"><strong>Your Club</strong><small>Members' area</small></span>
          <ChevronRight className="club-chevron" size={16} />
        </div>

        <p className="nav-caption">YOUR CLUB</p>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={`nav-link ${screen === id ? 'nav-link-active' : ''}`}
              onClick={() => {
                setScreen(id)
                setMobileMenuOpen(false)
              }}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {id === 'bookings' && upcomingBookings.length > 0 && (
                <span className="nav-count">{upcomingBookings.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <div className="note-icon"><Sparkles size={16} /></div>
          <strong>Good football starts here.</strong>
          <p>See you out on the pitch.</p>
          <span className="note-ball" aria-hidden="true">⚽</span>
        </div>

        <div className="member-profile">
          <span className="avatar">{initials(user)}</span>
          <span className="member-copy"><strong>{displayName}</strong><small>Club member</small></span>
          <button type="button" className="icon-button signout-button" onClick={() => void signOut()} aria-label="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {mobileMenuOpen && <button className="scrim" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" />}

      <main className="main-content">
        <header className="topbar">
          <button type="button" className="icon-button mobile-menu-button" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation">
            <Menu size={21} />
          </button>
          <p className="breadcrumb">Your Club <span>/</span> {navigation.find((item) => item.id === screen)?.label}</p>
          <div className="topbar-right">
            <span className="today-label">{new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)}</span>
            <span className="avatar avatar-small">{initials(user)}</span>
          </div>
        </header>

        <div className="page-wrap">
          {message && (
            <div className={`notice notice-${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
              {message.kind === 'success' ? <Check size={18} /> : <ShieldCheck size={18} />}
              <span>{message.text}</span>
              <button type="button" className="notice-dismiss" onClick={() => setMessage(null)} aria-label="Dismiss message">
                <X size={16} />
              </button>
            </div>
          )}

          {screen === 'overview' && (
            <Overview
              name={greetingName}
              slots={slots}
              bookings={upcomingBookings}
              loading={dataLoading}
              busySlot={busySlot}
              onBook={(slot) => void bookSlot(slot)}
              onViewTraining={() => setScreen('training')}
              onViewBookings={() => setScreen('bookings')}
            />
          )}
          {screen === 'training' && (
            <Training
              slots={slots}
              bookings={bookings}
              loading={dataLoading}
              busySlot={busySlot}
              onBook={(slot) => void bookSlot(slot)}
            />
          )}
          {screen === 'bookings' && <Bookings bookings={upcomingBookings} loading={dataLoading} onFindTraining={() => setScreen('training')} />}
        </div>

        <footer className="page-footer">
          <span>Your football club</span>
          <span>Questions? Ask your team manager.</span>
        </footer>
      </main>

      <nav className="mobile-tabs" aria-label="Mobile navigation">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button type="button" key={id} className={screen === id ? 'mobile-tab-active' : ''} onClick={() => setScreen(id)}>
            <Icon size={19} />
            <span>{label === 'Overview' ? 'Home' : label === 'My bookings' ? 'Bookings' : label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span className="brand-mark-line" />
      <span className="brand-mark-dot" />
    </span>
  )
}

function SignInScreen({ configured, error, onSignIn }: { configured: boolean; error: string; onSignIn: () => void }) {
  return (
    <main className="signin-layout">
      <section className="signin-panel">
        <div className="signin-brand"><BrandMark /><span className="brand-word">kickoffs<span>.</span></span></div>
        <div className="signin-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> CLUB MEMBERS</span>
          <h1>Your next<br />good session<br /><em>starts here.</em></h1>
          <p>Book your place, turn up ready, and get back to the best bit of football.</p>
          {configured ? (
            <>
              <button type="button" className="google-button" onClick={onSignIn}>
                <GoogleMark />
                <span>Continue with Google</span>
                <ArrowRight size={18} />
              </button>
              {error && <p className="signin-error" role="alert">{error}</p>}
              <p className="privacy-note"><ShieldCheck size={15} /> Only club members can book sessions.</p>
            </>
          ) : (
            <div className="setup-notice">
              <strong>Almost ready to kick off</strong>
              <p>Add your Supabase project URL and publishable key to <code>.env.local</code>, then follow the setup steps in the README.</p>
            </div>
          )}
        </div>
        <div className="signin-bottom">
          <span>Made for the people who show up.</span>
          <span>YOUR CLUB · YOUR GAME</span>
        </div>
      </section>
      <section className="signin-art" aria-label="Football pitch illustration">
        <div className="art-topline"><span>WEEK IN, WEEK OUT</span><span>FOOTBALL&nbsp; · &nbsp;COMMUNITY</span></div>
        <div className="pitch-frame">
          <div className="pitch-line pitch-midline" />
          <div className="pitch-circle" />
          <div className="pitch-box pitch-box-top" />
          <div className="pitch-box pitch-box-bottom" />
          <div className="pitch-goal pitch-goal-top" />
          <div className="pitch-goal pitch-goal-bottom" />
          <span className="pitch-dot pitch-dot-one" />
          <span className="pitch-dot pitch-dot-two" />
          <span className="pitch-dot pitch-dot-three" />
        </div>
        <div className="art-caption"><span>A PLACE ON THE PITCH<br /><strong>IS A PLACE WITH US.</strong></span><ArrowDownRight size={26} /></div>
        <div className="art-stamp">R<br /><span>F</span><br />C</div>
      </section>
    </main>
  )
}

function Overview({
  name,
  slots,
  bookings,
  loading,
  busySlot,
  onBook,
  onViewTraining,
  onViewBookings,
}: {
  name: string
  slots: TrainingSlot[]
  bookings: Booking[]
  loading: boolean
  busySlot: string | null
  onBook: (slot: TrainingSlot) => void
  onViewTraining: () => void
  onViewBookings: () => void
}) {
  const featuredSlot = slots[0]
  const nextBooking = bookings[0]

  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow eyebrow-dark">YOUR CLUB, YOUR CALENDAR</p>
          <h1>Good to see you, {name}<span className="wave">.</span></h1>
          <p className="welcome-subtitle">A little time on the pitch goes a long way.</p>
        </div>
        <div className="week-chip"><CalendarDays size={16} /><span>This week</span><ChevronRight size={15} /></div>
      </section>

      <section className="hero-grid">
        <div className="pitch-card">
          <div className="pitch-card-lines">
            <span className="card-center-line" /><span className="card-center-circle" />
            <span className="card-box card-box-left" /><span className="card-box card-box-right" />
          </div>
          <div className="pitch-card-content">
            <span className="card-kicker"><span className="live-dot" /> NEXT SESSION</span>
            <h2>{nextBooking ? 'You’re back on the pitch.' : 'The pitch is calling.'}</h2>
            <p>{nextBooking ? 'Your next session is all set. Bring your boots and your best.' : 'Find a session that fits your week and save your place.'}</p>
            {nextBooking ? (
              <div className="featured-session">
                <span className="featured-date">{formatDate(nextBooking.slot.training_date, { weekday: 'short', day: 'numeric' })}</span>
                <span className="featured-divider" />
                <span><strong>{formatTime(nextBooking.slot.starts_at)}</strong><small>{nextBooking.slot.session_name}</small></span>
              </div>
            ) : featuredSlot ? (
              <div className="featured-session">
                <span className="featured-date">{formatDate(featuredSlot.training_date, { weekday: 'short', day: 'numeric' })}</span>
                <span className="featured-divider" />
                <span><strong>{formatTime(featuredSlot.starts_at)}</strong><small>{featuredSlot.session_name}</small></span>
              </div>
            ) : (
              <span className="no-session">More sessions are being added soon.</span>
            )}
            <button type="button" className="button-lime" onClick={onViewTraining}>
              {nextBooking ? 'See all sessions' : 'Find a session'} <ArrowRight size={17} />
            </button>
          </div>
          <span className="pitch-card-watermark">R<span>F</span>C</span>
        </div>

        <div className="member-card">
          <div className="member-card-top"><span className="card-kicker card-kicker-muted">YOUR SEASON</span><span className="mini-status"><span /> ACTIVE</span></div>
          <div className="season-number">{String(bookings.length).padStart(2, '0')}<span> sessions<br />booked ahead</span></div>
          <div className="member-card-bottom"><span>Every session counts.</span><UsersRound size={18} /></div>
          <div className="member-progress"><span style={{ width: `${Math.min(bookings.length * 18, 100)}%` }} /></div>
          <p className="member-card-note">{bookings.length === 0 ? 'Your season starts with one booking.' : 'Keep finding time for the game.'}</p>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow eyebrow-dark">GET OUT THERE</p><h2>Coming up at the club</h2></div>
          <button type="button" className="text-link" onClick={onViewTraining}>All training <ArrowRight size={16} /></button>
        </div>
        {loading ? <LoadingLine /> : slots.length > 0 ? (
          <div className="session-list">
            {slots.slice(0, 3).map((slot, index) => (
              <SessionCard key={slot.slot_id} slot={slot} index={index} busy={busySlot === slot.slot_id} onBook={onBook} />
            ))}
          </div>
        ) : <EmptyState title="No sessions on the calendar just yet" detail="Check back soon — your team manager will add the next training dates." />}
      </section>

      <section className="next-bookings-row">
        <div className="section-heading compact-heading">
          <div><p className="eyebrow eyebrow-dark">LOCKED IN</p><h2>Your next booking</h2></div>
          <button type="button" className="text-link" onClick={onViewBookings}>My bookings <ArrowRight size={16} /></button>
        </div>
        {loading ? <LoadingLine /> : bookings[0] ? (
          <div className="booking-strip">
            <span className="booking-calendar"><strong>{new Date(`${bookings[0].slot.training_date}T12:00:00`).getDate()}</strong><small>{new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date(`${bookings[0].slot.training_date}T12:00:00`)).toUpperCase()}</small></span>
            <span className="booking-strip-copy"><strong>{bookings[0].slot.session_name}</strong><small>{formatDate(bookings[0].slot.training_date)} · {formatTime(bookings[0].slot.starts_at)} · {bookings[0].slot.location}</small></span>
            <span className="confirmed-pill"><Check size={14} /> Confirmed</span>
            <button type="button" className="arrow-circle" onClick={onViewBookings} aria-label="View all bookings"><ArrowRight size={17} /></button>
          </div>
        ) : (
          <div className="empty-booking"><span className="empty-booking-icon"><CalendarDays size={20} /></span><span><strong>No bookings yet</strong><small>Pick a session above to get started.</small></span><button type="button" className="text-link" onClick={onViewTraining}>Browse training <ArrowRight size={15} /></button></div>
        )}
      </section>
    </>
  )
}

function Training({
  slots,
  bookings,
  loading,
  busySlot,
  onBook,
}: {
  slots: TrainingSlot[]
  bookings: Booking[]
  loading: boolean
  busySlot: string | null
  onBook: (slot: TrainingSlot) => void
}) {
  const bookedIds = new Set(bookings.map((booking) => booking.slot_id))
  const groupedSlots = slots.reduce<Record<string, TrainingSlot[]>>((groups, slot) => {
    groups[slot.training_date] ??= []
    groups[slot.training_date].push(slot)
    return groups
  }, {})

  return (
    <>
      <section className="welcome-row page-title-row">
        <div>
          <p className="eyebrow eyebrow-dark">MAKE A LITTLE ROOM FOR FOOTBALL</p>
          <h1>Training <span className="wave">.</span></h1>
          <p className="welcome-subtitle">Choose a session, book your spot, and we’ll see you there.</p>
        </div>
        <div className="week-chip"><Clock3 size={16} /><span>Open sessions</span></div>
      </section>
      <section className="section-block training-page-list">
        <div className="section-heading">
          <div><p className="eyebrow eyebrow-dark">UP NEXT</p><h2>Find your next session</h2></div>
          <span className="sessions-count">{slots.length} {slots.length === 1 ? 'session' : 'sessions'} available</span>
        </div>
        {loading ? <LoadingLine /> : slots.length > 0 ? (
          Object.entries(groupedSlots).map(([date, dateSlots]) => (
            <div className="date-group" key={date}>
              <h3>{formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              <div className="session-list">
                {dateSlots.map((slot, index) => (
                  <SessionCard
                    key={slot.slot_id}
                    slot={slot}
                    index={index}
                    booked={bookedIds.has(slot.slot_id)}
                    busy={busySlot === slot.slot_id}
                    onBook={onBook}
                  />
                ))}
              </div>
            </div>
          ))
        ) : <EmptyState title="No open sessions right now" detail="There aren’t any sessions available to book. Your team manager may add more soon." />}
      </section>
      <div className="help-note"><span className="help-note-mark">i</span><span><strong>Need to change your plans?</strong> Speak to your team manager and they’ll help you update a booking.</span></div>
    </>
  )
}

function Bookings({ bookings, loading, onFindTraining }: { bookings: Booking[]; loading: boolean; onFindTraining: () => void }) {
  return (
    <>
      <section className="welcome-row page-title-row">
        <div>
          <p className="eyebrow eyebrow-dark">YOUR TIME ON THE PITCH</p>
          <h1>My bookings <span className="wave">.</span></h1>
          <p className="welcome-subtitle">All your upcoming sessions, in one place.</p>
        </div>
        <span className="confirmed-pill"><Check size={14} /> {bookings.length} upcoming</span>
      </section>
      <section className="section-block bookings-page-list">
        <div className="section-heading">
          <div><p className="eyebrow eyebrow-dark">COMING UP</p><h2>Confirmed sessions</h2></div>
          <button type="button" className="text-link" onClick={onFindTraining}>Find training <ArrowRight size={16} /></button>
        </div>
        {loading ? <LoadingLine /> : bookings.length > 0 ? (
          <div className="booking-cards">
            {bookings.map((booking) => (
              <article className="booking-card" key={booking.id}>
                <div className="booking-card-date">
                  <span>{new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(new Date(`${booking.slot.training_date}T12:00:00`)).toUpperCase()}</span>
                  <strong>{new Date(`${booking.slot.training_date}T12:00:00`).getDate()}</strong>
                  <small>{new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date(`${booking.slot.training_date}T12:00:00`)).toUpperCase()}</small>
                </div>
                <div className="booking-card-details">
                  <span className="confirmed-pill"><Check size={13} /> Confirmed</span>
                  <h3>{booking.slot.session_name}</h3>
                  <p><Clock3 size={15} /> {formatTime(booking.slot.starts_at)} · {booking.slot.duration_minutes} min</p>
                  <p><MapPin size={15} /> {booking.slot.location}</p>
                </div>
                <div className="booking-card-sport"><Dumbbell size={19} /><span>TRAINING</span></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="no-bookings">
            <span className="no-bookings-icon"><CalendarDays size={25} /></span>
            <h3>Nothing booked yet</h3>
            <p>Take a look at the upcoming sessions and save your place.</p>
            <button type="button" className="button-dark" onClick={onFindTraining}>Browse training <ArrowRight size={17} /></button>
          </div>
        )}
      </section>
    </>
  )
}

function SessionCard({
  slot,
  index,
  booked = false,
  busy,
  onBook,
}: {
  slot: TrainingSlot
  index: number
  booked?: boolean
  busy: boolean
  onBook: (slot: TrainingSlot) => void
}) {
  const count = typeof slot.spots_left === 'number' ? slot.spots_left : null
  return (
    <article className="session-card">
      <div className={`session-date-tile date-tile-${index % 3}`}>
        <span>{new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(new Date(`${slot.training_date}T12:00:00`)).toUpperCase()}</span>
        <strong>{new Date(`${slot.training_date}T12:00:00`).getDate()}</strong>
        <small>{new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date(`${slot.training_date}T12:00:00`)).toUpperCase()}</small>
      </div>
      <div className="session-details">
        <span className="session-category"><span /> FIRST TEAM</span>
        <h3>{slot.session_name}</h3>
        <div className="session-meta">
          <span><Clock3 size={14} /> {formatTime(slot.starts_at)} · {slot.duration_minutes} min</span>
          <span><MapPin size={14} /> {slot.location}</span>
        </div>
      </div>
      <div className="session-capacity">
        {count !== null && <><strong>{count}</strong><span>spots left</span></>}
      </div>
      <button
        type="button"
        className={`book-button ${booked ? 'book-button-done' : ''}`}
        disabled={booked || busy}
        onClick={() => onBook(slot)}
      >
        {busy ? <span className="button-spinner" /> : booked ? <><Check size={16} /> Booked</> : <>Book spot <ArrowRight size={16} /></>}
      </button>
    </article>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon"><CalendarDays size={22} /></span>
      <div><strong>{title}</strong><p>{detail}</p></div>
    </div>
  )
}

function LoadingLine() {
  return <div className="loading-line"><span className="loader loader-small" /> Loading your club schedule…</div>
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="google-mark">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94a11.05 11.05 0 0 1-4.8 7.24l7.73 6C44.38 38.12 46.98 31.91 46.98 24.55Z" />
      <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19Z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.44-4.89 2.3-8.17 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
    </svg>
  )
}

export default App
