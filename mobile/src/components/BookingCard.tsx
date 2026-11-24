import { StyleSheet, Text, View } from 'react-native'
import { Check, Clock3, MapPin } from 'lucide-react-native'
import type { Booking } from '../../../src/lib/types'
import { formatTime } from '../lib/format'
import { colors } from '../theme'

export function BookingCard({ booking }: { booking: Booking }) {
  const date = new Date(`${booking.slot.training_date}T12:00:00`)
  return (
    <View style={styles.card}>
      <View style={styles.dateTile}>
        <Text style={styles.weekday}>{new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date).toUpperCase()}</Text>
        <Text style={styles.day}>{date.getDate()}</Text>
        <Text style={styles.month}>{new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(date).toUpperCase()}</Text>
      </View>
      <View style={styles.details}>
        <View style={styles.confirmed}><Check size={14} color={colors.green} /><Text style={styles.confirmedText}>Confirmed</Text></View>
        <Text style={styles.name}>{booking.slot.session_name}</Text>
        <View style={styles.meta}><Clock3 size={15} color={colors.muted} /><Text style={styles.metaText}>{formatTime(booking.slot.starts_at)} · {booking.slot.duration_minutes} min</Text></View>
        <View style={styles.meta}><MapPin size={15} color={colors.muted} /><Text style={styles.metaText}>{booking.slot.location}</Text></View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 13, padding: 14, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  dateTile: { width: 58, height: 76, borderRadius: 9, backgroundColor: '#f3eedc', alignItems: 'center', justifyContent: 'center' },
  weekday: { color: '#705c35', fontSize: 10, fontWeight: '700' },
  day: { color: '#705c35', fontSize: 29, fontWeight: '700', lineHeight: 32 },
  month: { color: '#705c35', fontSize: 10, fontWeight: '700' },
  details: { flex: 1, gap: 7 },
  confirmed: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.greenWash },
  confirmedText: { color: colors.green, fontSize: 12, fontWeight: '700' },
  name: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { flex: 1, color: colors.muted, fontSize: 12 },
})
