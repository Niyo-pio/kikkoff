import { CalendarDays } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme'

export function EmptyState({
  title,
  detail,
  action,
  onAction,
}: {
  title: string
  detail: string
  action?: string
  onAction?: () => void
}) {
  return (
    <View style={styles.box}>
      <View style={styles.icon}><CalendarDays color={colors.green} size={23} /></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.detail}>{detail}</Text>
      {action && onAction && (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{action}</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 34, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  icon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.greenWash, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 14, color: colors.ink, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  detail: { marginTop: 6, color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  button: { minHeight: 42, justifyContent: 'center', marginTop: 16, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.green },
  buttonText: { color: colors.paper, fontSize: 13, fontWeight: '700' },
})
