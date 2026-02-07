# Dokumentasi API Admin IPM Quiz

Endpoint base: `/api`

## Autentikasi
Semua endpoint admin memerlukan header `Authorization: Bearer <session_token>` atau `Authorization: Bearer <admin_token>`.

### 1. Login Admin
**POST** `/auth/login`
- Body: `{ "username": "...", "password": "..." }`
- Response: `{ "status": "success", "session": "...", "role": "admin" }`

## Manajemen User

### Get All Users (Extended)
**GET** `/admin/questions?action=usersExtended`
- Response:
  ```json
  {
    "status": "success",
    "users": [
      {
        "id": 1,
        "username": "user1",
        "email": "user1@example.com",
        "role": "user",
        "total_quizzes": 5,
        "avg_score": 85.5
      }
    ]
  }
  ```

### Create User
**POST** `/admin/questions?action=createUser`
- Body:
  ```json
  {
    "username": "newuser",
    "password": "password123",
    "email": "email@example.com",
    "role": "user" // or "admin"
  }
  ```
- Response: `{ "status": "success", "message": "User created" }`

### Update User
**POST** `/admin/questions?action=updateUser`
- Body:
  ```json
  {
    "id": 123,
    "username": "updatedname", // optional
    "email": "newemail@example.com", // optional
    "password": "newpassword", // optional
    "role": "admin", // optional
    "active": true // optional
  }
  ```
- Response: `{ "status": "success", "message": "User updated" }`

### Delete User
**POST** `/admin/questions?action=deleteUser`
- Body: `{ "user_id": 123 }`
- Response: `{ "status": "success", "message": "User deleted" }`

### Reset User Attempt
**POST** `/admin/questions?action=resetAttempt`
- Body: `{ "user_id": 123, "quiz_set": 1 }`
- Response: `{ "status": "success", "message": "Attempt reset" }`

## Manajemen Jadwal

### Get Schedules
**GET** `/admin/questions?action=schedules`
- Response:
  ```json
  {
    "status": "success",
    "schedules": [
      {
        "id": 1,
        "title": "Kuis Ramadhan",
        "start_time": "2023-10-01T10:00:00Z",
        "end_time": "2023-10-01T12:00:00Z",
        "active": true
      }
    ]
  }
  ```

### Update/Create Schedule
**POST** `/admin/questions?action=updateSchedule`
- Body:
  ```json
  {
    "id": 1, // Optional (if update)
    "title": "Kuis Baru",
    "start_time": "...",
    "end_time": "..."
  }
  ```
- Response: `{ "status": "success", "message": "Schedule updated" }`

## System Operations

### Global Reset Set
**POST** `/system?action=resetSet`
- Body: `{ "quiz_set": 1 }`
- Response: `{ "status": "success", "message": "All results for set 1 deleted" }`

## Public Data (Quiz)

### Get Summary (Sets & Top Scores)
**GET** `/questions?mode=summary`
- Response:
  ```json
  {
    "sets": [...],
    "next_quiz": { ... },
    "top_scores": [
      {
        "username": "Champion",
        "score": 100,
        "quiz_title": "Kuis 1"
      }
    ]
  }
  ```
