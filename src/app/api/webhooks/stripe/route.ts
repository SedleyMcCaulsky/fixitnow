import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-04-22.dahlia' as any,
});

// Initialize Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const sig = request.headers.get('stripe-signature') || '';

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    console.log(`Processing Stripe webhook event: ${event.type}`);

    // Process based on event type
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    // Log webhook event to audit
    await logWebhookEvent(event.type, event.data.object, 'success');

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Extract milestone ID from metadata
    const milestoneId = paymentIntent.metadata?.milestone_id;
    if (!milestoneId) {
      console.warn('No milestone_id in payment intent metadata');
      return;
    }

    // Update milestone payment status
    const { error: updateError } = await supabase
      .from('milestones')
      .update({
        payment_status: 'CAPTURED',
        payment_error: null,
      })
      .eq('id', milestoneId);

    if (updateError) {
      console.error('Error updating milestone payment:', updateError);
      return;
    }

    console.log(`Successfully processed payment for milestone ${milestoneId}`);
  } catch (error) {
    console.error('Error handling payment_intent.succeeded:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const milestoneId = paymentIntent.metadata?.milestone_id;
    if (!milestoneId) {
      console.warn('No milestone_id in failed payment intent metadata');
      return;
    }

    // Update milestone with payment error
    const { error: updateError } = await supabase
      .from('milestones')
      .update({
        payment_status: 'FAILED',
        payment_error: paymentIntent.last_payment_error?.message || 'Payment failed',
      })
      .eq('id', milestoneId);

    if (updateError) {
      console.error('Error updating failed payment:', updateError);
      return;
    }

    console.log(`Payment failed for milestone ${milestoneId}: ${paymentIntent.last_payment_error?.message}`);
  } catch (error) {
    console.error('Error handling payment_intent.payment_failed:', error);
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  try {
    // Extract milestone ID from metadata
    const milestoneId = charge.metadata?.milestone_id;
    if (!milestoneId) {
      console.warn('No milestone_id in refunded charge metadata');
      return;
    }

    // Note: Refunds are typically handled after capture
    // Mark payment as failed so it can be retried
    const { error: updateError } = await supabase
      .from('milestones')
      .update({
        payment_status: 'FAILED',
        payment_error: 'Payment refunded',
      })
      .eq('id', milestoneId);

    if (updateError) {
      console.error('Error updating refunded payment:', updateError);
      return;
    }

    console.log(`Successfully processed refund for milestone ${milestoneId}`);
  } catch (error) {
    console.error('Error handling charge.refunded:', error);
  }
}

async function logWebhookEvent(
  eventType: string,
  data: any,
  status: 'success' | 'failed'
) {
  try {
    await supabase.from('audit_logs').insert({
      event_type: 'webhook_received',
      resource_type: 'payment',
      resource_id: data.id || 'unknown',
      action: `stripe_${eventType}`,
      status,
      metadata: {
        stripe_event_type: eventType,
        stripe_object: data,
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging webhook event:', error);
  }
}
