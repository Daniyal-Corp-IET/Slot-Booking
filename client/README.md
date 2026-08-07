# ITX Learning Hub Client

React frontend for the ITX Learning Hub computer-lab booking portal.

## Run locally

```bash
npm install
npm run dev
```

Start the backend before opening the client. During development, Vite forwards
all `/api` and Socket.IO requests to `http://127.0.0.1:5000`.

## Environment

The default API path is `/api`. Create a `.env` file only when a different path
is needed:

```env
VITE_API_URL=/api
```

## Checks

```bash
npm run lint
npm run build
```
