import { useState, useEffect, useRef, FormEvent, MouseEvent } from "react";
import { 
  Bot, Terminal, Settings, Layers, Globe, Sparkles, RefreshCw, 
  Play, StopCircle, Trash2, Plus, Send, Radio, AlertTriangle, 
  CheckCircle2, Clock, Copy, Check, ShieldAlert, Cpu, CodeXml, AppWindow,
  Eye, EyeOff, Search, Menu, X, Maximize2, Minimize2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatSession, ChatMessage, ServerLog, HealthStats, CookieItem } from "./types";

export default function App() {
  // Application State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"logs" | "cookies" | "endpoints">("logs");
  const [promptValue, setPromptValue] = useState<string>("");
  const [stats, setStats] = useState<HealthStats | null>(null);
  const [logs, setLogs] = useState<ServerLog[]>([]);
  const [cookieInput, setCookieInput] = useState<string>("");
  const [cookieCount, setCookieCount] = useState<number>(0);
  const [creationMode, setCreationMode] = useState<"puppeteer" | "simulation">("puppeteer");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  
  // Workspace grid visibility toggles
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(true);
  
  // Responsive sidebar toggle for mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  
  // Connection / creation error tracking
  const [creationError, setCreationError] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "info" } | null>(null);
  
  // UI States
  const [isInitializing, setIsInitializing] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [testResponseStatus, setTestResponseStatus] = useState<string>("");
  const [isCopiedId, setIsCopiedId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // AURA Intro & Loader States
  const [showBootLoader, setShowBootLoader] = useState(() => {
    try {
      const saved = localStorage.getItem("aura_boot_v5");
      return saved ? false : true;
    } catch {
      return true;
    }
  });
  const [showIntroVideo, setShowIntroVideo] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootLogs, setBootLogs] = useState<string[]>([]);

  // Simulation loading telemetry log entries for AURA boot sequences
  useEffect(() => {
    if (!showBootLoader) return;

    const logsSequence = [
      "AURA SUPERCOMPUTER v2.09b Core Activation Sequence...",
      "CHECKING PORTS AND INTERFACES... SECURED ON INGRESS:3000",
      "SPAWNING CHROMIUM HEADLESS CONTAINER ENVIRONMENT...",
      "SYNCING PRE-LOADED CRYPTOGRAPHIC OPENAI TOKENS...",
      "BYPASSING INTEGRITY SCRAPERS (PROXY STATE ACTIVE)...",
      "ESTABLISHING PUPPETEER REMOTE TROUBLESHOOTING PORT 9222...",
      "AURA LIVE TELEMETRY STREAM RATE LOCKED AT 3000ms...",
      "VEO MEDIA PLAYBACK STREAM INTRO REGISTERED & COMPILED...",
      "SYSTEM CLEARANCE GRANTED. DECRYPT SEQUENCE ENDS. SYSTEM LEVEL 100% STANDBY."
    ];

    let currentLogIndex = 0;
    const logInterval = setInterval(() => {
      if (currentLogIndex < logsSequence.length) {
        setBootLogs(prev => [...prev, logsSequence[currentLogIndex]]);
        currentLogIndex++;
      }
    }, 280);

    const progressInterval = setInterval(() => {
      setBootProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          clearInterval(logInterval);
          setTimeout(() => {
            setShowBootLoader(false);
            setShowIntroVideo(true);
            try {
              localStorage.setItem("aura_boot_v5", "completed");
            } catch {}
          }, 350);
          return 100;
        }
        const step = Math.floor(Math.random() * 12) + 5;
        return Math.min(prev + step, 100);
      });
    }, 100);

    return () => {
      clearInterval(progressInterval);
      clearInterval(logInterval);
    };
  }, [showBootLoader]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Auto-poll controllers
  const chatEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Poll intervals
  useEffect(() => {
    fetchStats();
    fetchLogs();
    fetchSessions();
    fetchCookies();

    const statsInterval = setInterval(fetchStats, 3000);
    const logsInterval = setInterval(fetchLogs, 2500);
    const sessionsInterval = setInterval(fetchSessions, 4000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(logsInterval);
      clearInterval(sessionsInterval);
    };
  }, []);

  // Scroll active elements
  useEffect(() => {
    if (autoScrollEnabled) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedSessionId, sessions, autoScrollEnabled]);

  // Global Hotkey Support (Ctrl+Enter / Cmd+Enter to dispatch the prompt instantly)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        const activeForm = document.getElementById("prompt_form") as HTMLFormElement;
        if (activeForm) {
          e.preventDefault();
          // Find and click the submit button
          const btn = activeForm.querySelector("button[type='submit']") as HTMLButtonElement;
          if (btn && !btn.disabled) {
            btn.click();
          }
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);

  // Primary API Actions
  const fetchStats = async () => {
    try {
      const res = await fetch("/health");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.warn("Express backend unavailable or launching", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch {}
  };

  const fetchCookies = async () => {
    try {
      const res = await fetch("/api/cookies");
      if (res.ok) {
        const data = await res.json();
        setCookieInput(JSON.stringify(data.cookies, null, 2));
        setCookieCount(data.count);
      }
    } catch {}
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch("/pages");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        
        // Auto-select first session if none selected
        if (data.length > 0 && !selectedSessionId) {
          setSelectedSessionId(data[0].id);
        }
      }
    } catch {}
  };

  const handleInitBrowser = async () => {
    setIsInitializing(true);
    try {
      const res = await fetch("/init", { method: "POST" });
      if (res.ok) {
        await fetchStats();
        await fetchLogs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleShutdown = async () => {
    if (!confirm("Are you sure you want to close all active browser sessions?")) return;
    setIsShuttingDown(true);
    try {
      const res = await fetch("/shutdown", { method: "POST" });
      if (res.ok) {
        setSelectedSessionId(null);
        await fetchStats();
        await fetchSessions();
        await fetchLogs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsShuttingDown(false);
    }
  };

  const handleCreateSession = async () => {
    setIsCreatingPage(true);
    setCreationError(false);
    try {
      const res = await fetch("/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: creationMode }),
      });
      if (res.ok) {
        const page = await res.json();
        setSelectedSessionId(page.id);
        await fetchSessions();
        await fetchStats();
        await fetchLogs();
        setToast({ message: "Successfully initialized new tab & page session!", type: "success" });
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || "Server failed to spawn or connect browser page context.";
        setCreationError(true);
        setToast({ message: `Spawn Error: ${errMsg}`, type: "error" });
        await fetchSessions();
        await fetchStats();
        await fetchLogs();
      }
    } catch (err: any) {
      console.error(err);
      setCreationError(true);
      setToast({ message: `Failed to connect with server: ${err.message || err}`, type: "error" });
    } finally {
      setIsCreatingPage(false);
    }
  };

  const triggerSendMessageWithText = async (sessId: string, promptText: string) => {
    try {
      const res = await fetch(`/pages/${sessId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: promptText }),
      });
      if (res.ok) {
        await fetchSessions();
        await fetchLogs();
      } else {
        const errData = await res.json().catch(() => ({}));
        setToast({ message: `Failed to dispatch boot sequence: ${errData.error || "Server error"}`, type: "error" });
      }
    } catch (err: any) {
      setToast({ message: `Network error: ${err.message}`, type: "error" });
    }
  };

  const handleRunStartModel = async () => {
    let sessionToUse = selectedSession;
    if (!sessionToUse) {
      setToast({ message: "Initializing new AURA session for system boot...", type: "info" });
      setIsCreatingPage(true);
      try {
        const res = await fetch("/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: creationMode }),
        });
        if (res.ok) {
          const page = await res.json();
          setSelectedSessionId(page.id);
          await fetchSessions();
          await fetchStats();
          await fetchLogs();
          setToast({ message: "AURA Session Allocated. Executing /start command...", type: "success" });
          await triggerSendMessageWithText(page.id, "/start");
        } else {
          setToast({ message: "Failed to initialize tab viewport.", type: "error text" });
        }
      } catch (err: any) {
        setToast({ message: `Launch err: ${err.message}`, type: "error" });
      } finally {
        setIsCreatingPage(false);
      }
    } else {
      setToast({ message: "Sending /start command to active session...", type: "info" });
      await triggerSendMessageWithText(sessionToUse.id, "/start");
    }
  };

  const handleDeleteSession = async (id: string, e: MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/pages/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedSessionId === id) {
          setSelectedSessionId(null);
        }
        await fetchSessions();
        await fetchStats();
        await fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameSession = async (id: string, name: string) => {
    setEditingSessionId(null);
    // Optimistic UI update
    setSessions(prev => prev.map(s => s.id === id ? { ...s, name } : s));

    try {
      const res = await fetch(`/pages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        await fetchSessions();
        await fetchStats();
        await fetchLogs();
      }
    } catch (err) {
      console.error(err);
      await fetchSessions();
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!promptValue.trim() || !selectedSessionId) return;

    const currentPrompt = promptValue;
    setPromptValue("");

    // Optimistically push message into screen to offer instant UX feedback
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === selectedSessionId) {
          return {
            ...s,
            busy: true,
            messages: [
              ...s.messages,
              { role: "user", content: currentPrompt, timestamp: new Date().toISOString() },
            ],
          };
        }
        return s;
      })
    );

    try {
      const res = await fetch(`/pages/${selectedSessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentPrompt }),
      });
      
      await fetchSessions();
      await fetchStats();
      await fetchLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCookies = async () => {
    try {
      let parsed;
      try {
        parsed = JSON.parse(cookieInput);
        if (!Array.isArray(parsed)) {
          alert("Cookies must be a valid JSON array.");
          return;
        }
      } catch (e: any) {
        alert(`Invalid JSON format: ${e.message}`);
        return;
      }

      const res = await fetch("/api/cookies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookies: parsed }),
      });

      if (res.ok) {
        const data = await res.json();
        setCookieCount(data.count);
        setTestResponseStatus("Cookies updated successfully!");
        setTimeout(() => setTestResponseStatus(""), 4000);
        await fetchLogs();
      }
    } catch (err: any) {
      alert(`Error updating cookies: ${err.message}`);
    }
  };

  const loadPlaceholderCookies = () => {
    const fallbackTemplate = [
      {
        name: "cf_clearance",
        value: "REPLACE_WITH_YOUR_CF_CLEARANCE_VALUE",
        domain: ".chatgpt.com",
        path: "/",
        expires: 9999999999,
        httpOnly: true,
        secure: true,
        sameSite: "Lax"
      },
      {
        name: "__Secure-next-auth.session-token",
        value: "REPLACE_WITH_YOUR_SESSION_TOKEN",
        domain: ".chatgpt.com",
        path: "/",
        expires: 9999999999,
        httpOnly: true,
        secure: true,
        sameSite: "Lax"
      }
    ];
    setCookieInput(JSON.stringify(fallbackTemplate, null, 2));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const copySessionId = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setIsCopiedId(id);
    setTimeout(() => setIsCopiedId(null), 2000);
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  const filteredSessions = sessions.filter((s) => 
    s.id.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic grid column configurations based on layout toggles
  let chatColClass = "col-span-12";
  if (showSidebar && showDiagnostics) {
    chatColClass = "col-span-12 md:col-span-8 lg:col-span-6 border-t border-white/10 pt-4 flex flex-col h-full min-h-[500px] md:min-h-0";
  } else if (showSidebar) {
    chatColClass = "col-span-12 md:col-span-8 lg:col-span-9 border-t border-white/10 pt-4 flex flex-col h-full min-h-[500px] md:min-h-0";
  } else if (showDiagnostics) {
    chatColClass = "col-span-12 md:col-span-12 lg:col-span-9 border-t border-white/10 pt-4 flex flex-col h-full min-h-[500px] md:min-h-0";
  } else {
    chatColClass = "col-span-12 border-t border-white/10 pt-4 flex flex-col h-full min-h-[500px] md:min-h-0";
  }

  return (
    <div id="main_container" className="min-h-screen bg-[#050505] text-[#F5F5F5] font-sans flex flex-col p-6 sm:p-8 overflow-y-auto md:overflow-hidden select-none">
      
      {/* Bold Brutalist Header Section */}
      <header id="nav_header" className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-10 lg:mb-12 gap-6 pb-6 border-b border-white/10">
        <div className="flex flex-col">
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-none italic uppercase">
            Aura<br />Supercomputer
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <span className={`px-3 py-1 text-black font-bold text-xs uppercase tracking-widest ${stats?.browserConnected ? 'bg-[#D9FF00]' : 'bg-rose-500 text-white'}`}>
              {stats?.browserConnected ? "AURA Active" : "AURA Offline"}
            </span>
            <span className="text-white/40 font-mono text-[10px] uppercase tracking-widest italic bg-white/5 px-2 py-0.5 border border-white/10 text-[#D9FF00] font-bold">
              Powered by OpenAI
            </span>
            <button
              id="replay_intro_btn"
              onClick={() => setShowIntroVideo(true)}
              className="px-3 py-1 bg-zinc-900 border border-white/15 hover:border-[#D9FF00]/50 text-white/80 hover:text-[#D9FF00] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer font-sans"
              title="Replay AURA Supercomputer Intro Cinematic Video"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D9FF00] animate-pulse" />
              <span>Replay Intro</span>
            </button>
          </div>
        </div>

        {/* Right side controls & identifiers */}
        <div className="text-left md:text-right flex flex-col items-start md:items-end w-full md:w-auto">
          <div className="text-[10px] font-mono text-white/40 mb-1 tracking-widest">ENDPOINT</div>
          <div className="text-lg md:text-xl font-bold border-b border-white/20 font-mono tracking-tighter select-all">
            localhost:3000
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2 w-full md:w-auto">
            {!stats?.browserConnected && (
              <button
                id="btn_launch_browser"
                onClick={handleInitBrowser}
                disabled={isInitializing}
                className="border border-white p-3 hover:bg-white hover:text-black transition-colors font-black text-xs uppercase cursor-pointer disabled:opacity-40"
              >
                {isInitializing ? "Initializing..." : "Initialize Browser"}
              </button>
            )}
            
            <button
              id="btn_server_shutdown"
              onClick={handleShutdown}
              disabled={isShuttingDown || sessions.length === 0}
              className="border border-rose-500/40 hover:bg-rose-600 hover:text-white transition-colors text-rose-400 py-3 px-4 font-black text-xs uppercase cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
              title="Terminate all active pages and ports"
            >
              {isShuttingDown ? "Shutting down..." : "Terminate Services"}
            </button>
          </div>
        </div>
      </header>

      {/* Metrics & Interactive Live Telemetry Chart Section */}
      <div className="grid grid-cols-12 gap-8 mb-8 items-stretch">
        
        {/* Left Side: Numerical Metrics Column */}
        <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-4">
          <div className="border border-white/10 bg-white/[0.01] p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Active Sessions</span>
            <div className="text-4xl sm:text-5xl font-black font-mono text-[#D9FF00] mt-2">
              {sessions.length < 10 ? `0${sessions.length}` : sessions.length}
            </div>
            <span className="text-[9px] font-mono text-white/20 uppercase mt-1">allocated instances</span>
          </div>
          <div className="border border-white/10 bg-white/[0.01] p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Chrome Status</span>
            <div className={`text-4xl sm:text-5xl font-black font-mono mt-2 ${stats?.browserConnected ? 'text-[#D9FF00]' : 'text-rose-500'}`}>
              {stats?.browserConnected ? "RUN" : "HALT"}
            </div>
            <span className="text-[9px] font-mono text-white/20 uppercase mt-1">headless instance</span>
          </div>
          <div className="border border-white/10 bg-white/[0.01] p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Queued Jobs</span>
            <div className="text-4xl sm:text-5xl font-black font-mono text-white mt-2">
              {((stats?.activity.queuedPageCreates || 0) + (stats?.activity.queuedMessages || 0)) < 10
                ? `0${(stats?.activity.queuedPageCreates || 0) + (stats?.activity.queuedMessages || 0)}`
                : (stats?.activity.queuedPageCreates || 0) + (stats?.activity.queuedMessages || 0)}
            </div>
            <span className="text-[9px] font-mono text-white/20 uppercase mt-1">scheduled worker tasks</span>
          </div>
          <div className="border border-white/10 bg-white/[0.01] p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Live Cookies</span>
            <div className="text-4xl sm:text-5xl font-black font-mono text-[#D9FF00] mt-2">
              {cookieCount < 10 ? `0${cookieCount}` : cookieCount}
            </div>
            <span className="text-[9px] font-mono text-white/20 uppercase mt-1">session credentials</span>
          </div>
        </div>

        {/* Right Side: The Chart Section (Made Bigger and Much More Eye-Catching) */}
        <div id="telemetry_chart_card" className="col-span-12 lg:col-span-7 border border-[#D9FF00]/20 bg-[#D9FF00]/[0.02] p-5 flex flex-col justify-between min-h-[220px]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D9FF00] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D9FF00]"></span>
              </span>
              <h3 className="text-xs font-black uppercase tracking-widest text-[#D9FF00] font-sans">
                AURA Cluster Live Heartbeat & Stream Performance Rate
              </h3>
            </div>
            <span className="text-[9px] font-mono text-white/40 uppercase">frequency: 3000ms</span>
          </div>

          {/* SVG Telemetry Chart */}
          <div className="flex-1 w-full min-h-[120px] relative mt-1 flex items-end">
            <svg viewBox="0 0 500 130" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="purpleGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D9FF00" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#D9FF00" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              <line x1="0" y1="32" x2="500" y2="32" stroke="white" strokeWidth="0.5" strokeOpacity="0.08" strokeDasharray="3 3"/>
              <line x1="0" y1="65" x2="500" y2="65" stroke="white" strokeWidth="0.5" strokeOpacity="0.08" strokeDasharray="3 3"/>
              <line x1="0" y1="97" x2="500" y2="97" stroke="white" strokeWidth="0.5" strokeOpacity="0.08" strokeDasharray="3 3"/>
              <line x1="0" y1="130" x2="500" y2="130" stroke="white" strokeWidth="1" strokeOpacity="0.15"/>
              
              <line x1="83" y1="0" x2="83" y2="130" stroke="white" strokeWidth="0.5" strokeOpacity="0.05" strokeDasharray="2 2"/>
              <line x1="166" y1="0" x2="166" y2="130" stroke="white" strokeWidth="0.5" strokeOpacity="0.05" strokeDasharray="2 2"/>
              <line x1="249" y1="0" x2="249" y2="130" stroke="white" strokeWidth="0.5" strokeOpacity="0.05" strokeDasharray="2 2"/>
              <line x1="332" y1="0" x2="332" y2="130" stroke="white" strokeWidth="0.5" strokeOpacity="0.05" strokeDasharray="2 2"/>
              <line x1="415" y1="0" x2="415" y2="130" stroke="white" strokeWidth="0.5" strokeOpacity="0.05" strokeDasharray="2 2"/>

              {/* Dynamic glowing wave area */}
              <path
                d="M0 130 Q 40 80, 83 95 T 166 60 T 249 110 T 332 45 T 415 75 T 500 20 L 500 130 Z"
                fill="url(#purpleGlow)"
              />
              
              {/* Line graph */}
              <path
                d="M0 130 Q 40 80, 83 95 T 166 60 T 249 110 T 332 45 T 415 75 T 500 20"
                fill="none"
                stroke="#D9FF00"
                strokeWidth="2.5"
                className="drop-shadow-[0_0_8px_rgba(217,255,0,0.6)]"
              />

              {/* Point highlights */}
              <circle cx="83" cy="95" r="3.5" fill="#D5FF00" className="animate-pulse" />
              <circle cx="166" cy="60" r="3.5" fill="#D5FF00" />
              <circle cx="249" cy="110" r="3.5" fill="#D5FF00" />
              <circle cx="332" cy="45" r="3.5" fill="#D5FF00" />
              <circle cx="415" cy="75" r="3.5" fill="#60A5FA" />
              <circle cx="500" cy="20" r="4.5" fill="#D5FF00" className="animate-pulse" />
            </svg>
          </div>

          <div className="mt-3 flex justify-between text-[9px] font-mono text-white/40">
            <span>MEM: {stats ? (stats.uptime ? "OK" : "STANDBY") : "POLLING..."}</span>
            <span className="text-[#D9FF00]">VOLATILITY: MINIMAL RISK STATE</span>
            <span>SYSTEM GAIN: 1.1x</span>
          </div>
        </div>
      </div>

      {/* Mobile Hamburger Toggle for Live Sessions Selection */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen(prev => !prev)}
        className="md:hidden flex items-center justify-between gap-3 bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] active:bg-white/10 text-white font-black text-xs uppercase tracking-widest transition-all p-4 mb-6 w-full cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          {isSidebarOpen ? <X className="h-4 w-4 text-[#D9FF00]" /> : <Menu className="h-4 w-4 text-[#D9FF00]" />}
          <span>{isSidebarOpen ? "Collapse Navigation Sidebar" : "Expand Navigation Sidebar"}</span>
        </div>
        <span className="text-[10px] font-mono bg-[#D9FF00] text-black px-2 py-0.5 font-bold">
          {sessions.length < 10 ? `0${sessions.length}` : sessions.length} CHATS
        </span>
      </button>

      {/* Dynamic Command & Workspace Toggles Panel */}
      <section id="workspace_controller_deck" className="mb-8 p-4 bg-white/[0.01] border border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider">WORKSPACE VIEW:</span>
          
          <button
            type="button"
            onClick={() => {
              if (!showSidebar && !showDiagnostics) {
                setShowSidebar(true);
                setShowDiagnostics(true);
              } else {
                setShowSidebar(false);
                setShowDiagnostics(false);
              }
            }}
            className={`px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-widest border cursor-pointer transition-all duration-150 flex items-center gap-1.5 ${
              (!showSidebar && !showDiagnostics)
                ? "bg-[#D9FF00] border-[#D9FF00] text-black font-extrabold shadow-[0_0_10px_rgba(217,255,0,0.3)]" 
                : "bg-[#D9FF00]/10 border-[#D9FF00]/30 text-[#D9FF00] hover:bg-[#D9FF00]/20"
            }`}
          >
            {(!showSidebar && !showDiagnostics) ? (
              <>
                <Minimize2 className="h-3 w-3" />
                <span>[X] FULL CHAT SCREEN</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3 w-3" />
                <span>[ ] FULL CHAT SCREEN</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowSidebar(p => !p)}
            className={`px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-widest border cursor-pointer transition-colors ${
              showSidebar 
                ? "bg-white/10 border-white/20 text-white" 
                : "bg-transparent border-white/10 text-white/40 hover:text-white"
            }`}
          >
            {showSidebar ? "▣ Sidebar Enabled" : "▢ Sidebar Hidden"}
          </button>

          <button
            type="button"
            onClick={() => setShowDiagnostics(p => !p)}
            className={`px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-widest border cursor-pointer transition-colors ${
              showDiagnostics 
                ? "bg-white/10 border-white/20 text-white" 
                : "bg-transparent border-white/10 text-white/40 hover:text-white"
            }`}
          >
            {showDiagnostics ? "▣ Diagnostics Enabled" : "▢ Diagnostics Hidden"}
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">AURA RUNNER:</span>
          <button
            type="button"
            onClick={handleRunStartModel}
            className="w-full sm:w-auto py-2 px-6 bg-[#D9FF00] hover:bg-white text-black font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all leading-none border border-transparent shadow-[0_0_15px_rgba(217,255,0,0.25)] hover:shadow-none cursor-pointer"
            title="Execute model system initialization sequence on current chat viewport"
          >
            <Play className="w-3 h-3 fill-current" />
            RUN MODEL /start
          </button>
        </div>
      </section>

      {/* Main Execution Workspace Grid */}
      <main id="main_workspace" className="flex-1 grid grid-cols-12 gap-8 min-h-0">
        
        {/* Column Left: Live Sessions Sidebar (Col span 4 on large, 12 on mobile) */}
        <section id="sessions_panel" className={`col-span-12 md:col-span-4 lg:col-span-3 pb-6 md:pb-0 flex flex-col border-t border-white/10 pt-4 h-full min-h-[250px] md:min-h-0 ${showSidebar ? (isSidebarOpen ? "block" : "hidden md:flex") : "hidden"}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-black uppercase tracking-tighter">Live Sessions</h2>
            <span className="text-[10px] font-mono text-white/40 italic uppercase">active viewports</span>
          </div>

          {/* Creation control & mode toggle row */}
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-2 p-1 bg-white/[0.03] border border-white/10">
              <button
                onClick={() => setCreationMode("puppeteer")}
                className={`text-center py-2 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                  creationMode === "puppeteer" 
                    ? "bg-[#D9FF00] text-black" 
                    : "text-white/40 hover:text-white"
                }`}
              >
                Puppeteer Bot
              </button>
              <button
                onClick={() => setCreationMode("simulation")}
                className={`text-center py-2 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                  creationMode === "simulation" 
                    ? "bg-[#D9FF00] text-black" 
                    : "text-white/40 hover:text-white"
                }`}
                title="Simulation fallback using Gemini parameters"
              >
                AI Simulator
              </button>
            </div>

            <button
              id="btn_create_page"
              onClick={handleCreateSession}
              disabled={isCreatingPage}
              className={`w-full py-4.5 px-4 font-black uppercase text-xs tracking-widest transition-all duration-200 cursor-pointer disabled:opacity-40 ${
                creationError
                  ? "bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/60"
                  : "bg-white hover:bg-[#D9FF00] text-black"
              }`}
            >
              {isCreatingPage ? "+ LINKING PORT..." : creationError ? "✖ INITIALIZATION FAILED" : "+ NEW CHAT PAGE"}
            </button>
          </div>

          {/* Real-time prefix filter query */}
          <div className="relative mb-4 flex items-center">
            <span className="absolute left-3 text-white/40">
              <Search className="h-3.5 w-3.5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="FILTER BY ID PREFIX..."
              className="w-full bg-white/[0.02] text-white placeholder-white/20 text-base md:text-[10px] pl-9 pr-8 py-3.5 font-bold tracking-widest border border-white/10 focus:border-[#D9FF00] outline-none font-mono uppercase"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 text-white/40 hover:text-[#D9FF00] text-[9px] font-mono hover:underline font-bold"
              >
                CLEAR
              </button>
            )}
          </div>

          {/* Scrollable list window */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 min-h-0 max-h-[320px] md:max-h-none">
            {sessions.length === 0 ? (
              <div className="p-4 border border-dashed border-white/10 bg-white/[0.01] text-center text-xs text-white/30 italic font-mono">
                No active pages active on localhost:3000
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-4 border border-dashed border-rose-500/20 bg-rose-950/10 text-center text-xs text-rose-300 italic font-mono space-y-1">
                <div>No sessions match ID:</div>
                <div className="font-bold text-white tracking-widest uppercase overflow-hidden text-ellipsis">"{searchQuery}"</div>
                <button 
                  onClick={() => setSearchQuery("")} 
                  className="text-[#D9FF00] text-[10px] underline not-italic font-bold tracking-widest mt-2 uppercase cursor-pointer"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              filteredSessions.map((session) => {
                const isSelected = session.id === selectedSessionId;
                const isSim = session.mode === "simulation";

                const hasError = session.error || (session.status && (
                  session.status.toLowerCase().includes("failed") || 
                  session.status.toLowerCase().includes("failure") || 
                  session.status.toLowerCase().includes("interrupted") || 
                  session.status.toLowerCase().includes("err")
                ));
                const statusType = hasError ? "error" : (session.busy ? "busy" : "ready");

                return (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`p-3 border-l-2 transition-all cursor-pointer flex justify-between items-center ${
                      isSelected
                        ? "bg-white/5 border-[#D9FF00] text-white"
                        : "bg-transparent border-white/10 hover:bg-white/[0.02] text-white/50"
                    }`}
                  >
                    <div className="flex flex-col gap-1 min-w-0 pr-2">
                      {editingSessionId === session.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => handleRenameSession(session.id, editingName)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleRenameSession(session.id, editingName);
                            } else if (e.key === "Escape") {
                              setEditingSessionId(null);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-black/80 font-mono text-base md:text-xs text-white border border-[#D9FF00] px-1 py-0.5 outline-none font-bold uppercase w-full"
                          autoFocus
                        />
                      ) : (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSessionId(session.id);
                            setEditingName(session.name || session.id.substring(0, 8));
                          }}
                          className="font-mono text-xs tracking-tighter text-white hover:text-[#D9FF00] flex items-center gap-2 group cursor-text"
                          title="Click to rename session"
                        >
                          <span 
                            className={`h-2 w-2 rounded-full flex-shrink-0 transition-colors ${
                              statusType === "error" 
                                ? "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.75)]" 
                                : statusType === "busy" 
                                  ? "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.75)]" 
                                  : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.75)]"
                            }`}
                            title={statusType === "error" ? "Error detected" : statusType === "busy" ? "Busy processing" : "Ready for commands"}
                          />
                          <span className="truncate">
                            {session.name ? session.name : `ID: ${session.id.substring(0, 8)}...`}
                          </span>
                          <span className="text-[9px] text-white/20 group-hover:text-[#D9FF00] opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
                        </span>
                      )}
                      <span className="text-[9px] text-[#D9FF00] font-mono uppercase tracking-widest">
                        {isSim ? "AI Simulation" : "Chrome Engine"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className={`text-[8.5px] font-black uppercase tracking-widest px-1.5 py-0.5 border ${
                        statusType === "error"
                          ? "border-rose-500/30 text-rose-400 bg-rose-500/10"
                          : statusType === "busy"
                            ? "border-amber-500/30 text-amber-300 bg-amber-500/10 animate-pulse"
                            : "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                      }`}>
                        {statusType === "error" ? "ERR" : statusType === "busy" ? "BUSY" : "OK"}
                      </span>
                      
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="text-white/30 hover:text-rose-500 p-1"
                        title="Close active tab"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Column Center & Right Area: Terminal Output & Chat (Dynamic responsive sizing) */}
        <section id="chat_view_panel" className={chatColClass}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-black uppercase tracking-tighter italic">Execution Console</h2>
            <div className="flex gap-4 items-center">
              <button
                type="button"
                onClick={() => setAutoScrollEnabled((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                  autoScrollEnabled
                    ? "bg-[#D9FF00]/10 border-[#D9FF00]/40 text-[#D9FF00]"
                    : "bg-white/[0.02] border-white/10 text-white/40 hover:text-white"
                }`}
                title="Toggle automated view scrolling to latest incoming outputs"
              >
                <div className={`w-1 h-1 rounded-full ${autoScrollEnabled ? "bg-[#D9FF00]" : "bg-white/20"}`}></div>
                Auto-Scroll: {autoScrollEnabled ? "On" : "Off"}
              </button>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 ${cookieCount > 0 ? "bg-[#D9FF00]" : "bg-white/20"}`}></div>
                <span className="text-[10px] font-mono text-white/40 uppercase">Cookies Stacked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#D9FF00]"></div>
                <span className="text-[10px] font-mono text-white/40 uppercase">Headless Chrome</span>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-white/[0.02] border border-white/10 p-6 font-mono text-sm overflow-hidden flex flex-col h-full">
            {selectedSession ? (
              <>
                {/* Fallback Simulation Notice */}
                {selectedSession.mode === "simulation" ? (
                  <div className="mb-4 p-3 bg-[#D9FF00]/10 border border-[#D9FF00]/20 text-[#D9FF00] text-[11px] font-mono leading-relaxed space-y-1">
                    <div className="font-extrabold flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse" /> AI Emulation Active
                    </div>
                    <div className="text-white/60 text-[10px]">
                      Headless Chrome is bypassed. This session is running queries smoothly via <span className="text-[#D9FF00] font-bold">AURA ChatGPT-4o Offline Emulation Core</span>. 
                      To use real-world Puppeteer actions, import actual browser session cookies into the <span className="text-[#D9FF00] font-bold">Cookie Sync</span> tab to bypass Cloudflare validation blocks.
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-zinc-900 border border-white/5 text-[11px] font-mono leading-relaxed space-y-1">
                    <div className="font-extrabold flex items-center gap-1.5 uppercase tracking-wider text-white/90">
                      <Terminal className="h-3.5 w-3.5 text-[#D9FF00]" /> Real-time Puppeteer Bot Active
                    </div>
                    <div className="text-white/60 text-[10px]">
                      AURA is automating a real virtual Chromium browser session. In case of errors or Cloudflare blocks, configure valid active OpenAI session cookies in the <span className="text-[#D9FF00] font-bold">Cookie Sync</span> tab.
                    </div>
                  </div>
                )}

                {/* Active Message History */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 select-text scrollbar-thin scrollbar-thumb-white/10">
                  {selectedSession.messages.length === 0 ? (
                    <div className="space-y-3 pb-4">
                      <div className="text-white/30 text-xs">[{new Date().toLocaleTimeString()}] BROWSER STATUS: {selectedSession.status.toUpperCase()}</div>
                      <div className="text-[#D9FF00] font-bold text-xs">SYS_LINK: ACTIVE AND WAITING FOR INITIAL DISPATCH...</div>
                      <p className="text-xs text-white/50 leading-relaxed max-w-md">
                        This session is now fully allocated. Submit a text query below to invoke the Puppeteer flow. Chrome will load, type characters, submit, and extract the text back seamlessly.
                      </p>
                    </div>
                  ) : (
                    selectedSession.messages.map((msg, index) => {
                      const isAss = msg.role === "assistant";
                      return (
                        <div key={index} className="space-y-1 py-3 border-b border-white/[0.04] last:border-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className={isAss ? "text-[#D9FF00] font-black uppercase tracking-wider text-xs md:text-sm" : "text-white/40 font-mono font-bold uppercase text-[11px]"}>
                              {isAss ? "ChatGPT:" : "User:"}
                            </span>
                            <span className="text-[10px] text-white/20">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-base md:text-lg text-white/95 leading-relaxed whitespace-pre-wrap pl-1 font-mono tracking-wide py-1.5 selection:bg-[#D9FF00] selection:text-black">
                            {msg.content}
                          </p>
                        </div>
                      );
                    })
                  )}

                  {selectedSession.busy && (
                    <div className="text-[#D9FF00] text-xs font-bold animate-pulse flex items-center gap-2 py-2">
                      <span className="w-2 h-2 bg-[#D9FF00]"></span>
                      <span>BROWSER RUNTIME BUSY SCRAPING CHROME PROCESS INDEX...</span>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Interaction options / Quick Suggestion Chips */}
                {!selectedSession.busy && (
                  <div className="mb-3 pt-2 border-t border-white/5">
                    <div className="text-[9px] text-[#D9FF00] font-bold tracking-widest uppercase mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" /> Quick Chat Prompts
                    </div>
                    <div className="flex flex-wrap gap-1.5 select-none">
                      {[
                        "Explain closures in JavaScript Simply",
                        "Tell me a hilarious debugging joke",
                        "Create a simple responsive Tailwind card",
                        "How to sync cookies in Puppeteer?"
                      ].map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setPromptValue(prompt)}
                          className="text-[9px] font-mono border border-white/10 px-2 py-1 bg-white/[0.02] hover:bg-[#D9FF00] hover:text-black hover:border-transparent transition-colors cursor-pointer text-white/50 uppercase tracking-tighter"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interaction footer form row */}
                <div className="mt-auto">
                  <form id="prompt_form" onSubmit={handleSendMessage} className="border-t border-white/10 pt-4 flex flex-col sm:flex-row gap-4 items-stretch">
                    <input
                      type="text"
                      value={promptValue}
                      onChange={(e) => setPromptValue(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                          e.preventDefault();
                          const btn = document.querySelector("#prompt_form button[type='submit']") as HTMLButtonElement;
                          if (btn && !btn.disabled) {
                            btn.click();
                          }
                        }
                      }}
                      disabled={selectedSession.busy}
                      placeholder="ENTER QUERY PROMPT..."
                      className="flex-1 bg-white/[0.02] border border-white/10 p-4 outline-none text-white placeholder-white/20 uppercase font-black tracking-widest text-lg md:text-xl focus:border-[#D9FF00] focus:ring-0 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={selectedSession.busy || !promptValue.trim()}
                      className="bg-[#D9FF00] text-black px-8 py-4 font-black uppercase text-sm hover:bg-white transition-colors cursor-pointer disabled:opacity-30 flex items-center justify-center gap-2 sm:self-stretch"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send</span>
                    </button>
                  </form>
                  <div className="text-[10px] text-white/30 font-mono flex items-center gap-2 mt-1.5 select-none">
                    <span className="bg-white/10 px-1.5 py-0.5 rounded text-[8px] text-[#D9FF00] font-bold">CTRL + ENTER</span>
                    <span>to dispatch query instantly</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-white/30 text-xs italic py-12">
                <Terminal className="h-8 w-8 text-white/10 mb-2" />
                <span>Initialize or select an allocation ID in the left list.</span>
              </div>
            )}
          </div>
        </section>

        {/* Column Right: Diagnostic tab controls (Col span 3, dynamic flex toggle) */}
        <section id="diagnostics_panel" className={`col-span-12 md:col-span-12 lg:col-span-3 border-t border-white/10 pt-4 flex flex-col h-full min-h-[300px] md:min-h-0 ${showDiagnostics ? "flex" : "hidden"}`}>
          
          {/* Tab selections list bar */}
          <div className="flex border border-white/10 p-1 mb-4 bg-white/[0.01]">
            {(["logs", "cookies", "endpoints"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                  activeTab === tab 
                    ? "bg-[#D9FF00] text-black" 
                    : "text-white/40 hover:text-white"
                }`}
              >
                {tab === "logs" ? "Events Stream" : tab === "cookies" ? "Cookie Sync" : "API Guide"}
              </button>
            ))}
          </div>

          {/* Active rendering block */}
          <div className="flex-1 bg-white/[0.01] border border-white/10 p-5 font-mono text-xs flex flex-col overflow-hidden h-full min-h-0">
            
            {activeTab === "logs" && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex justify-between items-center text-[10px] text-white/40 uppercase tracking-wider font-black mb-3">
                  <span>ACTIVITIES TERM MONITOR</span>
                  <span className="text-[#D9FF00]">POLLING ACTIVE</span>
                </div>
                
                <div className="flex-grow overflow-y-auto bg-black p-3 text-[10px] leading-relaxed space-y-1.5 select-text scrollbar-thin">
                  {logs.length === 0 ? (
                    <div className="text-white/20 italic">Awaiting backend system events...</div>
                  ) : (
                    logs.map((log, idx) => {
                      let col = "text-white/40";
                      if (log.type === "error") col = "text-red-500 font-bold";
                      if (log.type === "warn") col = "text-amber-500 italic";
                      if (log.type === "success") col = "text-[#D9FF00] font-bold";
                      return (
                        <div key={idx} className="pb-1 border-b border-white/[0.03] last:border-0">
                          <span className="text-white/25 mr-1 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                          <span className={`${col} mr-1.5`}>[{log.type.toUpperCase()}]</span>
                          <span className="text-white/80">{log.message}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === "cookies" && (
              <div className="flex-1 flex flex-col h-full overflow-y-auto space-y-3">
                <div className="text-[10px] text-white/40 uppercase tracking-widest font-black">
                  REAL ACCOUNT COOKIES CONFIG
                </div>
                <p className="text-[11px] text-white/60 leading-normal">
                  To bypass login blocks, import standard Puppeteer cookie arrays obtained from your active browser session. Paste below then save.
                </p>

                <div className="flex-grow flex flex-col min-h-[140px]">
                  <textarea
                    value={cookieInput}
                    onChange={(e) => setCookieInput(e.target.value)}
                    placeholder="[ { 'name': 'cf_clearance', 'value': '...' } ]"
                    className="flex-grow w-full bg-black border border-white/10 p-3 text-base md:text-[10px] text-white placeholder-white/20 resize-none font-mono focus:border-[#D9FF00] outline-none"
                    rows={6}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveCookies}
                    className="flex-grow bg-[#D9FF00] text-black py-2 px-3 font-black uppercase text-xs hover:bg-white transition-colors cursor-pointer"
                  >
                    Save Cookies
                  </button>
                  <button
                    onClick={loadPlaceholderCookies}
                    className="border border-white/20 hover:border-white text-white py-2 px-3 font-black uppercase text-xs transition-colors cursor-pointer"
                  >
                    Template
                  </button>
                </div>

                {testResponseStatus && (
                  <div className="p-2 border border-[#D9FF00]/20 bg-[#D9FF00]/10 text-center font-bold text-[10px] text-[#D9FF00]">
                    {testResponseStatus}
                  </div>
                )}
              </div>
            )}

            {activeTab === "endpoints" && (
              <div className="flex-1 flex flex-col h-full overflow-y-auto space-y-3">
                <div className="text-[10px] text-white/40 uppercase tracking-widest font-black mb-1">
                  INTEGRATION REST CHEATSHEET
                </div>
                
                <div className="space-y-4">
                  <div className="bg-black p-2.5 border border-white/5 space-y-1">
                    <div className="font-bold text-[#D9FF00] text-[11px]">POST /pages</div>
                    <pre className="text-[9.5px] text-white/50 overflow-x-auto select-all">
                      {`curl -X POST http://localhost:3000/pages \\
  -H "Content-Type: application/json" \\
  -d '{"mode":"puppeteer"}'`}
                    </pre>
                  </div>

                  <div className="bg-black p-2.5 border border-white/5 space-y-1">
                    <div className="font-bold text-[#D9FF00] text-[11px]">POST /pages/:id/messages</div>
                    <pre className="text-[9.5px] text-white/50 overflow-x-auto select-all">
                      {`curl -X POST http://localhost:3000/pages/id/messages \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Summarize Node.js"}'`}
                    </pre>
                  </div>

                  <div className="bg-black p-2.5 border border-white/5 space-y-1">
                    <div className="font-bold text-[#D9FF00] text-[11px]">GET /health</div>
                    <pre className="text-[9.5px] text-white/50 overflow-x-auto select-all">
                      {`curl http://localhost:3000/health`}
                    </pre>
                  </div>
                </div>
              </div>
            )}

          </div>
        </section>

      </main>

      {/* Stout Brutalist Footer Frame */}
      <footer className="mt-8 flex flex-col sm:flex-row justify-between border-t border-white/20 pt-4 gap-3">
        <div className="text-[10px] font-mono text-white/40 uppercase tracking-[0.25em] text-center sm:text-left">
          PUPPETEER AUTOMATED BRIDGE / OPENAI PROTOCOL
        </div>
        <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest justify-center">
          <span className="text-[#D9FF00]">System Health 100%</span>
          <span className="text-white/40">Memory limit: auto</span>
          <span className="text-white/40">Uptime: ACTIVE</span>
        </div>
      </footer>

      {/* Dynamic Toast Alert Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center justify-between gap-3 px-4 py-3 border font-mono text-[11px] uppercase tracking-wider shadow-2xl ${
              toast.type === "error"
                ? "bg-[#180509]/95 border-rose-500 text-rose-200"
                : toast.type === "success"
                ? "bg-[#05180c]/95 border-emerald-500 text-emerald-200"
                : "bg-zinc-950/95 border-[#D9FF00] text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                toast.type === "error" ? "bg-rose-500 animate-pulse" : toast.type === "success" ? "bg-emerald-500 animate-pulse" : "bg-[#D9FF00] animate-pulse"
              }`} />
              <span className="font-bold">{toast.message}</span>
            </div>
            <button 
              type="button"
              onClick={() => setToast(null)} 
              className="ml-4 text-white/40 hover:text-white font-mono text-[9px] font-bold border border-white/10 hover:border-white/20 px-1 py-0.5 cursor-pointer bg-white/5 transition-colors"
            >
              CLOSE
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AURA SYSTEM BOOTLOADER SEQUENCE SCREEN */}
      <AnimatePresence>
        {showBootLoader && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 bg-[#050505] z-50 flex flex-col justify-between p-8 sm:p-12 font-mono select-none overflow-hidden"
          >
            {/* Top Info Bar */}
            <div className="flex justify-between items-center text-[10px] sm:text-xs text-white/40 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4 text-[#D9FF00]" />
                <span className="font-bold tracking-widest text-white/80">AURA // OPERATIONAL INITIALIZATION</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D9FF00] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D9FF00]"></span>
                </span>
                <span className="text-[#D9FF00] uppercase font-bold tracking-widest text-[9.5px]">BOOT SEQUENCE RUNNING</span>
              </div>
            </div>

            {/* Central Status, Metrics & Progress Meter */}
            <div className="my-auto max-w-2xl w-full mx-auto flex flex-col items-center text-center space-y-8">
              <div className="space-y-2">
                <div className="text-white/20 text-xs font-bold uppercase tracking-[0.3em] font-sans">SYSTEM CORE STATUS</div>
                <h1 className="text-6xl sm:text-8xl font-black text-[#D9FF00] font-sans tracking-tighter italic uppercase animate-pulse">
                  AURA v2.09
                </h1>
              </div>

              {/* Glowing Dynamic Circle Graph or Progress */}
              <div className="relative w-44 h-44 flex items-center justify-center border border-white/5 rounded-full bg-white/[0.01]">
                <div className="absolute inset-2 border border-dashed border-white/10 rounded-full animate-spin [animation-duration:12s]" />
                <div className="absolute inset-4 border border-[#D9FF00]/10 rounded-full animate-spin [animation-duration:4s]" />
                <div className="text-4xl sm:text-5xl font-black font-mono tracking-tighter text-white">
                  {bootProgress}%
                </div>
              </div>

              {/* Progress Bar Frame */}
              <div className="w-full space-y-2">
                <div className="h-2 border border-white/20 bg-white/5 p-[1.5px] w-full">
                  <motion.div 
                    className="h-full bg-[#D9FF00]" 
                    style={{ width: `${bootProgress}%` }}
                    transition={{ ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-white/40 font-bold uppercase tracking-widest">
                  <span>RAM STABILITY: ACTIVE</span>
                  <span>INGRESS ROUTING: 3000 (OK)</span>
                </div>
              </div>

              {/* Scrolling Terminal Load Logs Output */}
              <div className="w-full text-left py-3 px-4 border border-white/10 bg-black/60 font-mono text-[9.5px] text-white/60 min-h-[95px] max-h-[140px] overflow-y-auto space-y-1 select-none scrollbar-none">
                {bootLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-[#D9FF00] select-none">&gt;</span>
                    <span>{log}</span>
                  </div>
                ))}
                {bootLogs.length === 0 && <div className="text-white/20 italic">AWAITING SEQUENCE BOOT PROTOCOL...</div>}
              </div>
            </div>

            {/* Skip/Bypass controls footer */}
            <div className="flex justify-between items-center text-[10px] text-white/30 border-t border-white/10 pt-4">
              <span>SECURITY LEVEL: ROOT MASTER</span>
              <button
                onClick={() => {
                  setShowBootLoader(false);
                  setShowIntroVideo(true);
                  try {
                    localStorage.setItem("aura_boot_v5", "completed");
                  } catch {}
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D9FF00]/50 text-white hover:text-[#D9FF00] font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer"
              >
                SKIP SYSTEM BOOT &gt;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AURA CINEMATIC INTRO VIDEO MODAL */}
      <AnimatePresence>
        {showIntroVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 select-none"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative max-w-4xl w-full border border-[#D9FF00]/30 bg-zinc-950 p-1 flex flex-col shadow-2xl"
            >
              {/* Brutalist Frame Header */}
              <div className="flex justify-between items-center bg-black/80 px-4 py-3 border-b border-white/10 select-none">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#D9FF00] animate-pulse" />
                  <span className="font-mono text-xs font-black tracking-widest text-[#D9FF00] uppercase">
                    AURA VEO INTRO SYSTEM CINEMATIC
                  </span>
                </div>
                
                <button
                  onClick={() => setShowIntroVideo(false)}
                  className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white font-mono text-[9.5px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Dismiss cinematic video and enter the application dashboard"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Dismiss Intro</span>
                </button>
              </div>

              {/* Video Player Display Container */}
              <div className="w-full bg-black aspect-video relative flex items-center justify-center overflow-hidden border border-white/5 group">
                
                {/* Embedded HTML5 Video using multiple fallbacks */}
                <video
                  src="/video.mp4"
                  className="w-full h-full object-cover relative z-10"
                  autoPlay
                  controls
                  loop
                  muted
                  playsInline
                  onError={(e) => {
                    console.warn("Local video.mp4 failed, checking fallbacks or loading alternative interactive visualizer stream.");
                    // Dynamic fallback inside state or render loop
                  }}
                >
                  {/* Fallback paths for maximum directory compatibility */}
                  <source src="/aura_intro.mp4" type="video/mp4" />
                  <source src="/aura_supercomputer_intro_video.mp4" type="video/mp4" />
                  <source src="/video.mp4" type="video/mp4" />
                  
                  {/* Full fallback interface inside if browser doesn't execute tags */}
                  <div className="text-white text-center">Video element unsupported.</div>
                </video>

                {/* Cyber-Core CRT Backdrop fallback visualizer in case video file loads but is missing */}
                <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950 via-black to-zinc-900 flex flex-col justify-between p-6 sm:p-10 font-mono text-xs select-none">
                  {/* Scanline effect rendering overlay */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(217,255,0,0.04),transparent)] pointer-events-none z-0" />
                  <div className="absolute inset-0 bg-linear-to-b from-transparent via-white/[0.005] to-transparent bg-[size:100%_4px] pointer-events-none z-0" />

                  <div className="flex justify-between items-start text-[10px] text-white/30 z-0">
                    <span>AURA_SYSTEM_FEED_SIMULATOR</span>
                    <span>ONLINE STREAM: 100% ACCURACY</span>
                  </div>

                  {/* Neural Grid Overlay Visual */}
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 z-0">
                    <Sparkles className="w-12 h-12 text-[#D9FF00]/80 animate-spin [animation-duration:15s]" />
                    <div className="space-y-1.5">
                      <div className="text-[#D9FF00] font-black uppercase text-xl sm:text-2xl tracking-[0.25em]">AURA // RUN</div>
                      <div className="text-[10px] text-white/50 tracking-wider">HEADLESS AUTOMATION WORKSPACE & INTEGRATED VEO TERMINAL</div>
                    </div>

                    <div className="text-[9px] text-[#D9FF00]/40 font-mono max-w-sm mx-auto leading-relaxed uppercase border border-[#D9FF00]/20 bg-[#D9FF00]/[0.01] p-3 text-left">
                      <div className="text-[#D9FF00] font-bold mb-1">// SYSTEM METRICS</div>
                      Uptime: 100% stable / latency: minimal / active chrome node controllers / sync tokens authenticated and dispatched in workspace thread.
                    </div>
                  </div>

                  <div className="flex justify-between text-[10px] text-white/30 z-0">
                    <span>VEO MULTIPHASE RENDER FEED</span>
                    <span>ACTIVE GAIN: 1.1x</span>
                  </div>
                </div>

                {/* Fast-paced HUD stats graphics overlaying video */}
                <div className="absolute bottom-4 left-4 z-20 bg-black/80 border border-white/10 px-3 py-2 font-mono text-[9px] text-white/70 space-y-0.5 pointer-events-none hidden sm:block">
                  <div className="flex justify-between gap-4"><span className="text-white/40">HOST PORT:</span> <span className="font-bold text-[#D9FF00]">3000</span></div>
                  <div className="flex justify-between gap-4"><span className="text-white/40">RENDER CACHE:</span> <span className="font-bold text-[#D9FF00]">VEO//ACTIVE</span></div>
                  <div className="flex justify-between gap-4"><span className="text-white/40">AUDIO GAIN:</span> <span className="font-bold text-white">1.1x</span></div>
                </div>
              </div>

              {/* Action Bottom Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-center bg-black/90 p-4 gap-3 border-t border-white/10 select-none">
                <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono text-center sm:text-left">
                  Featuring terminal streams, glowing yellow UI metrics, and chrome headless automation control.
                </span>
                
                <button
                  onClick={() => setShowIntroVideo(false)}
                  className="bg-[#D9FF00] text-black hover:bg-white hover:text-black py-2.5 px-6 font-black uppercase text-xs tracking-widest transition-all cursor-pointer w-full sm:w-auto text-center"
                >
                  Enter Workspace &gt;
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
