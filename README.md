# ChatGPT Puppeteer API & Dashboard Workspace

An elegant full-stack application hosting an Express REST API that automates a headless Chrome browser via Puppeteer, coupled with a gorgeous visual dashboard controller in React. It supports multi-page isolation, concurrency queue limits, real-time backend log streaming, and an intelligent AI Simulator backup.

## Core Features

- **Multi-User Isolation**: Creates separate browser page contexts (`POST /pages`) matching custom page IDs, keeping parallel chats completely separate.
- **Queue Limits**: Restricts RAM usage by queueing page allocations and concurrent chatbot prompt submissions automatically.
- **Dual Engine Architecture**: Offers a real-time toggle between **Puppeteer Headless Browser Mode** and **Backup AI-Simulation Mode** (powered by `gemini-3.5-flash`). This guarantees full interactive functionality even in containerized environments where native Chrome execution might be restricted.
- **Embedded Cookie Syncer**: Avoids authentication barriers! Simply inspect and paste standard Puppeteer JSON cookie arrays in the control panel to connect your real ChatGPT login session instantly.
- **Live Terminal Monitor**: Streams server events and debugger logs immediately to the web interface.

---

## Technical Specifications & Endpoints

| Method | Route | Description |
|---|---|---|
| **GET** | `/` | Retrieve application specifications |
| **GET** | `/health` | Check browser linkage, session volumes, and active queues |
| **POST** | `/init` | Bootstrap headless browser on port 9222 if needed |
| **GET** | `/api/logs` | Fetch real-time operational server log history |
| **GET** | `/api/cookies` | Fetch current JSON cookies configuration |
| **POST** | `/api/cookies` | Overwrite JSON session cookies array |
| **POST** | `/pages` | Spawns a new segregated chat page context (*JSON body:* `{"mode": "puppeteer" | "simulation"}`) |
| **GET** | `/pages` | List all tracked active chat pages |
| **DELETE** | `/pages/:id` | Close one segregated page context and free up server RAM |
| **POST** | `/pages/:id/messages` | Dispatch a prompt question to a specific active target browser/simulator page |
| **POST** | `/shutdown` | Reclaims all resource memory by closing all browsers and pages |

---

## Authentication Cookie Injection Guide

1. Log in to your personal ChatGPT account at [chatgpt.com](https://chatgpt.com/) in your desktop browser.
2. Open your browser **Developer Tools** (Press `F12` or `Ctrl + Shift + I` / `Cmd + Opt + I` on Mac).
3. Navigate to the **Application** (Chrome/Edge) or **Storage** (Firefox) tab.
4. Select **Cookies** -> `https://chatgpt.com` and `https://openai.com`.
5. Export your cookies as a JSON array using a browser utility or identify the key values (`cf_clearance`, `__Secure-next-auth.session-token`).
6. Open this workspace, navigate to the **Cookie Sync** tab, paste the JSON array, and click **Save Active Cookies**!
7. Spawn a Puppeteer chat session and ask any question!

---

## Integration Shell Examples

### 1. Allocate a New Chat Session:
```bash
curl -X POST http://localhost:3000/pages \
  -H "Content-Type: application/json" \
  -d '{"mode": "puppeteer"}'
```
*Expected Reply:*
```json
{
  "id": "7e32f2e8-9a91-455f-9c15-7c7b8ff9af12",
  "createdAt": "2026-05-22T06:21:00.000Z",
  "busy": false,
  "mode": "puppeteer",
  "status": "Ready & Connected to ChatGPT"
}
```

### 2. Stream a Question to the Session:
```bash
curl -X POST http://localhost:3000/pages/7e32f2e8-9a91-455f-9c15-7c7b8ff9af12/messages \
  -H "Content-Type: application/json" \
  -d '{"message":"Introduce yourself briefly."}'
```
*Expected Reply:*
```json
{
  "id": "7e32f2e8-9a91-455f-9c15-7c7b8ff9af12",
  "message": "Introduce yourself briefly.",
  "response": "Hello! I am ChatGPT, a large language model trained by OpenAI..."
}
```
