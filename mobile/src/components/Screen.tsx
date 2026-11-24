import { SafeAreaView } from 'react-native-safe-area-context'
import type { PropsWithChildren } from 'react'
import { colors } from '../theme'

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      {children}
    </SafeAreaView>
  )
}
