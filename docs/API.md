# API Documentation

This document describes the API endpoints and webhooks used in Code Horse.

## Authentication

All API endpoints require authentication via Better Auth session cookies, except for webhooks which use their own verification methods.

## Endpoints

### Webhooks

#### GitHub Webhook
**POST** `/api/webhooks/github`

Receives GitHub repository events and triggers appropriate actions.

**Headers:**
- `x-github-event`: Event type (e.g., "pull_request", "ping")
- `x-hub-signature-256`: GitHub webhook signature for verification

**Supported Events:**
- `ping`: Webhook verification (responds with "Pong")
- `pull_request`: Triggers AI code review generation

**Example Payload (pull_request):**
```json
{
  "action": "opened",
  "number": 123,
  "repository": {
    "full_name": "owner/repo"
  },
  "pull_request": {
    "title": "Add new feature",
    "body": "Description of changes"
  }
}
```

#### Polar Webhook
**POST** `/api/auth/polar/webhook`

Handles subscription events from Polar.sh payment platform.

**Events:**
- `subscription.active`: User subscription activated
- `subscription.canceled`: User subscription canceled
- `subscription.revoked`: User subscription revoked
- `customer.created`: New customer created

### Better Auth Routes

#### Authentication
**POST** `/api/auth/sign-in/github`
- Initiates GitHub OAuth flow

**POST** `/api/auth/sign-out`
- Signs out current user

**GET** `/api/auth/session`
- Returns current session information

#### Polar Integration
**GET** `/api/auth/polar/checkout/pro`
- Redirects to Polar checkout for PRO subscription

**GET** `/api/auth/polar/portal`
- Redirects to Polar customer portal

## Server Actions

Server actions are used for server-side operations with automatic CSRF protection.

### Dashboard Actions

#### `getDashboardStats()`
Returns user statistics including commits, PRs, reviews, and repositories.

**Returns:**
```typescript
{
  totalCommits: number;
  totalPrs: number;
  totalReviews: number;
  totalRepos: number;
}
```

#### `connectRepository(owner: string, repo: string, githubId: number)`
Connects a GitHub repository for automated reviews.

**Parameters:**
- `owner`: Repository owner username
- `repo`: Repository name
- `githubId`: GitHub repository ID

### Review Actions

#### `getReviews()`
Retrieves all code reviews for the authenticated user.

**Returns:**
```typescript
Array<{
  id: string;
  prNumber: number;
  prTitle: string;
  prUrl: string;
  review: string;
  status: "pending" | "completed" | "failed";
  createdAt: Date;
  repository: {
    name: string;
    owner: string;
  };
}>
```

#### `reviewPullRequest(owner: string, repo: string, prNumber: number)`
Initiates AI code review for a specific pull request.

### Settings Actions

#### `getUserProfile()`
Returns current user profile information.

#### `updateUserProfile(data: ProfileFormData)`
Updates user profile with new information.

#### `getConnectedRepositories()`
Returns list of connected repositories.

#### `disconnectRepository(repositoryId: string)`
Disconnects a repository from Code Horse.

### Payment Actions

#### `getSubscriptionData()`
Returns current subscription status and usage information.

#### `syncSubscriptionStatus()`
Synchronizes subscription status with Polar.sh.

## Error Handling

All API endpoints and server actions follow consistent error handling:

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

**Common Error Codes:**
- `401`: Unauthorized (not logged in)
- `403`: Forbidden (insufficient permissions)
- `404`: Resource not found
- `429`: Rate limit exceeded
- `500`: Internal server error

## Rate Limits

- Free tier: 5 reviews per repository per month
- PRO tier: Unlimited reviews
- Repository connections: 3 for free, unlimited for PRO

## Webhook Security

### GitHub Webhooks
Webhooks are verified using GitHub's signature verification with the webhook secret.

### Polar Webhooks
Polar webhooks are verified using the Polar webhook secret configured in Better Auth.
