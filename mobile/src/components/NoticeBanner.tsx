import { Pressable, StyleSheet, Text, View } from 'react-native'
import { AlertCircle, CheckCircle2, X } from 'lucide-react-native'
import { colors } from '../theme'
import type { Notice } from '../providers/MemberProvider'

export function NoticeBanner({ notice, onDismiss }: { notice: Notice; onDismiss?: () => void }) {
  if (!notice) return null
  const isError = notice.kind === 'error'
  const Icon = isError ? AlertCircle : CheckCircle2

  return (
    <View style={[styles.banner, isError ? styles.error : styles.success]}>
      <Icon color={isError ? colors.error : colors.success} size={19} />
      <Text style={[styles.text, isError ? styles.errorText : styles.successText]}>{notice.text}</Text>
      {onDismiss && (
        <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss message" hitSlop={8}>
          <X color={isError ? colors.error : colors.success} size={18} />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 10 },
  error: { backgroundColor: colors.errorWash },
  success: { backgroundColor: colors.successWash },
  text: { flex: 1, fontSize: 13, lineHeight: 19 },
  errorText: { color: colors.error },
  successText: { color: colors.success },
})
