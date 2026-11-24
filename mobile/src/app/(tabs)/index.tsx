import { useMemo } from 'react'
import { router } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ArrowRight, LogOut, MapPin, UsersRound } from 'lucide-react-native'
import { BookingCard } from '../../components/BookingCard'
import { Brand } from '../../components/Brand'
import { EmptyState } from '../../components/EmptyState'
import { NoticeBanner } from '../../components/NoticeBanner'
import { Screen } from '../../components/Screen'
import { SessionCard } from '../../components/SessionCard'
import { firstName } from '../../lib/format'
import { useAuth } from '../../providers/AuthProvider'
import { useMember } from '../../providers/MemberProvider'
import { colors } from '../../theme'

export default function HomeScreen() {
  const { user, signOut } = useAuth()
  const { slots, bookings, loading, busySlot, notice, clearNotice, bookSlot } = useMember()
  const upcomingBookings = useMemo(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    return bookings.filter((booking) => booking.slot.training_date >= today)
  }, [bookings])
  const name = firstName(user?.user_metadata.full_name ?? user?.user_metadata.name, user?.email)

  async function handleSignOut() {
    try {
      await signOut()
      router.replace('/sign-in')
    } catch (error) {
      console.error('Could not sign out:', error)
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <Brand />
          <Pressable onPress={() => void handleSignOut()} accessibilityRole="button" accessibilityLabel="Sign out" style={styles.signOut}>
            <LogOut color={colors.muted} size={19} />
          </Pressable>
        </View>
        <NoticeBanner notice={notice} onDismiss={clearNotice} />

        <View style={styles.welcome}>
          <Text style={styles.eyebrow}>YOUR CLUB, YOUR CALENDAR</Text>
          <Text style={styles.title}>Good to see you, {name}.</Text>
          <Text style={styles.subtitle}>A little time on the pitch goes a long way.</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroKicker}>NEXT SESSION</Text>
          <Text style={styles.heroTitle}>{upcomingBookings[0] ? 'You’re back on the pitch.' : 'The pitch is calling.'}</Text>
          <Text style={styles.heroCopy}>{upcomingBookings[0] ? 'Your next session is all set. Bring your boots and your best.' : 'Find a session that fits your week and save your place.'}</Text>
          {upcomingBookings[0] ? (
            <View style={styles.heroMeta}>
              <Text style={styles.heroDate}>{upcomingBookings[0].slot.training_date}</Text>
              <View style={styles.heroDivider} />
              <View>
                <Text style={styles.heroTime}>{upcomingBookings[0].slot.starts_at.slice(0, 5)}</Text>
                <View style={styles.locationRow}>
                  <MapPin size={13} color="#f4f1e8" />
                  <Text style={styles.heroLocation}>{upcomingBookings[0].slot.location}</Text>
                </View>
              </View>
            </View>
          ) : slots[0] ? (
            <View style={styles.heroMeta}>
              <Text style={styles.heroDate}>{slots[0].training_date}</Text>
              <View style={styles.heroDivider} />
              <View>
                <Text style={styles.heroTime}>{slots[0].starts_at.slice(0, 5)}</Text>
                <View style={styles.locationRow}>
                  <MapPin size={13} color="#f4f1e8" />
                  <Text style={styles.heroLocation}>{slots[0].location}</Text>
                </View>
              </View>
            </View>
          ) : null}
          <Pressable accessibilityRole="button" onPress={() => router.push('/training')} style={styles.heroButton}>
            <Text style={styles.heroButtonText}>{upcomingBookings[0] ? 'See all sessions' : 'Find a session'}</Text>
            <ArrowRight color={colors.greenDark} size={17} />
          </Pressable>
        </View>

        <View style={styles.seasonCard}>
          <View style={styles.seasonTop}>
            <Text style={styles.seasonLabel}>YOUR SEASON</Text>
            <View style={styles.active}>
              <View style={styles.activeDot} />
              <Text style={styles.activeLabel}>ACTIVE</Text>
            </View>
          </View>
          <View style={styles.seasonRow}>
            <Text style={styles.seasonCount}>{String(upcomingBookings.length).padStart(2, '0')}</Text>
            <Text style={styles.seasonCopy}>sessions booked ahead</Text>
            <UsersRound color={colors.green} size={21} />
          </View>
          <View style={styles.progressTrack}><View style={[styles.progress, { width: `${Math.min(upcomingBookings.length * 18, 100)}%` }]} /></View>
          <Text style={styles.seasonFoot}>{upcomingBookings.length === 0 ? 'Your season starts with one booking.' : 'Every session counts.'}</Text>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.eyebrow}>GET OUT THERE</Text>
            <Text style={styles.sectionTitle}>Coming up at the club</Text>
          </View>
          <Pressable onPress={() => router.push('/training')} accessibilityRole="button" style={styles.textLink}>
            <Text style={styles.textLinkLabel}>All training</Text>
            <ArrowRight color={colors.green} size={16} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={colors.green} /><Text style={styles.loadingText}>Loading the club schedule…</Text></View>
        ) : slots.length ? (
          <View style={styles.list}>
            {slots.slice(0, 3).map((slot) => (
              <SessionCard key={slot.slot_id} slot={slot} booked={bookings.some((booking) => booking.slot_id === slot.slot_id)} busy={busySlot === slot.slot_id} onBook={() => void bookSlot(slot)} />
            ))}
          </View>
        ) : (
          <EmptyState title="No sessions on the calendar just yet" detail="Check back soon — your team manager will add the next training dates." />
        )}

        <View style={[styles.sectionHeading, styles.bookingHeading]}>
          <View>
            <Text style={styles.eyebrow}>LOCKED IN</Text>
            <Text style={styles.sectionTitle}>Your next booking</Text>
          </View>
          <Pressable onPress={() => router.push('/bookings')} accessibilityRole="button" style={styles.textLink}>
            <Text style={styles.textLinkLabel}>My bookings</Text>
            <ArrowRight color={colors.green} size={16} />
          </Pressable>
        </View>
        {upcomingBookings[0] ? (
          <BookingCard booking={upcomingBookings[0]} />
        ) : (
          <EmptyState title="No bookings yet" detail="Pick a session above to get started." action="Browse training" onAction={() => router.push('/training')} />
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 19, paddingTop: 16, paddingBottom: 28, gap: 16 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  signOut: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.paper },
  welcome: { gap: 5, marginTop: 8, marginBottom: 3 },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: .4 },
  title: { color: colors.ink, fontFamily: 'Georgia', fontSize: 29, lineHeight: 36 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  hero: { padding: 20, borderRadius: 15, backgroundColor: colors.green },
  heroKicker: { color: colors.lime, fontSize: 12, fontWeight: '700', letterSpacing: .5 },
  heroTitle: { marginTop: 12, color: '#ffffff', fontFamily: 'Georgia', fontSize: 27, lineHeight: 33 },
  heroCopy: { marginTop: 7, color: '#f4f1e8', fontSize: 14, lineHeight: 21 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 17 },
  heroDate: { color: colors.lime, fontSize: 14, fontWeight: '700' },
  heroDivider: { width: 1, height: 36, backgroundColor: '#ffffff60' },
  heroTime: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  heroLocation: { color: '#f4f1e8', fontSize: 12 },
  heroButton: { alignSelf: 'flex-start', minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, paddingHorizontal: 14, borderRadius: 8, backgroundColor: colors.lime },
  heroButtonText: { color: colors.greenDark, fontSize: 13, fontWeight: '700' },
  seasonCard: { padding: 16, borderRadius: 13, backgroundColor: '#efeedf' },
  seasonTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seasonLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  active: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  activeLabel: { color: colors.green, fontSize: 11, fontWeight: '700' },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#83a65a' },
  seasonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  seasonCount: { color: colors.green, fontSize: 39, fontWeight: '700' },
  seasonCopy: { flex: 1, color: colors.muted, fontSize: 13 },
  progressTrack: { height: 4, marginTop: 9, borderRadius: 2, backgroundColor: '#dddfcf' },
  progress: { height: 4, borderRadius: 2, backgroundColor: '#8caa58' },
  seasonFoot: { marginTop: 8, color: colors.muted, fontSize: 12 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  sectionTitle: { marginTop: 4, color: colors.ink, fontFamily: 'Georgia', fontSize: 20, fontWeight: '700' },
  textLink: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5 },
  textLinkLabel: { color: colors.green, fontSize: 12, fontWeight: '700' },
  list: { gap: 10 },
  loading: { minHeight: 90, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { color: colors.muted, fontSize: 13 },
  bookingHeading: { marginTop: 8 },
})
