# Running and Verifying Udaipur Scrollbook

To check if your setup is working correctly, you need to start both the **Backend** and the **Frontend** servers.

## 1. Start the Backend Server
Open a terminal in the `backend` directory and run:

```powershell
cd ../backend
npm install
npm run dev
```

> [!NOTE]
> Ensure your `.env` file in the `backend` folder has the correct `MONGO_URI` and `CLOUDINARY_*` credentials.
> You should see a message like `Server running on port 5000` and `MongoDB Connected`.

## 2. Start the Frontend Server
Open a **new** terminal in the `udaipur-scrollbook` directory and run:

```powershell
npm install
npm run dev
```

> [!NOTE]
> Vite will typically start the frontend on `http://localhost:5173`.

## 3. How to Check if they are working?

### A. Backend Check
You can test the backend directly by visiting:
- [http://localhost:5000/api/auth/me](http://localhost:5000/api/auth/me)
- It should return a `401 Unauthorized` or some JSON error (not a "404 Not Found"), which confirms the server is alive and responding.

### B. Frontend Check
- Open [http://localhost:5173](http://localhost:5173) in your browser.
- The UI should load correctly.

### C. Integration Check (The Real Test)
- Try to log in using the Google Login button (if configured).
- Check the browser's developer console (F12) -> Network tab. 
- Look for requests to `/api/auth/...`. If they show status 200/201/401 instead of "Connection Refused", the proxy is working and the frontend is successfully talking to the backend.

---

### Troubleshooting
- **Port Conflict**: If port 5000 or 5173 is already in use, you'll see an error. Kill the existing process or change the port in `.env` (for backend) or `vite.config.ts` (for frontend).
- **CORS Error**: If you see CORS issues, ensure your backend `.env` has `FRONTEND_URL=http://localhost:5173`.
