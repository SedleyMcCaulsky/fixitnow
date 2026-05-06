# Deployment Guide for FixItNow

This document outlines deployment considerations and best practices for the FixItNow platform.

## Pre-Deployment Checklist

### Environment Variables
Ensure all required environment variables are configured:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key
STRIPE_SECRET_KEY=your_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Application
NEXT_PUBLIC_SITE_URL=your_production_url
STRIPE_CURRENCY=usd
```

### Build Optimization
- Turbopack is configured with proper root detection to avoid duplicate lockfile warnings
- The middleware is functional (the deprecation notice is cosmetic and can be ignored)
- All API routes are properly optimized

## Deployment Targets

### Vercel (Recommended)
Vercel is the recommended platform for Next.js applications:

1. **Connect Repository**
   - Push to GitHub: `git push origin master`
   - Import project at https://vercel.com

2. **Configure Environment Variables**
   - Add all variables from `.env.local` to project settings
   - Mark sensitive keys as secret values

3. **Deploy**
   - Vercel automatically detects Next.js
   - First deployment triggers build and optimization
   - Automatic deployments on future pushes

### Docker Deployment
For self-hosted deployments:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g pm2
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
RUN npm ci --only=production
EXPOSE 3000
CMD ["npm", "start"]
```

### AWS Amplify
Alternative AWS deployment option:

1. Connect GitHub repository to Amplify
2. Configure build settings:
   ```yaml
   build:
     commands:
       - npm ci
       - npm run build
   ```
3. Set environment variables in Amplify console
4. Deploy

## Post-Deployment

### Webhook Configuration
After deployment to production URL:

1. Update webhook URL in Stripe Dashboard
2. Get webhook signing secret
3. Add to production environment variables

### Database Setup
1. Run Supabase migrations (if not auto-applied)
2. Verify RLS policies are enabled
3. Test authentication with live environment

### Monitoring
- Set up error tracking (e.g., Sentry)
- Monitor API response times
- Track webhook delivery success rate
- Monitor Stripe payment events

## Performance Considerations

### Caching
- Static pages are pre-rendered at build time
- API responses should implement caching headers
- Consider Redis for real-time data

### Database
- Ensure proper indexes on frequently queried columns
- Monitor query performance in Supabase
- Use connection pooling for production workloads

### Images
- Optimize images before committing
- Use Next.js Image component for auto-optimization
- CDN configuration through Vercel/provider

## Security Considerations

1. **Rate Limiting**: Implement API rate limiting (e.g., using middleware)
2. **CORS**: Configure proper CORS headers for your domain
3. **HTTPS**: Ensure all connections use HTTPS
4. **Secrets**: Never commit `.env.local` to git
5. **RLS Policies**: Verify Supabase RLS policies for data protection

## Common Warnings and Solutions

### "Next.js inferred your workspace root" Warning
**Status**: Informational (resolved by turbopack.root config)
- Already fixed in next.config.ts
- No action required

### "The middleware file convention is deprecated"
**Status**: Cosmetic warning (functionality preserved)
- File works as intended
- Next.js plans future migration path
- Current behavior is stable for production

### Duplicate Lockfile Warnings
**Status**: Resolved
- Turbopack configuration now properly detects project root
- No multiple package installations

## Rollback Procedures

### Vercel
- Use deployment history to roll back to previous version
- Simply click "Rollback" on previous deployment

### Manual
```bash
git log --oneline
git revert <commit_hash>
git push origin master
```

## Monitoring Webhooks

### Stripe Dashboard
- Monitor webhook delivery in Stripe Dashboard
- Check failed deliveries and retry status
- Review webhook logs for debugging

### Application Logs
Query webhook events in Supabase:
```sql
SELECT * FROM audit_logs 
WHERE event_type = 'webhook_received' 
ORDER BY created_at DESC;
```

## Support and Troubleshooting

### Build Failures
1. Check build logs in Vercel/provider console
2. Verify environment variables are set
3. Ensure Stripe SDK version compatibility

### Payment Issues
1. Verify webhook signature secret is correct
2. Check Stripe API key is valid
3. Review webhook delivery logs

### Database Connection Issues
1. Verify Supabase credentials
2. Check RLS policies allow operations
3. Ensure service role key is available for admin operations

## Scaling Considerations

For production deployments serving many users:

1. **Database**: Monitor Supabase connection limits
2. **Webhooks**: Implement queue for webhook processing
3. **Caching**: Add Redis for frequently accessed data
4. **CDN**: Configure static asset caching
5. **Monitoring**: Set up performance and error tracking
