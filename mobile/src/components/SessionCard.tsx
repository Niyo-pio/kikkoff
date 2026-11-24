import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Check, Clock3, MapPin, MoveRight } from 'lucide-react-native'
import type { TrainingSlot } from '../../../src/lib/types'
import { formatDate, formatTime } from '../lib/format'
import { colors } from '../theme'

export function SessionCard({
  slot,
  booked,
  busy,
  onBook,
}: {
  slot: TrainingSlot
  booked: boolean
  busy: boolean
  onBook: () => void
}) {
  const date = new Date(`${slot.training_date}T12:00:00`)
  const spotsLeft = typeof slot.spots_left === 'number' ? slot.spots_left : null

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.dateTile}>
          <Text style={styles.weekday}>{formatDate(slot.training_date, { weekday: 'short' }).toUpperCase()}</Text>
          <Text style={styles.day}>{date.getDate()}</Text>
          <Text style={styles.month}>{formatDate(slot.training_date, { month: 'short' }).toUpperCase()}</Text>
        </View>
        <View style={styles.session}>
          <Text style={styles.category}>FIRST TEAM</Text>
          <Text numberOfLines={2} style={styles.name}>{slot.session_name}</Text>
          <View style={styles.meta}><Clock3 color={colors.muted} size={15} /><Text style={styles.metaText}>{formatTime(slot.starts_at)} · {slot.duration_minutes} min</Text></View>
          <View style={styles.meta}><MapPin color={colors.muted} size={15} /><Text numberOfLines={1} style={styles.metaText}>{slot.location}</Text></View>
        </View>
      </View>
      <View style={styles.bottom}>
        <Text style={styles.spots}>{spotsLeft === null ? '' : `${spotsLeft} places left`}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={booked || busy}
          onPress={onBook}
          style={({ pressed }) => [styles.button, booked && styles.booked, pressed && !booked && styles.pressed]}
        >
          {booked ? <Check color={colors.green} size={17} /> : null}
          <Text style={[styles.buttonText, booked && styles.bookedText]}>{busy ? 'Booking…' : booked ? 'Booked' : 'Book a place'}</Text>
          {!booked && <MoveRight color={colors.paper} size={17} />}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, gap: 13 },
  top: { flexDirection: 'row', gap: 12 },
  dateTile: {
    width: 52,
    height: 70,
    borderRadius: 9,
    backgroundColor: colors.greenWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekday: { color: colors.green, fontSize: 10, fontWeight: '700' },
  day: { color: colors.green, fontSize: 25, fontWeight: '700', lineHeight: 29 },
  month: { color: colors.green, fontSize: 10, fontWeight: '700' },
  session: { flex: 1, gap: 5, justifyContent: 'center' },
  category: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: .3 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { flex: 1, color: colors.muted, fontSize: 12 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  spots: { flex: 1, color: colors.muted, fontSize: 12 },
  button: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 8,
    backgroundColor: colors.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  pressed: { opacity: .8 },
  booked: { backgroundColor: colors.greenWash },
  buttonText: { color: colors.paper, fontSize: 13, fontWeight: '700' },
  bookedText: { color: colors.green },
})
