"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import RequireAuth from "@/components/auth/RequireAuth";
import Topbar from "@/components/layout/Topbar";
import { apiFetch } from "@/lib/api";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Mic,
  Square,
  Send,
  Plus,
  RotateCcw,
  Sparkles,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Copy,
} from "lucide-react";

function isBrowserSpeechSupported() {
  const hasSTT =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  const hasTTS = typeof window !== "undefined" && "speechSynthesis" in window;
  return { hasSTT: !!hasSTT, hasTTS: !!hasTTS };
}

function speakBrowserTTS(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1;
  u.pitch = 1;
  window.speechSynthesis.speak(u);
}

function MarkdownMessage({ text }) {
  return (
    <div className="prose prose-slate max-w-none prose-p:my-2 prose-li:my-1 prose-hr:my-4 prose-hr:border-slate-200 prose-strong:font-semibold prose-code:text-[12px] prose-code:bg-slate-200/60 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => <h1 className="text-lg font-bold mt-2 mb-2" {...props} />,
          h2: (props) => <h2 className="text-base font-bold mt-2 mb-2" {...props} />,
          h3: (props) => <h3 className="text-sm font-bold mt-2 mb-2" {...props} />,
          p: (props) => <p className="leading-relaxed" {...props} />,
          hr: () => <hr className="border-slate-200" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export default function TutorPage() {
  const params = useParams();
  const courseId = (params?.courseId || "COURSE").toString().toUpperCase();

  const { hasSTT, hasTTS } = useMemo(isBrowserSpeechSupported, []);

  // toast
  const [toast, setToast] = useState("");
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  // Chat
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `Welcome to **${courseId} Tutor**.\n\nAsk about worksheets, concepts, or request a Unit quiz.\n\n---\n**Tip:** Tap the mic to speak and it will type into the box.`,
    },
  ]);

  const scrollerRef = useRef(null);

  const suggestions = useMemo(
    () => [
      "Give me a Unit 1 practice quiz (10 questions).",
      "Explain this topic step-by-step with 2 examples.",
      "Help me solve this worksheet question: (paste question)",
      "Create 5 practice questions and check my answers.",
    ],
    []
  );

  // Browser STT typing (optional)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Optional browser auto-read fallback
  const [autoRead, setAutoRead] = useState(false);

  // Voice Assistant (Realtime)
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("idle"); // idle|connecting|connected|error
  const [voiceMuted, setVoiceMuted] = useState(false);

  const voiceName = "shimmer"; // supported voice

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Avoid duplicates
  const lastUserTranscriptRef = useRef("");
  const lastAssistantTranscriptRef = useRef("");

  // Scroll
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Stop STT if voice starts
  useEffect(() => {
    if (voiceMode && isListening) stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceMode]);

  function startListening() {
    if (!hasSTT || voiceMode) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();

    recognition.lang = courseId === "FRE1D" ? "fr-CA" : "en-CA";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let full = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        full += event.results[i][0].transcript;
      }
      setInput(full.trim());
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  function stopListening() {
    const r = recognitionRef.current;
    if (r) {
      r.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }

  async function sendMessage(text) {
    const userText = (text ?? input).trim();
    if (!userText || busy) return;

    setBusy(true);
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setInput("");

    try {
      const r = await apiFetch("/api/tutor/chat", {
        method: "POST",
        body: JSON.stringify({ courseId, conversationId, message: userText }),
      });

      if (!conversationId && r.conversationId) setConversationId(r.conversationId);

      setMessages((prev) => [...prev, { role: "assistant", text: r.answer }]);

      if (autoRead && hasTTS && !voiceMode) speakBrowserTTS(r.answer);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: `**Error:** ${e.message}` }]);
      showToast(e.message || "Chat error");
    } finally {
      setBusy(false);
    }
  }

  function newChat() {
    setConversationId(null);
    setMessages([{ role: "assistant", text: `New chat for **${courseId}**. Ask your question.` }]);
    setInput("");
  }

  async function regenerateLast() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;

    setMessages((prev) => {
      const copy = [...prev];
      if (copy.length && copy[copy.length - 1].role === "assistant") copy.pop();
      return copy;
    });

    await sendMessage(lastUser.text);
  }

  async function copyLastAnswer() {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;
    await copyToClipboard(lastAssistant.text);
    showToast("Copied last answer");
  }

  function setMicMuted(muted) {
    setVoiceMuted(muted);
    const stream = localStreamRef.current;
    if (!stream) return;
    for (const t of stream.getAudioTracks()) t.enabled = !muted;
  }

  async function toggleVoiceMode() {
    if (voiceMode) {
      await stopRealtimeVoice();
      setVoiceMode(false);
      return;
    }
    setVoiceMode(true);
    await startRealtimeVoice();
  }

  function addUserTranscriptToChat(text) {
    const t = (text || "").trim();
    if (!t) return;
    if (t === lastUserTranscriptRef.current) return;
    lastUserTranscriptRef.current = t;
    setMessages((prev) => [...prev, { role: "user", text: t }]);
  }

  function addAssistantTranscriptToChat(text) {
    const t = (text || "").trim();
    if (!t) return;
    if (t === lastAssistantTranscriptRef.current) return;
    lastAssistantTranscriptRef.current = t;
    setMessages((prev) => [...prev, { role: "assistant", text: t }]);
  }

  /**
   * ✅ Voice mode (NO CORS):
   * - Get client secret from backend (/api/realtime/session)
   * - Create WebRTC offer locally
   * - Send offer.sdp to backend (/api/realtime/offer)
   * - Backend talks to OpenAI /v1/realtime/calls and returns answer sdp
   * - DataChannel events are printed into chat
   */
  async function startRealtimeVoice() {
    setVoiceStatus("connecting");

    try {
      // 1) client_secret from backend
      const sess = await apiFetch("/api/realtime/session", {
        method: "POST",
        body: JSON.stringify({ courseId, voice: voiceName }),
      });

      if (!sess?.ok) throw new Error(sess?.error || "Realtime session error");

      const ephemeralKey = sess?.client_secret?.value;
      const model = sess?.model || "gpt-realtime";

      if (!ephemeralKey || sess.mock) {
        setVoiceStatus("error");
        showToast("Voice Assistant not ready (mock key). Check backend OPENAI_API_KEY.");
        return;
      }

      // 2) Create PeerConnection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      // local mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      for (const track of stream.getTracks()) pc.addTrack(track, stream);

      // data channel
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onmessage = (evt) => {
        const msg = safeJsonParse(evt.data);
        if (!msg || !msg.type) return;

        // USER transcript
        if (
          msg.type === "conversation.item.input_audio_transcription.completed" ||
          msg.type === "input_audio_transcription.completed"
        ) {
          addUserTranscriptToChat(msg.transcript);
          return;
        }

        // ASSISTANT transcript variants
        if (
          msg.type === "response.audio_transcript.done" ||
          msg.type === "response.audio_transcript.completed" ||
          msg.type === "response.output_audio_transcript.done"
        ) {
          addAssistantTranscriptToChat(msg.transcript);
          return;
        }

        // Some configs send assistant as output text
        if (msg.type === "response.output_text.done") {
          addAssistantTranscriptToChat(msg.text || msg.output_text || msg.transcript);
          return;
        }

        // If you ever need to debug:
        // console.log("Realtime event:", msg.type, msg);
      };

      dc.onopen = () => {
        // Ask-and-wait quiz behavior + request transcription
        const instructions = `
You are CanSTEM AI Tutor for course ${courseId}.
Be step-by-step and student-friendly.

IMPORTANT TUTOR FLOW:
- If student requests a quiz, ask ONE question at a time and WAIT for the student's answer.
- After the student answers, say if it's correct, explain briefly, then ask the next question.
- Do NOT reveal all answers at once unless the student asks explicitly.
`.trim();

        try {
          dc.send(
            JSON.stringify({
              type: "session.update",
              session: {
                instructions,
                voice: sess.voice || voiceName,
                input_audio_transcription: { model: "gpt-4o-mini-transcribe" },
                audio: { output: { voice: sess.voice || voiceName } },
              },
            })
          );
        } catch {}
      };

      // 3) Create offer SDP
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 4) ✅ IMPORTANT: exchange offer via YOUR backend (no CORS)
      const ex = await apiFetch("/api/realtime/offer", {
        method: "POST",
        body: JSON.stringify({
          model,
          offerSdp: offer.sdp,
        }),
      });

      if (!ex?.ok) throw new Error(ex?.error || "Realtime offer exchange failed");

      // 5) Set remote SDP
      await pc.setRemoteDescription({ type: "answer", sdp: ex.answerSdp });

      setVoiceStatus("connected");
      setMicMuted(false);
      showToast("Voice Assistant connected");
    } catch (e) {
      setVoiceStatus("error");
      setMessages((prev) => [...prev, { role: "assistant", text: `**Voice error:** ${e.message}` }]);
      showToast(e.message || "Voice error");
    }
  }

  async function stopRealtimeVoice() {
    setVoiceStatus("idle");

    const dc = dcRef.current;
    if (dc) {
      try {
        dc.close();
      } catch {}
    }
    dcRef.current = null;

    const pc = pcRef.current;
    if (pc) {
      try {
        pc.close();
      } catch {}
    }
    pcRef.current = null;

    const stream = localStreamRef.current;
    if (stream) for (const t of stream.getTracks()) t.stop();
    localStreamRef.current = null;

    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    lastUserTranscriptRef.current = "";
    lastAssistantTranscriptRef.current = "";
  }

  function micAction() {
    if (!hasSTT) return;
    if (isListening) stopListening();
    else startListening();
  }

  return (
    <RequireAuth allow={["student"]}>
      <Topbar title="Tutor" backHref="/student/dashboard" />

      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl p-4 sm:p-6">
          {toast && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {toast}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={newChat}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Plus size={16} /> New
              </button>

              <button
                type="button"
                onClick={regenerateLast}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
              >
                <RotateCcw size={16} /> Regenerate
              </button>

              <button
                type="button"
                onClick={copyLastAnswer}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Copy size={16} /> Copy answer
              </button>

              <button
                type="button"
                onClick={toggleVoiceMode}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border transition ${
                  voiceMode
                    ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                    : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {voiceMode ? <PhoneOff size={16} /> : <Phone size={16} />}
                {voiceMode ? "End Voice Assistant" : "Voice Assistant"}
              </button>

              {voiceMode && (
                <button
                  type="button"
                  onClick={() => setMicMuted(!voiceMuted)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  {voiceMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  {voiceMuted ? "Unmute" : "Mute"}
                </button>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700 select-none justify-end">
              <input
                type="checkbox"
                className="accent-slate-900"
                checked={autoRead}
                onChange={(e) => setAutoRead(e.target.checked)}
                disabled={!hasTTS || voiceMode}
              />
              Auto-read (browser)
            </label>
          </div>

          {voiceMode && (
            <div className="mb-3 text-xs text-slate-600">
              Voice: <b>{voiceName}</b> · Status:{" "}
              <b>
                {voiceStatus === "connecting"
                  ? "Connecting…"
                  : voiceStatus === "connected"
                    ? "Connected"
                    : voiceStatus === "error"
                      ? "Error"
                      : "Idle"}
              </b>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div ref={scrollerRef} className="p-4 sm:p-5 h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[88%]">
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          m.role === "user"
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        {m.role === "assistant" ? (
                          <MarkdownMessage text={m.text} />
                        ) : (
                          <div className="whitespace-pre-wrap">{m.text}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 p-3 sm:p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInput(s)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <span className="inline-flex items-center gap-1">
                        <Sparkles size={14} /> {s}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={micAction}
                    disabled={!hasSTT || voiceMode}
                    className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border transition ${
                      isListening
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50"
                    } ${(!hasSTT || voiceMode) ? "opacity-50 cursor-not-allowed" : ""}`}
                    aria-label="Microphone"
                    title={voiceMode ? "Disabled during voice mode" : "Speech-to-text typing"}
                  >
                    {isListening ? <Square size={18} /> : <Mic size={18} />}
                  </button>

                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={voiceMode ? "Voice Assistant active (you can still type)…" : "Type your question…"}
                    className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-slate-900/10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => sendMessage()}
                    disabled={busy}
                    className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-white font-semibold hover:bg-slate-800 transition disabled:opacity-60"
                  >
                    <Send size={16} />
                    {busy ? "..." : "Send"}
                  </button>
                </div>

                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>
                    Conversation: <b>{conversationId ? "Saved" : "New"}</b>
                  </span>
                  <span>
                    Course: <b>{courseId}</b>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <audio ref={remoteAudioRef} autoPlay playsInline />
        </div>
      </main>
    </RequireAuth>
  );
}