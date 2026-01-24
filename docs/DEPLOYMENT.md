# Deployment Guide

This guide covers deploying Code Horse to production environments.

## Prerequisites

- Node.js 18+
- PostgreSQL database
- GitHub OAuth App
- Google AI API key
- Pinecone account
- Polar.sh account (for payments)
- Inngest account (for background jobs)

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/codehorse"

# Authentication
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="https://your-domain.com"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# AI (Google Gemini)
GOOGLE_GENERATIVE_AI_API_KEY="your-google-api-key"

# Vector Database
PINECONE_API_KEY="your-pinecone-api-key"

# Background Jobs
INNGEST_EVENT_KEY="your-inngest-event-key"
INNGEST_SIGNING_KEY="your-inngest-signing-key"

# Payments
POLAR_ACCESS_TOKEN="your-polar-access-token"
POLAR_WEBHOOK_SECRET="your-polar-webhook-secret"
```

## Deployment Platforms

### Vercel (Recommended)

1. **Connect Repository:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

2. **Configure Environment Variables:**
   - Add all environment variables in Vercel dashboard
   - Set `BETTER_AUTH_URL` to your Vercel domain

3. **Database Setup:**
   - Use Vercel Postgres or external PostgreSQL
   - Run migrations: `npx prisma migrate deploy`

### Railway

1. **Deploy from GitHub:**
   - Connect your repository to Railway
   - Railway will auto-detect Next.js

2. **Environment Variables:**
   - Add all required environment variables
   - Set `BETTER_AUTH_URL` to your Railway domain

3. **Database:**
   - Use Railway PostgreSQL addon
   - Run migrations in Railway console

### Docker

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   RUN npx prisma generate
   RUN npm run build
   
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Build and Run:**
   ```bash
   docker build -t codehorse .
   docker run -p 3000:3000 --env-file .env codehorse
   ```

## Database Setup

### Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (optional)
npx prisma db seed
```

### Backup Strategy

```bash
# Create backup
pg_dump $DATABASE_URL > backup.sql

# Restore backup
psql $DATABASE_URL < backup.sql
```

## External Services Setup

### GitHub OAuth App

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth App:
   - Application name: "Code Horse"
   - Homepage URL: `https://your-domain.com`
   - Authorization callback URL: `https://your-domain.com/api/auth/callback/github`

### Pinecone Setup

1. Create account at pinecone.io
2. Create index:
   - Name: `codehorse-vector-embeddings-v2`
   - Dimensions: 768
   - Metric: cosine

### Inngest Setup

1. Create account at inngest.com
2. Create new app
3. Configure webhook endpoint: `https://your-domain.com/api/inngest`

### Polar.sh Setup

1. Create account at polar.sh
2. Create product for PRO subscription
3. Configure webhook endpoint: `https://your-domain.com/api/auth/polar/webhook`

## Monitoring and Logging

### Application Monitoring

```typescript
// Add to your monitoring service
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  // Log requests
  console.log(`${request.method} ${request.url}`);
  
  // Monitor auth status
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

### Error Tracking

Consider integrating:
- Sentry for error tracking
- LogRocket for session replay
- Vercel Analytics for performance monitoring

## Performance Optimization

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_repository_user_id ON "Repository"("userId");
CREATE INDEX idx_review_repository_id ON "Review"("repositoryId");
CREATE INDEX idx_review_created_at ON "Review"("createdAt");
```

### Caching Strategy

```typescript
// Add Redis caching for expensive operations
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function getCachedDashboardStats(userId: string) {
  const cached = await redis.get(`dashboard:${userId}`);
  if (cached) return cached;
  
  const stats = await getDashboardStats();
  await redis.setex(`dashboard:${userId}`, 300, stats); // 5 min cache
  return stats;
}
```

## Security Considerations

### Environment Security

- Use strong secrets for `BETTER_AUTH_SECRET`
- Rotate API keys regularly
- Use environment-specific configurations

### Database Security

- Enable SSL for database connections
- Use connection pooling
- Regular security updates

### API Security

- Implement rate limiting
- Validate all inputs
- Use HTTPS only

## Troubleshooting

### Common Issues

1. **Database Connection Errors:**
   ```bash
   # Check connection
   npx prisma db pull
   
   # Reset database
   npx prisma migrate reset
   ```

2. **Authentication Issues:**
   - Verify GitHub OAuth callback URL
   - Check `BETTER_AUTH_URL` matches deployment URL
   - Ensure session cookies are secure

3. **Background Job Failures:**
   - Check Inngest dashboard for errors
   - Verify webhook endpoints are accessible
   - Monitor function timeouts

### Health Checks

Create a health check endpoint:

```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    
    // Check external services
    const checks = {
      database: true,
      timestamp: new Date().toISOString(),
    };
    
    return Response.json(checks);
  } catch (error) {
    return Response.json({ error: 'Health check failed' }, { status: 500 });
  }
}
```
