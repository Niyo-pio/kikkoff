import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { ArrowRight, ShieldCheck } from 'lucide-react-native'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Screen } from '../components/Screen'
import { Brand } from '../components/Brand'
import { useAuth } from '../providers/AuthProvider'
import { colors } from '../theme'

export default function SignInScreen() {
  const { configured, redirectUri, signInWithGoogle, user } = useAuth()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user) router.replace('/(tabs)')
  }, [user])

  async function handleSignIn() {
    setError('')
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Google sign-in could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Brand />
        <View style={styles.pitch}>
          <Text style={styles.pitchLabel}>AT THE CLUB</Text>
          <View style={styles.pitchLine} />
          <View style={styles.pitchCircle} />
          <Text style={styles.pitchCaption}>TRAINING · TOGETHER</Text>
        </View>

        <Text style={styles.eyebrow}>MEMBER SIGN IN</Text>
        <Text style={styles.title}>Training soon?<Text style={styles.titleAccent}>{'\n'}Come along.</Text></Text>
        <Text style={styles.description}>Pick a date that works and we’ll see you there.</Text>

        {configured ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void handleSignIn()}
            style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
          >
            <Text style={styles.googleMark}>G</Text>
            <Text style={styles.googleText}>{busy ? 'Opening Google…' : 'Continue with Google'}</Text>
            <ArrowRight color={colors.green} size={19} />
          </Pressable>
        ) : (
          <View style={styles.setupNotice}>
            <Text style={styles.setupTitle}>Connect Kickoffs to Supabase</Text>
            <Text style={styles.setupCopy}>Add the project URL and publishable key to mobile/.env.local, then restart Expo.</Text>
          </View>
        )}

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <View style={styles.privacy}>
          <ShieldCheck color={colors.muted} size={16} />
          <Text style={styles.privacyText}>Only club members can book sessions.</Text>
        </View>

        {__DEV__ && configured ? (
          <View style={styles.redirectNotice}>
            <Text style={styles.redirectTitle}>Expo Go sign-in callback</Text>
            <Text selectable style={styles.redirectUrl}>{redirectUri}</Text>
            <Text style={styles.redirectCopy}>Allow this URI in Supabase Authentication → URL Configuration → Redirect URLs.</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>Good to have you here.</Text>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28 },
  pitch: {
    height: 150,
    marginTop: 34,
    marginBottom: 31,
    padding: 18,
    overflow: 'hidden',
    justifyContent: 'space-between',
    borderRadius: 14,
    backgroundColor: colors.green,
  },
  pitchLabel: { color: '#f3f1e8', fontSize: 12, fontWeight: '700', letterSpacing: .5 },
  pitchLine: { position: 'absolute', top: '50%', left: 18, right: 18, height: 1, backgroundColor: '#ffffff35' },
  pitchCircle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 58,
    height: 58,
    marginTop: -29,
    marginLeft: -29,
    borderWidth: 1,
    borderColor: '#ffffff45',
    borderRadius: 29,
  },
  pitchCaption: { alignSelf: 'flex-end', color: '#f3f1e8', fontSize: 12, fontWeight: '700', letterSpacing: .4 },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: .5 },
  title: { marginTop: 9, color: colors.ink, fontFamily: 'Georgia', fontSize: 42, lineHeight: 49 },
  titleAccent: { color: colors.rust, fontStyle: 'italic' },
  description: { marginTop: 12, color: colors.muted, fontSize: 15, lineHeight: 23 },
  googleButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 9,
    backgroundColor: colors.paper,
  },
  pressed: { opacity: .8 },
  googleMark: { color: '#4285f4', fontSize: 19, fontWeight: '800' },
  googleText: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '700' },
  error: { marginTop: 12, color: colors.error, fontSize: 13, lineHeight: 19 },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 15 },
  privacyText: { color: colors.muted, fontSize: 13 },
  setupNotice: { marginTop: 24, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  setupTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  setupCopy: { marginTop: 6, color: colors.muted, fontSize: 13, lineHeight: 20 },
  redirectNotice: { marginTop: 20, padding: 12, borderRadius: 9, backgroundColor: '#ece9de' },
  redirectTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  redirectUrl: { marginTop: 5, color: colors.green, fontSize: 12 },
  redirectCopy: { marginTop: 5, color: colors.muted, fontSize: 12, lineHeight: 18 },
  footer: { marginTop: 'auto', paddingTop: 28, color: colors.muted, fontSize: 12 },
})
