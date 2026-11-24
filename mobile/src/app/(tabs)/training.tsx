import { useMemo } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Clock3 } from 'lucide-react-native'
import type { TrainingSlot } from '../../../../src/lib/types'
import { EmptyState } from '../../components/EmptyState'
import { NoticeBanner } from '../../components/NoticeBanner'
import { Screen } from '../../components/Screen'
import { SessionCard } from '../../components/SessionCard'
import { formatDate } from '../../lib/format'
import { useMember } from '../../providers/MemberProvider'
import { colors } from '../../theme'

export default function TrainingScreen() {
  const { slots, bookings, loading, busySlot, notice, clearNotice, bookSlot } = useMember()
  const bookedIds = useMemo(() => new Set(bookings.map((booking) => booking.slot_id)), [bookings])
  const groups = useMemo(() => {
    const result = new Map<string, TrainingSlot[]>()
    for (const slot of slots) {
      const current = result.get(slot.training_date) ?? []
      current.push(slot)
      result.set(slot.training_date, current)
    }
    return [...result.entries()]
  }, [slots])

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>MAKE A LITTLE ROOM FOR FOOTBALL</Text>
          <Text style={styles.title}>Training<Text style={styles.period}>.</Text></Text>
          <Text style={styles.subtitle}>Choose a session, book your place, and we’ll see you there.</Text>
          <View style={styles.openSessions}><Clock3 size={16} color={colors.green} /><Text style={styles.openText}>Open sessions</Text></View>
        </View>
        <NoticeBanner notice={notice} onDismiss={clearNotice} />
        <View style={styles.sectionHeading}>
          <View><Text style={styles.eyebrow}>UP NEXT</Text><Text style={styles.sectionTitle}>Find your next session</Text></View>
          <Text style={styles.count}>{slots.length} {slots.length === 1 ? 'session' : 'sessions'}</Text>
        </View>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={colors.green} /><Text style={styles.loadingText}>Loading sessions…</Text></View>
        ) : groups.length ? (
          groups.map(([date, dateSlots]) => (
            <View key={date} style={styles.group}>
              <Text style={styles.dateHeading}>{formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
              {dateSlots.map((slot) => (
                <SessionCard key={slot.slot_id} slot={slot} booked={bookedIds.has(slot.slot_id)} busy={busySlot === slot.slot_id} onBook={() => void bookSlot(slot)} />
              ))}
            </View>
          ))
        ) : (
          <EmptyState title="No open sessions right now" detail="There aren’t any sessions available to book. Your team manager may add more soon." />
        )}
        <View style={styles.help}><Text style={styles.helpMark}>i</Text><Text style={styles.helpText}><Text style={styles.helpStrong}>Need to change your plans?</Text> Speak to your team manager and they’ll help you update a booking.</Text></View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 19, paddingTop: 22, paddingBottom: 28, gap: 15 },
  header: { gap: 6, marginBottom: 3 },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: .4 },
  title: { color: colors.ink, fontFamily: 'Georgia', fontSize: 34, lineHeight: 41 },
  period: { color: colors.rust },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  openSessions: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.paper },
  openText: { color: colors.green, fontSize: 12, fontWeight: '600' },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8, marginTop: 5 },
  sectionTitle: { marginTop: 4, color: colors.ink, fontFamily: 'Georgia', fontSize: 19, fontWeight: '700' },
  count: { color: colors.muted, fontSize: 12 },
  loading: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { color: colors.muted, fontSize: 13 },
  group: { gap: 10, marginTop: 4 },
  dateHeading: { marginBottom: 1, color: colors.green, fontSize: 15, fontWeight: '700' },
  help: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8, padding: 13, borderRadius: 9, backgroundColor: '#efefe5' },
  helpMark: { width: 22, height: 22, borderWidth: 1, borderColor: '#aeb8a1', borderRadius: 11, color: colors.green, fontSize: 14, fontWeight: '700', textAlign: 'center', lineHeight: 20 },
  helpText: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 20 },
  helpStrong: { color: colors.ink, fontWeight: '700' },
})
