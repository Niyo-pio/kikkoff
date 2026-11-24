import { Text, View, StyleSheet } from 'react-native'
import { colors } from '../theme'

export function Brand() {
  return (
    <View style={styles.row}>
      <View style={styles.mark}>
        <View style={styles.pitch} />
        <View style={styles.dot} />
      </View>
      <Text style={styles.word}>kickoffs<Text style={styles.period}>.</Text></Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
  },
  pitch: { width: 15, height: 23, borderWidth: 1, borderColor: '#ffffffcc', borderRadius: 8 },
  dot: { position: 'absolute', top: 15, left: 16, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.lime },
  word: { color: colors.ink, fontSize: 21, fontWeight: '800', letterSpacing: -1 },
  period: { color: colors.rust },
})
