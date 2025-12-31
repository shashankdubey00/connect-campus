# Connect Campus API Documentation

Complete API reference for Connect Campus backend.

## Base URL

- **Development**: `http://localhost:5000`
- **Production**: `https://api.connectcampus.com`

## Authentication

Most endpoints require authentication via JWT token stored in HTTP-only cookie.

### Headers

No headers required for authentication (uses cookies). For manual testing:

```
Cookie: token=<jwt_token>
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "errorCode": "ERROR_CODE" // Optional
}
```

## Endpoints

### Authentication

#### POST `/api/auth/signup`

Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "student"
  }
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

---

#### POST `/api/auth/login`

Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "profile": { ... }
  }
}
```

---

#### GET `/api/auth/verify`

Verify authentication status.

**Headers:** Cookie with JWT token

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "profile": { ... }
  }
}
```

---

#### POST `/api/auth/logout`

Logout current user.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### GET `/auth/google`

Initiate Google OAuth login.

**Response:** Redirects to Google OAuth

---

#### GET `/auth/google/callback`

Google OAuth callback (handled automatically).

---

#### POST `/api/auth/forgot-password`

Request password reset OTP.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to email"
}
```

---

#### POST `/api/auth/verify-otp`

Verify OTP for password reset.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified",
  "resetToken": "temporary_token"
}
```

---

#### POST `/api/auth/reset-password`

Reset password with verified OTP.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "NewSecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

#### POST `/api/auth/set-password`

Set password for Google OAuth users.

**Headers:** Cookie with JWT token

**Request Body:**
```json
{
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password set successfully"
}
```

---

### College Search

#### GET `/api/colleges/search`

Search for colleges.

**Query Parameters:**
- `query` (string, optional): Search term
- `state` (string, optional): Filter by state
- `district` (string, optional): Filter by district (requires state)
- `limit` (number, optional): Max results (default: 10, max: 10)

**Example:**
```
GET /api/colleges/search?query=engineering&state=Maharashtra&limit=10
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "colleges": [
    {
      "aisheCode": "CODE123",
      "name": "College Name",
      "state": "Maharashtra",
      "district": "Mumbai"
    }
  ]
}
```

---

#### GET `/api/colleges/states`

Get all available states.

**Response:**
```json
{
  "success": true,
  "states": ["Maharashtra", "Karnataka", ...]
}
```

**Note:** Results are cached for 5 minutes.

---

#### GET `/api/colleges/districts`

Get districts for a state.

**Query Parameters:**
- `state` (string, required): State name

**Example:**
```
GET /api/colleges/districts?state=Maharashtra
```

**Response:**
```json
{
  "success": true,
  "districts": ["Mumbai", "Pune", ...]
}
```

**Note:** Results are cached for 5 minutes.

---

### Messages

#### GET `/api/messages/college/:collegeId`

Get messages for a college chat.

