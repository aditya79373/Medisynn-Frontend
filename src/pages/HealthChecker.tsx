// Updated ChatPage with Gemini API integration

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const resolveImageUrl = (img?: string | null) => {
  if (!img) return null;
  if (/^(https?:)?\/\//i.test(img) || img.startsWith("data:")) return img;
  const clean = img.replace(/^\/+/, "");
  return `${API}/${clean.startsWith("uploads/") ? clean : `uploads/${clean}`}`;
};
type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  content: string;
  status?: "complete" | "typing";
  isLoading?: boolean;
};



// ---------- ChatBubble ----------
const ChatBubble: React.FC<{ message: Message; userImage?: string | null }> = ({ message, userImage }) => {

  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex w-full items-start gap-3",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      {isAssistant && (
  <img
    src="/ai-avatar.png"
    alt="AI"
    className="h-12 w-12 rounded-full object-cover border"
  />
)}


      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3 shadow-sm ring-1 ring-white/10",
          isAssistant
            ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white mt-5"
            : "bg-secondary text-secondary-foreground"
        )}
      >
        {message.isLoading ? (
          <span className="animate-pulse">...</span>
        ) : (
          <ReactMarkdown>{message.content}</ReactMarkdown>
        )}
      </div>

{!isAssistant && (
  <img
    src={userImage || "/default-user.svg"}
    onError={(e) => {
      e.currentTarget.onerror = null;
      e.currentTarget.src = "/default-user.svg";
    }}
    alt="You"
    className="h-12 w-12 rounded-full object-cover border"
  />
)}

    </div>
  );
};

// ---------- ChatPage ----------
export default function ChatPage() {
  const [userImage, setUserImage] = useState<string | null>(null);
  // ---------- LOAD USER IMAGE FROM BACKEND & LISTEN FOR UPDATES ----------
useEffect(() => {
  const loadImage = () => {
    console.log("🔥 ChatPage: loadImage() called!");

    const email = localStorage.getItem("userEmail");
    if (!email) return;

    fetch(`${API}/api/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then((res) => res.json())
.then((data) => {
  console.log("PROFILE RESPONSE:", data);
  setUserImage(resolveImageUrl(data.profile_image));
})
      .catch((err) => console.log("Profile Fetch Error:", err));
  };

  loadImage();

  const listener = () => {
    console.log("🎉 ChatPage: RECEIVED EVENT — profile-image-updated");
    loadImage();
  };

  window.addEventListener("profile-image-updated", listener);

  return () => window.removeEventListener("profile-image-updated", listener);
}, []);




  const [messages, setMessages] = useState<Message[]>([{
    id: crypto.randomUUID(),
    role: "assistant",
    content: "",
    status: "typing",
    isLoading: true,
  }]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [currentTypingId, setCurrentTypingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typewriterInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ---------- Typewriter ----------
  const typewriterReveal = ({ fullText, messageId, speed = 14, onDone }: any) => {
    if (typewriterInterval.current) clearInterval(typewriterInterval.current);
    setCurrentTypingId(messageId);

    let index = 0;
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isLoading: true, content: "" } : m));

    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isLoading: false } : m));

      typewriterInterval.current = setInterval(() => {
        index++;
        if (index > fullText.length) index = fullText.length;

        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: fullText.slice(0, index) } : m));

        if (index >= fullText.length) {
          clearInterval(typewriterInterval.current!);
          typewriterInterval.current = null;
          setCurrentTypingId(null);
          onDone();
        }
      }, speed);
    }, 600);
  };

  const stopTyping = () => {
    if (typewriterInterval.current && currentTypingId) {
      clearInterval(typewriterInterval.current);
      setMessages(prev => prev.map(m => m.id === currentTypingId ? { ...m, status: "complete", isLoading: false } : m));
      typewriterInterval.current = null;
      setCurrentTypingId(null);
      setSending(false);
    }
  };

  // ---------- Initial Message ----------
  useEffect(() => {
    const initialText = "Hi! I’m your Medisynn AI assistant. Ask me anything about health, symptoms, or medicines!";
    const messageId = messages[0].id;
    typewriterReveal({ fullText: initialText, messageId, onDone: () => setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: "complete" } : m)) });
  }, []);

  // ---------- Gemini API call ----------
// ---------- Gemini API call (via backend) ----------
const callGemini = async (prompt: string) => {
  const res = await fetch(`${API}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error || "Gemini request failed");
  }

  return data.text || "Sorry, I couldn't generate a response.";
};
  // ---------- Send message ----------
  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      status: "complete",
    };

    const assistantMessageId = crypto.randomUUID();
    const placeholder: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      status: "typing",
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, placeholder]);
    setInput("");
    setSending(true);

    try {
      const fullText = await callGemini(userMessage.content);

      typewriterReveal({ fullText, messageId: assistantMessageId, onDone: () => setSending(false) });
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.map(m => m.id === assistantMessageId ? {
        ...m,
        content: "⚠️ Error connecting to Gemini API.",
        isLoading: false,
        status: "complete",
      } : m));
      setSending(false);
    }
  };

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);




  return (
    <main className="flex min-h-screen flex-col">
      <Navigation />

      <section className="flex-1 overflow-hidden px-4 pt-16 pb-4 md:pt-20 md:pb-6">
        <div ref={scrollRef} className="h-full overflow-y-auto rounded-lg border bg-card p-4 flex flex-col gap-4 justify-end">
         {messages.map(m => (
  <ChatBubble key={m.id} message={m} userImage={userImage} />
))}

        </div>
      </section>

      <footer className="sticky bottom-0 z-10 border-t bg-card/80 backdrop-blur px-4 py-3">
        <form onSubmit={sendMessage} className="mx-auto flex max-w-3xl items-end gap-2 w-full">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!sending && input.trim()) sendMessage();
              }
            }}
            className="flex-1 resize-none rounded-md border bg-background px-4 py-3"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!canSend}
              className={cn(
    "relative inline-flex items-center justify-center rounded-md bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-3",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  )}
            >
              {sending && (
                <span className="absolute left-3"></span>
              )}
              Send
            </button>

            {sending && (
              <button
                type="button"
                onClick={stopTyping}
                className="rounded-md bg-red-500 text-white px-4 py-3"
              >Stop</button>
            )}
          </div>
        </form>
      </footer>

      <Footer />
    </main>
  );
}
