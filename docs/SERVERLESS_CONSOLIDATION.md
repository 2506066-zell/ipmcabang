# Serverless Function Consolidation & Optimization

## Overview
To address the Vercel Hobby plan limit of 12 serverless functions per deployment, we have performed a comprehensive consolidation of the API endpoints.

**Previous Status:** 13 Functions (Over Limit)
**New Status:** 7 Functions (Well within Limit)

## Changes Implemented

### 1. Admin & System Consolidation (`api/admin_handler.js`)
We have combined system maintenance functions into the admin handler, as they are privileged operations.
*   **Handler File:** `api/admin_handler.js`
*   **Consolidated Endpoints:**
    *   `/api/migrate` -> `?action=migrate`
    *   `/api/resetSet` -> `?action=resetSet`
    *   Plus all existing Admin CRUD operations.

### 2. User & Notification Consolidation (`api/users.js`)
We have merged notification handling into the user handler to keep user-related logic together.
*   **Handler File:** `api/users.js`
*   **Consolidated Endpoints:**
    *   `/api/notifications` -> `?action=notifications` (GET)
    *   `/api/notifications` (mark read) -> `?action=markNotificationsRead` (POST)
    *   Plus existing User CRUD operations.

### 3. Root & Health Consolidation (`api/index.js`)
We have moved public health checks to the root index handler.
*   **Handler File:** `api/index.js`
*   **Consolidated Endpoints:**
    *   `/api/health` -> `?action=health`
    *   `/api/dbHealth` -> `?action=dbHealth`

### 4. Vercel Configuration (`vercel.json`)
We utilized Vercel Rewrites to maintain the existing API URL structure. This ensures that the frontend code works seamlessly, although we also updated the frontend code for robustness.

```json
{
  "src": "/api/resetSet",
  "dest": "/api/admin_handler?action=resetSet"
}
```

### 5. Remaining Functions
The following functions remain independent:
*   `api/auth_handler.js` (Authentication)
*   `api/questions.js` (Core Quiz Logic)
*   `api/results.js` (Leaderboard)
*   `api/events.js` (SSE Real-time Updates)

## Verification
All endpoints have been mapped via `vercel.json` rewrites and frontend code has been updated to use the new action-based parameters where appropriate.
