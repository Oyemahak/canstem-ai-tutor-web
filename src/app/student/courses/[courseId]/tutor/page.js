"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import RequireAuth from "@/components/auth/RequireAuth";
import Topbar from "@/components/layout/Topbar";
import { apiFetch } from "@/lib/api";

function isBrowserSpeechSupported() {
  const hasSTT =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  const hasTTS = typeof window !== "undefined" && "speechSynthesis" in window;
  return { hasSTT: !!hasSTT, hasTTS: !!hasTTS };
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1;
  u.pitch = 1;
  window.speechSynthesis.speak(u);
}

export default function TutorPage() {
  const params = useParams();
  const courseId = params?.courseId || "COURSE";

  const { hasSTT, hasTTS } = useMemo(isBrowserSpeechSupported, []);

  const [autoRead, setAutoRead] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([
    { role: "assistant", text: `Welcome to ${courseId} Tutor. Tap the mic and ask your question.` },
  ]);

  const recognitionRef = useRef(null);

  const startListening = () => {
    if (!hasSTT) return;

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
      setTranscript(full.trim());
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    setTranscript("");
    setIsListening(true);
    recognition.start();
  };

  const stopListening = () => {
    const r = recognitionRef.current;
    if (r) {
      r.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const sendMessage = async (text) => {
    const userText = (text ?? input).trim();
    if (!userText || busy) return;

    setBusy(true);
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setInput("");
    setTranscript("");

    try {
      const r = await apiFetch("/api/tutor/chat", {
        method: "POST",
        body: JSON.stringify({
          courseId,
          conversationId,
          message: userText,
        }),
      });

      if (!conversationId && r.conversationId) setConversationId(r.conversationId);

      setMessages((prev) => [...prev, { role: "assistant", text: r.answer }]);

      if (autoRead && hasTTS) speak(r.answer);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Error: ${e.message}` },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const micAction = () => {
    if (!hasSTT) return;
    if (isListening) stopListening();
    else startListening();
  };

  return (
    <RequireAuth allow={["student"]}>
      <Topbar title={`${courseId} Tutor`} backHref="/student/dashboard" />
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl p-4 sm:p-6">
          {/* Auto read toggle */}
          <div className="flex items-center justify-end mb-3">
            <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
              <input
                type="checkbox"
                className="accent-slate-900"
                checked={autoRead}
                onChange={(e) => setAutoRead(e.target.checked)}
              />
              Auto-read answer
            </label>
          </div>

          {/* Compatibility note */}
          {(!hasSTT || !hasTTS) && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-semibold">Voice support notice</div>
              <div className="mt-1">
                STT: <b>{hasSTT ? "Supported" : "Not supported"}</b> · TTS:{" "}
                <b>{hasTTS ? "Supported" : "Not supported"}</b>
              </div>
            </div>
          )}

          {/* Chat window */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-4 sm:p-5 h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-900"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Voice + input bar */}
            <div className="border-t border-slate-200 p-3 sm:p-4">
              <div className="flex flex-col gap-3">
                {transcript && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                    <div className="text-xs font-semibold text-slate-500 mb-1">Live transcript</div>
                    {transcript}
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => sendMessage(transcript)}
                        disabled={busy}
                        className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
                      >
                        Send transcript
                      </button>
                      <button
                        onClick={() => setTranscript("")}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={micAction}
                    disabled={!hasSTT}
                    className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold border transition ${
                      isListening
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50"
                    } ${!hasSTT ? "opacity-50 cursor-not-allowed" : ""}`}
                    aria-label="Microphone"
                  >
                    {isListening ? "■" : "🎙️"}
                  </button>

                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your question (or use the mic)…"
                    className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-slate-900/10"
                  />

                  <button
                    onClick={() => sendMessage()}
                    disabled={busy}
                    className="shrink-0 rounded-xl bg-slate-900 px-4 py-3 text-white font-semibold hover:bg-slate-800 transition disabled:opacity-60"
                  >
                    {busy ? "..." : "Send"}
                  </button>
                </div>

                <div className="text-xs text-slate-500">
                  Conversation: <b>{conversationId ? "Saved" : "New"}</b>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            For now, AI answers are mock until you add OpenAI key to backend. History is already stored in DB.
          </div>
        </div>
      </main>
    </RequireAuth>
  );
}