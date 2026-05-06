# Stripe Webhook Setup Guide

This document explains how to set up Stripe webhooks for FixItNow payment reconciliation.

## Overview

Stripe webhooks are used to automatically update milestone payment statuses when:
1. **Payment succeeds** → `payment_intent.succeeded`
2. **Payment fails** → `payment_intent.payment_failed`
3. **Charge is refunded** → `charge.refunded`

## Environment Setup

Add these variables to your `.env.local`:

```bash
# Stripe Webhook Secret (get this from Stripe Dashboard → Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

## Stripe Dashboard Configuration

### Step 1: Navigate to Webhooks
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add an endpoint"

### Step 2: Configure Endpoint
1. **Endpoint URL**: `https://yourapp.com/api/webhooks/stripe`
   - For local testing, use ngrok or Stripe CLI
2. **API Version**: Latest (2024-12-18.acacia)
3. **Listen to events**: Select specific events

### Step 3: Select Events
Select these events:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

### Step 4: Retrieve Signing Secret
1. After creating the endpoint, copy the signing secret
2. Add it to `.env.local` as `STRIPE_WEBHOOK_SECRET`

## Local Testing with Stripe CLI

### Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (choco)
choco install stripe

# Linux
curl https://raw.githubusercontent.com/stripe/stripe-cli/master/install.sh -s | bash
```

### Forward Webhooks Locally
```bash
# Login to Stripe account
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This will:
1. Print the webhook signing secret (copy to `.env.local`)
2. Forward all webhook events to your local development server

### Trigger Test Events
```bash
# Test payment succeeded
stripe trigger payment_intent.succeeded

# Test payment failed
stripe trigger payment_intent.payment_failed

# Test refund
stripe trigger charge.refunded
```

## How Webhooks Work

### Payment Intent Creation (Approve Milestone)
1. Customer approves a milestone
2. API creates a Stripe Payment Intent with `capture_method: 'manual'`
3. Metadata includes: `milestone_id` and `project_id`
4. Milestone marked as `APPROVED` with `payment_status: INTENT_CREATED`

### Payment Capture (Release Funds)
1. Admin releases funds from milestone details page
2. API captures the payment intent
3. Stripe processes the capture
4. Webhook `payment_intent.succeeded` fires automatically

### Webhook Processing
1. Webhook received at `/api/webhooks/stripe`
2. Signature verified using `STRIPE_WEBHOOK_SECRET`
3. Event type processed:
   - **`payment_intent.succeeded`**: Update milestone to `payment_status: CAPTURED`
   - **`payment_intent.payment_failed`**: Update to `payment_status: FAILED`
   - **`charge.refunded`**: Update to `payment_status: FAILED` (for retry)
4. Event logged to `audit_logs` table

### Error Handling
- Failed webhook processing is logged to console and audit logs
- Signature verification failures return 400 Bad Request
- Invalid events are logged and skipped (non-error)

## Monitoring Webhooks

### Check Webhook Attempts
1. Stripe Dashboard → Webhooks → Select endpoint
2. View all event deliveries with success/failure status
3. Inspect individual request and response details

### Database Audit Logs
Query webhook events in Supabase:
```sql
select * from audit_logs 
where event_type = 'webhook_received' 
order by created_at desc;
```

## Troubleshooting

### Webhook Not Being Delivered
- Check that endpoint URL is publicly accessible
- Verify `STRIPE_WEBHOOK_SECRET` is correctly configured
- Check Stripe webhook status in dashboard
- Look at failed attempts in Stripe webhook history

### Signature Verification Fails
- Ensure `STRIPE_WEBHOOK_SECRET` matches exactly (no spaces, case-sensitive)
- Check that raw request body isn't being modified by middleware

### Milestone Status Not Updating
- Check audit logs for webhook_received events
- Verify milestone_id exists in payment intent metadata
- Check database permissions and RLS policies
- Look at server logs for any errors

## Production Considerations

1. **Use HTTPS**: Webhooks must use https:// URLs (Stripe enforces this)
2. **Monitor Webhook Health**: Set up alerts for failed deliveries
3. **Retry Strategy**: Stripe automatically retries failed webhooks
4. **Signature Verification**: Always verify webhook signatures before processing
5. **Idempotency**: Webhooks may be retried; ensure operations are idempotent

## Database Schema

Payment information is stored in the `milestones` table:
- `payment_intent_id`: Stripe Payment Intent ID
- `payment_status`: One of UNPAID, INTENT_CREATED, CAPTURED, FAILED
- `payment_error`: Error message if payment failed

All webhook events are logged in `audit_logs` with:
- `event_type`: 'webhook_received'
- `action`: 'stripe_[event_type]'
- `metadata`: Full Stripe event data
