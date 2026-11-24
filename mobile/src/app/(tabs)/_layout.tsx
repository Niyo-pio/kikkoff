import { Tabs, Redirect } from 'expo-router'
import { CalendarDays, Check, Dumbbell } from 'lucide-react-native'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { MemberProvider } from '../../providers/MemberProvider'
import { useAuth } from '../../providers/AuthProvider'
import { colors } from '../../theme'

function MemberTabs() {
  const { user, loading } = useAuth()
  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color={colors.green} /></View>
  }
  if (!user) return <Redirect href="/sign-in" />

  return (
    <MemberProvider key={user.id}>
      <Tabs screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}>
        <Tabs.Screen
          name="index"
          options={{ title: 'Home', tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="training"
          options={{ title: 'Training', tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="bookings"
          options={{ title: 'Bookings', tabBarIcon: ({ color, size }) => <Check color={color} size={size} /> }}
        />
      </Tabs>
    </MemberProvider>
  )
}

export default function TabLayout() {
  return <MemberTabs />
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  tabBar: { height: 63, paddingTop: 6, paddingBottom: 7, backgroundColor: colors.paper, borderTopColor: colors.line },
  tabLabel: { fontSize: 12, fontWeight: '600' },
})
