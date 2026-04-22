# Free Deploy Plan

This project can be hosted more cheaply by simplifying the runtime:

- `frontend` on Vercel
- `backend` on Vercel
- MongoDB Atlas free tier for the database
- no Redis server
- no separate ML service
- realtime sockets disabled

## Backend environment

Use these production settings for a free-friendly deploy:

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend-domain.vercel.app
PUBLIC_API_URL=https://your-backend-domain.vercel.app

MONGODB_URI=your_mongodb_atlas_connection_string
REDIS_URL=redis://unused-for-free-mode

JWT_PRIVATE_KEY_BASE64=...
JWT_PUBLIC_KEY_BASE64=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=optional
CLOUDINARY_API_KEY=optional
CLOUDINARY_API_SECRET=optional

SMTP_HOST=optional
SMTP_PORT=587
SMTP_USER=optional
SMTP_PASS=optional
EMAIL_FROM=Verifact <noreply@verifact.app>

ML_SERVICE_URL=
ML_INTERNAL_KEY=local-dev-internal-key
ML_PROVIDER=local
ENABLE_REALTIME=false
USE_IN_MEMORY_DATABASE=false
USE_IN_MEMORY_REDIS=true
USE_IN_MEMORY_SERVICES=false
LOCAL_ADMIN_EMAIL=kazarif02@gmail.com
LOCAL_ADMIN_PASSWORD=%Karif10%

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

## Frontend environment

```env
VITE_API_URL=https://your-backend-domain.vercel.app/api/v1
VITE_SOCKET_URL=https://your-backend-domain.vercel.app
VITE_ENABLE_REALTIME=false
```

## Tradeoffs

- Direct messaging still works through normal API calls.
- Live socket updates are disabled in free mode.
- ML prediction uses a local heuristic instead of the Python service.
- Media uploads still need Cloudinary for reliable hosted storage.
