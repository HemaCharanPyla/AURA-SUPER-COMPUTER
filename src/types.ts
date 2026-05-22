export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  name?: string;
  createdAt: string;
  lastMessageAt: string | null;
  busy: boolean;
  mode: "puppeteer" | "simulation";
  messagesCount: number;
  status: string;
  messages: ChatMessage[];
  fallback?: boolean;
  error?: string;
}

export interface ServerLog {
  timestamp: string;
  type: "info" | "error" | "warn" | "success";
  message: string;
}

export interface HealthStats {
  ok: boolean;
  browserConnected: boolean;
  sessions: number;
  limits: {
    maxSessions: number;
    maxConcurrentPageCreates: number;
    maxConcurrentMessages: number;
  };
  activity: {
    activePageCreates: number;
    queuedPageCreates: number;
    activeMessages: number;
    queuedMessages: number;
  };
}

export interface CookieItem {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}
