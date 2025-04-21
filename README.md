# Pathfinder 2e Initiative Tracker

A React + TypeScript front end (Vite) paired with an Express + Socket.IO back end for real‑time initiative tracking over a local network.

## Prerequisites

- Node.js ≥ 16.x
- npm ≥ 8.x
- A machine on your LAN (e.g. your laptop’s IP is `192.168.1.154`)

## Repository layout

```
vibe-tracker/
├─ init-server/           # Express + Socket.IO server (TypeScript)
│  ├─ index.ts
│  └─ roomManager.ts
└─ src/                   # Vite React front end
   ├─ components/
   ├─ services/
   ├─ store/
   ├─ App.tsx
   └─ main.tsx
```

---

## 1. Install dependencies

From the repo root:

```bash
# 1.1 Server
cd init-server
npm install

# 1.2 Front end
cd ../
npm install
```

---

## 2. Configuration

### Back end

By default the server will listen on **0.0.0.0:3001**. You can override the port with the `PORT` environment variable:

```bash
# from init-server/
export PORT=4000
```

### Front end

The React app infers the API host/port from where it is served. You can also set these in a `.env.local` in the repo root:

```env
# .env.local
VITE_API_HOST=192.168.1.154
VITE_API_PORT=3001
VITE_SOCKET_PORT=3001
```

---

## 3. Running locally (LAN‑accessible)

### 3.1 Start the back end

```bash
cd init-server
npm start
# you should see:
#   Server listening on 0.0.0.0:3001
```

### 3.2 Start the front end

```bash
cd ../
npm run dev -- --host
# Vite will bind to 0.0.0.0:5173 by default
```

---

## 4. Access the app

On any device in your local network, open a browser and go to:

```
http://<your‑machine‑ip>:5173
```

For example:
```
http://192.168.1.154:5173
```

---

## 5. Workflow

1. **Create game**  
   - Click **Create Game** → the GM gets a 4‑letter code.  
   - Share the link (e.g. `http://192.168.1.154:5173/join/ABCD`) or use the copy‑to‑clipboard button.

2. **Join game**  
   - Players click **Join Game** from the home page, enter the 4‑letter code, then enter name, initiative, and color.

3. **Track initiative**  
   - GM can add monsters (hidden or visible), reorder entries by drag‑and‑drop, and click **Next Turn**.  
   - Player view shows only visible entries with a ▶️ icon marking the current turn.

---

## 6. NPM scripts

In the **init-server/** folder:

- `npm start`  
  Run the TypeScript server with `ts-node`, binding to all interfaces.

In the **root** folder:

- `npm run dev`  
  Start the Vite dev server (add `-- --host` to expose on LAN).  
- `npm run build`  
  Build the React production bundle.

---

## 7. Notes

- No deployment required—this runs entirely on your local network.  
- If you change ports or hostnames, update your `.env.local` and restart both servers.  
- To clear GM mode (so a refresh doesn’t rejoin as GM), clear `localStorage` in your browser’s dev tools.
