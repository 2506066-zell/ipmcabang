# Serverless Function Consolidation & Optimization

## Overview
To address the Vercel Hobby plan limit of 12 serverless functions per deployment, we have performed a comprehensive consolidation of the API endpoints.

**Previous Status:** 13 Functions (Over Limit)
**New Status:** 6 Functions (Well within Limit)

## Changes Implemented

### 1. Auth Consolidation (`api/auth_handler.js`)
We have combined all authentication-related functions into a single handler.
*   **Handler File:** `api/auth_handler.js`
*   **Consolidated Endpoints:**
    *   `/api/auth/login` -> `?action=login`
    *   `/api/auth/register` -> `?action=register`
    *   `/api/auth/promoteAdmin` -> `?action=promoteAdmin`
    *   `/api/auth/seedAdmins` -> `?action=seedAdmins`
    *   `/api/auth/adminLogin` -> `?action=adminLogin`

### 2. System Consolidation (`api/system_handler.js`)
We have combined system maintenance and health check functions.
*   **Handler File:** `api/system_handler.js`
*   **Consolidated Endpoints:**
    *   `/api/dbHealth` -> `?action=dbHealth`
    *   `/api/health` -> `?action=health`
    *   `/api/migrate` -> `?action=migrate`
    *   `/api/resetSet` -> `?action=resetSet`

### 3. Vercel Configuration (`vercel.json`)
We utilized Vercel Rewrites to maintain the existing API URL structure. This ensures that the frontend code does **not** need to be changed.

```json
{
  "src": "/api/auth/login",
  "dest": "/api/auth_handler?action=login"
}
```

### 4. Remaining Standalone Functions
The following functions remain independent due to their high usage frequency or distinct logic:
*   `api/questions.js` (Core Quiz Logic)
*   `api/results.js` (Core Leaderboard Logic)
*   `api/users.js` (User Management)
*   `api/index.js` (Root/Entry)

## Verification
You can use `admin/monitor.html` to verify that all consolidated endpoints are responding correctly through the rewrite layer.

## Future Recommendations
If the limit is approached again:
1.  Combine `questions.js`, `results.js`, and `users.js` into a `api/data_handler.js`.
2.  Consider moving static logic to Edge Middleware.
