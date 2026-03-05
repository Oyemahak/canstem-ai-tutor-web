"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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

function buildMockAnswer(courseId, userText) {
  // simple mock for now (later replace with API + RAG)
  return `(${courseId}) I heard your question: "${userText}".\n\nThis is mock mode. Next step: connect backend + course materials so I answer strictly from CanSTEM content.\n\nTry asking: "Explain this concept simply" or "Give me 3 practice examples."`;
}

export default function TutorPage() {
  const params = useParams();
  const courseId = params?.courseId || "COURSE";

  const { hasSTT, hasTTS } = useMemo(isBrowserSpeechSupported, []);

  const [autoRead, setAutoRead] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `Welcome to ${courseId} Tutor. Tap the mic and ask your question.`,
    },
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

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

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
    if (!userText) return;

    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setInput("");
    setTranscript("");

    // mock response now
    const answer = buildMockAnswer(courseId, userText);

    setMessages((prev) => [...prev, { role: "assistant", text: answer }]);

    if (autoRead && hasTTS) {
      speak(answer);
    }
  };

  const micAction = () => {
    if (!hasSTT) return;
    if (isListening) stopListening();
    else startListening();
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              ← Dashboard
            </Link>
            <span className="text-xs font-semibold rounded-full bg-white border border-slate-200 text-slate-700 px-3 py-1">
              {courseId}
            </span>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
            <input
              type="checkbox"
              className="accent-slate-900"
              checked={autoRead}
              onChange={(e) => setAutoRead(e.target.checked)}
            />
            Auto-read answer
          </label>
        </header>

        {/* Compatibility note */}
        {(!hasSTT || !hasTTS) && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="font-semibold">Voice support notice</div>
            <div className="mt-1">
              Your browser may not fully support voice features. STT:{" "}
              <b>{hasSTT ? "Supported" : "Not supported"}</b> · TTS:{" "}
              <b>{hasTTS ? "Supported" : "Not supported"}</b>
            </div>
          </div>
        )}

        {/* Chat window */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-4 sm:p-5 h-[60vh] overflow-y-auto">
            <div className="space-y-3">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
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
              {/* Transcript preview */}
              {transcript && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    Live transcript
                  </div>
                  {transcript}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => sendMessage(transcript)}
                      className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm font-semibold hover:bg-slate-800"
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
                  title={hasSTT ? "Start/Stop microphone" : "Speech-to-text not supported"}
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
                  className="shrink-0 rounded-xl bg-slate-900 px-4 py-3 text-white font-semibold hover:bg-slate-800 transition"
                >
                  Send
                </button>
              </div>

              <div className="text-xs text-slate-500">
                Current mode: <b>Mock AI</b> · Voice: <b>{hasSTT ? "Mic OK" : "Mic N/A"}</b> ·
                Try asking short questions first.
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}