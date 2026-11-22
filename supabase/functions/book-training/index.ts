import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character]
  })
}

async function sendConfirmationEmail(
  email: string,
  name: string,
  session: { session_name: string; training_date: string; starts_at: string; duration_minutes: number; location: string },
) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM')
  if (!apiKey || !from) {
    console.error('Email confirmation is not configured: set RESEND_API_KEY and EMAIL_FROM.')
    return false
  }

  const date = new Date(`${session.training_date}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
  const time = session.starts_at.slice(0, 5)
  const safeName = escapeHtml(name || 'there')
  const safeSession = escapeHtml(session.session_name)
  const safeLocation = escapeHtml(session.location)
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `You're booked: ${session.session_name}`,
        html: `<div style="font-family:Arial,sans-serif;color:#23352b;max-width:560px;margin:0 auto;padding:32px 20px"><div style="font-size:21px;font-weight:700;letter-spacing:-1px">kickoffs<span style="color:#e9784e">.</span></div><p style="margin:30px 0 8px;color:#778174;font-size:12px;letter-spacing:1px">YOUR CLUB · BOOKING CONFIRMED</p><h1 style="font-size:28px;letter-spacing:-1px;margin:0 0 12px">See you on the pitch, ${safeName}.</h1><p style="color:#687368;line-height:1.6">Your place is saved. Here are the details for your next session:</p><div style="background:#f3f4ed;border-radius:10px;padding:18px 20px;margin-top:22px"><strong style="font-size:16px">${safeSession}</strong><p style="margin:10px 0 0;color:#586659">${date} · ${time}<br>${session.duration_minutes} minutes · ${safeLocation}</p></div><p style="margin-top:24px;color:#778174;font-size:12px">If your plans change, please speak to your team manager.</p></div>`,
      }),
    })

    if (!response.ok) {
      console.error('Confirmation email delivery failed.', await response.text())
      return false
    }
  } catch (error) {
    console.error('Confirmation email request could not be completed.', error)
    return false
  }
  return true
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization) return jsonResponse({ error: 'sign_in_required' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase function environment is missing SUPABASE_URL or SUPABASE_ANON_KEY.')
    return jsonResponse({ error: 'booking_service_unavailable' }, 500)
  }

  let body: { slotId?: unknown }
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'invalid_request' }, 400)
  }

  if (typeof body.slotId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.slotId)) {
    return jsonResponse({ error: 'invalid_slot' }, 400)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userResult, error: authError } = await supabase.auth.getUser()
  const user = userResult.user
  if (authError || !user) return jsonResponse({ error: 'sign_in_required' }, 401)
  if (!user.email) return jsonResponse({ error: 'email_address_required' }, 400)

  const { data: bookingId, error: bookingError } = await supabase.rpc('book_training_slot', {
    p_slot_id: body.slotId,
  })
  if (bookingError) {
    const errorCode = bookingError.message.split(':')[0].trim()
    if (errorCode === 'slot_full') return jsonResponse({ error: errorCode }, 409)
    if (errorCode === 'booking_exists') return jsonResponse({ error: errorCode }, 409)
    if (errorCode === 'slot_not_found' || errorCode === 'slot_has_passed') return jsonResponse({ error: errorCode }, 409)
    console.error('Could not create training booking.', bookingError.message)
    return jsonResponse({ error: 'booking_failed' }, 500)
  }

  const { data: booking, error: detailsError } = await supabase
    .from('bookings')
    .select('id, training_slots(session_name, training_date, starts_at, duration_minutes, location)')
    .eq('id', bookingId)
    .single()

  if (detailsError || !booking?.training_slots) {
    console.error('Booking was created, but its email details could not be loaded.', detailsError?.message)
    return jsonResponse({ bookingId, emailSent: false })
  }

  const session = booking.training_slots as {
    session_name: string
    training_date: string
    starts_at: string
    duration_minutes: number
    location: string
  }
  const emailSent = await sendConfirmationEmail(
    user.email,
    String(user.user_metadata.full_name ?? user.user_metadata.name ?? ''),
    session,
  )

  return jsonResponse({ bookingId, emailSent })
})
