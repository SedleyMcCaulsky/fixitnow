import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables at runtime
    const stripeSecret = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!stripeSecret || !webhookSecret || !supabaseUrl || !supabaseKey) {
      console.error('Missing required environment variables for webhook')
      return NextResponse.json({ error: 'Webhook misconfigured' }, { status: 500 })
    }

    // Initialize clients at runtime
    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2026-04-22.dahlia' as any,
    })

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get raw body for signature verification
    const body = await request.text()
    const sig = request.headers.get('stripe-signature') || ''

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
    }

    console.log(`Processing Stripe webhook: ${event.type}`)

    // Handle events
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const milestoneId = paymentIntent.metadata?.milestone_id
        if (milestoneId) {
          await supabase
            .from('milestones')
            .update({
              payment_status: 'CAPTURED',
              payment_error: null,
            })
            .eq('id', milestoneId)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const milestoneId = paymentIntent.metadata?.milestone_id
        if (milestoneId) {
          await supabase
            .from('milestones')
            .update({
              payment_status: 'FAILED',
              payment_error: paymentIntent.last_payment_error?.message || 'Payment failed',
            })
            .eq('id', milestoneId)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const milestoneId = charge.metadata?.milestone_id
        if (milestoneId) {
          await supabase
            .from('milestones')
            .update({
              payment_status: 'FAILED',
              payment_error: 'Payment refunded',
            })
            .eq('id', milestoneId)
        }
        break
      }
    }

    // Log webhook event
    await supabase
      .from('audit_logs')
      .insert({
        event_type: 'webhook_received',
        resource_type: 'payment',
        resource_id: (event.data.object as any)?.id || 'unknown',
        action: `stripe_${event.type}`,
        status: 'success',
        metadata: {
          stripe_event_type: event.type,
        },
        created_at: new Date().toISOString(),
      })
      .catch((err) => console.error('Error logging webhook:', err))

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
