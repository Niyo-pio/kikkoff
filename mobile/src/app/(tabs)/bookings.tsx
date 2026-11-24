import { useMemo } from 'react'
import { router } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { BookingCard } from '../../components/BookingCard'
import { EmptyState } from '../../components/EmptyState'
import { NoticeBanner } from '../../components/NoticeBanner'
import { Screen } from '../../components/Screen'
import { useMember } from '../../providers/MemberProvider'
import { colors } from '../../theme'

export default function BookingsScreen() {
  const { bookings, loading, notice, clearNotice } = useMember()
  const upcoming = useMemo(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    return bookings.filter((booking) => booking.slot.training_date >= today)
  }, [bookings])

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>YOUR TIME ON THE PITCH</Text>
          <Text style={styles.title}>My bookings<Text style={styles.period}>.</Text></Text>
          <Text style={styles.subtitle}>All your upcoming sessions, in one place.</Text>
        </View>
        <NoticeBanner notice={notice} onDismiss={clearNotice} />
        <View style={styles.sectionHeading}>
          <View><Text style={styles.eyebrow}>COMING UP</Text><Text style={styles.sectionTitle}>Confirmed sessions</Text></View>
          <Text style={styles.count}>{upcoming.length} upcoming</Text>
        </View>
        {loading ? (
          <View style={styles.loading}><Text style={styles.loadingText}>Loading your bookings…</Text></View>
        ) : upcoming.length ? (
          <View style={styles.list}>{upcoming.map((booking) => <BookingCard key={booking.id} booking={booking} />)}</View>
        ) : (
          <EmptyState
            title="Nothing booked yet"
            detail="Take a look at the upcoming sessions and save your place."
            action="Browse training"
            onAction={() => router.push('/training')}
          />
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 19, paddingTop: 22, paddingBottom: 28, gap: 16 },
  header: { gap: 6, marginBottom: 3 },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: .4 },
  title: { color: colors.ink, fontFamily: 'Georgia', fontSize: 34, lineHeight: 41 },
  period: { color: colors.rust },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 },
  sectionTitle: { marginTop: 4, color: colors.ink, fontFamily: 'Georgia', fontSize: 19, fontWeight: '700' },
  count: { color: colors.green, fontSize: 12, fontWeight: '700' },
  loading: { minHeight: 140, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.muted, fontSize: 13 },
  list: { gap: 11 },
})