**Headers:** Cookie with JWT token

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Messages per page (default: 50)

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "message_id",
      "senderId": "user_id",
      "senderName": "John Doe",
      "text": "Message text",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "readBy": [...],
      "deliveredTo": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100
  }
}
```

---

#### DELETE `/api/messages/college/:collegeId/clear`

Clear all messages sent by current user in a college.

**Headers:** Cookie with JWT token

**Response:**
```json
{
  "success": true,
  "message": "Messages cleared successfully",
  "deletedCount": 10
}
```

---

#### DELETE `/api/messages/:messageId`

Delete a specific message (for sender only).

**Headers:** Cookie with JWT token

**Response:**
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

---

#### DELETE `/api/messages/:messageId/for-all`

Delete a message for all users (only sender can do this).

**Headers:** Cookie with JWT token

**Response:**
```json
{
  "success": true,
  "message": "Message deleted for all users"
}
```

---

#### GET `/api/messages/user/colleges`

Get all colleges where user has messages or follows.

**Headers:** Cookie with JWT token

**Response:**
```json
{
  "success": true,
  "colleges": [
    {
      "id": "college_id",
      "aisheCode": "CODE123",
      "name": "College Name",
      "state": "Maharashtra",
      "district": "Mumbai",
      "lastMessage": {
        "text": "Last message text",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "senderId": "user_id",
        "senderName": "John Doe"
      }
    }
  ]
}
```

---

### Profile

#### GET `/api/profile/me`

Get current user's profile.

**Headers:** Cookie with JWT token

**Response:**
```json
{
  "success": true,
  "profile": {
    "userId": "user_id",
    "displayName": "John Doe",
    "college": "CODE123",
    "profilePicture": "url",
    "bio": "User bio",
    "verified": false
  }
}
```

---

#### PUT `/api/profile/update`

Update user profile.

**Headers:** Cookie with JWT token

**Request Body:**
```json
{
  "displayName": "John Doe",
  "bio": "Updated bio",
  "college": "CODE123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "profile": { ... }
}
```

---

#### POST `/api/profile/college-id`

Upload college ID for verification.

**Headers:** Cookie with JWT token  
**Content-Type:** `multipart/form-data`

**Form Data:**
- `collegeId`: File (image)

**Response:**
```json
{
  "success": true,
  "message": "College ID uploaded successfully",
  "collegeIdUrl": "url_to_uploaded_file"
}
```

---

#### GET `/api/profile/verification-status`

Get verification status.

**Headers:** Cookie with JWT token

**Response:**
```json
{
  "success": true,
  "verified": false,
  "status": "pending",
  "message": "Verification pending"
}
```

---

#### POST `/api/profile/join-college`

Join a college.

**Headers:** Cookie with JWT token

**Request Body:**
```json
{
  "collegeId": "CODE123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Joined college successfully"
}
```

---

#### POST `/api/profile/leave-college`

Leave current college.

**Headers:** Cookie with JWT token

**Response:**
```json
{
  "success": true,
  "message": "Left college successfully"
}
```

---

#### POST `/api/profile/follow/:collegeId`

Follow a college.

**Headers:** Cookie with JWT token

**Response:**
```json
{
  "success": true,
  "message": "Following college"
}
```

---

#### DELETE `/api/profile/unfollow/:collegeId`

Unfollow a college.

**Headers:** Cookie with JWT token

**Response:**
```json
{
  "success": true,
  "message": "Unfollowed college"
}
```

---

#### GET `/api/profile/user/:userId`

Get another user's profile.

**Headers:** Cookie with JWT token

**Response:**
```json
{
  "success": true,
  "profile": {
    "userId": "user_id",
    "displayName": "John Doe",
    "college": "CODE123",
    "profilePicture": "url"
  }
}
```

---

#### GET `/api/profile/user/:userId/colleges`

Get colleges for a user.

**Headers:** Cookie with JWT token

**Response:**
```json
{
  "success": true,
  "colleges": [
    {
      "id": "college_id",
      "name": "College Name",
      "aisheCode": "CODE123"
    }
  ]
}
```

---

### Direct Messages

#### POST `/api/direct-messages/send`

Send a direct message.

**Headers:** Cookie with JWT token

**Request Body:**
```json
{
  "receiverId": "user_id",
  "text": "Message text"
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "message_id",
    "senderId": "sender_id",
    "receiverId": "receiver_id",
    "text": "Message text",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### GET `/api/direct-messages/:otherUserId`

Get direct messages with another user.

**Headers:** Cookie with JWT token

**Query Parameters:**
- `page` (number, optional): Page number
- `limit` (number, optional): Messages per page

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "message_id",
      "senderId": "sender_id",
      "receiverId": "receiver_id",
      "text": "Message text",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### GET `/api/direct-messages/conversations`

Get all direct message conversations.

**Headers:** Cookie with JWT token

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "userId": "user_id",
      "displayName": "John Doe",
      "lastMessage": {
        "text": "Last message",
        "timestamp": "2024-01-01T00:00:00.000Z"
      }
    }
  ]
}
```

---

#### DELETE `/api/direct-messages/:otherUserId/clear`

Clear direct messages with a user.

**Headers:** Cookie with JWT token

**Response:**
```json
{
  "success": true,
  "message": "Messages cleared successfully"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Input validation failed |
| `RATE_LIMIT` | Too many requests |
| `SERVER_ERROR` | Internal server error |

## Rate Limiting

- Default: 100 requests per 15 minutes per IP
- Some endpoints may have different limits
- Rate limit headers included in response:
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time (Unix timestamp)

## WebSocket Events

See Socket.IO documentation for real-time messaging events.

---

**Last Updated:** 2024  
**API Version:** 1.0






