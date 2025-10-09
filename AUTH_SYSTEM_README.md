# Email/Password Authentication System

## Overview
A simple, self-contained email/password authentication system has been added to PlateMate. This system operates independently and does not interfere with existing routes, AI functions, or Replit configuration.

## Implementation Details

### Files Added/Modified
1. **`server/auth.ts`** - New authentication module with all auth logic
2. **`server/index.ts`** - Updated to import and register auth routes
3. **`shared/schema.ts`** - Added `passwordHash` field to users table

### Database Changes
- Added `password_hash` column to the `users` table
- Uses PostgreSQL (existing DATABASE_URL connection)
- Schema changes applied via `npm run db:push`

### Security Features
- Passwords hashed using bcryptjs with salt rounds of 10
- Email validation with regex pattern
- Minimum password length requirement (6 characters)
- Session tokens generated using uuid v4
- In-memory session storage (as requested)

## API Endpoints

### POST /api/register
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "uuid-v4-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com"
  }
}
```

**Error Responses:**
- `400` - Invalid email format or password too short
- `400` - User already exists
- `500` - Internal server error

---

### POST /api/login
Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "uuid-v4-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com"
  }
}
```

**Error Responses:**
- `401` - Invalid email or password
- `500` - Internal server error

---

### GET /api/checkSession
Verify if a session token is valid.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com"
  }
}
```

**Error Responses:**
- `401` - No token provided
- `401` - Invalid or expired token
- `500` - Internal server error

---

### POST /api/logout
End a user session.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Error Responses:**
- `400` - No token provided or invalid token
- `500` - Internal server error

---

## Testing

All endpoints have been tested and are working correctly:

✅ User registration with email and password  
✅ User login with credentials  
✅ Session validation  
✅ User logout  
✅ Session invalidation after logout  

## Session Storage

Sessions are stored in-memory as requested:
```typescript
const sessions: Record<string, string> = {};
// Format: { "token-uuid": "user-email" }
```

**Note:** In-memory sessions will be lost when the server restarts. For production, consider using a persistent session store.

## Integration

The auth module is imported in `server/index.ts`:
```typescript
import authRoutes from "./auth";
app.use("/api", authRoutes);
```

This setup ensures the auth routes are registered without modifying any existing application logic.

## Compatibility

✅ No conflicts with existing routes  
✅ PlateMate app loads and functions normally  
✅ Existing Replit authentication unchanged  
✅ No changes to AI analysis or diary functionality  

---

## Example Usage

### Register a new user
```bash
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Check session
```bash
curl http://localhost:5000/api/checkSession \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Logout
```bash
curl -X POST http://localhost:5000/api/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```
