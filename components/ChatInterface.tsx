'use client';

const generateId = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};


import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { AGROBOT_SYSTEM_INSTRUCTION } from '@/lib/gemini';
import { useAuth } from '@/components/AuthProvider';
import { sendGAEvent } from '@next/third-parties/google';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  image?: string;
}

interface LocationProps {
  location?: { lat: number; lon: number; name: string } | null;
}

export default function ChatInterface({ location }: LocationProps) {
  const { user } = useAuth();
  const [sessionId] = useState(() => generateId());
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'bot',
      content: "Hello! I am your Agriculture Management System advisor. I can help you with expert agricultural guidance tailored to your specific location and climate. How can I help you with your crops today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedLang, setSelectedLang] = useState('en');

  const languages = [
    { code: 'en', name: 'English', welcome: "Hello! I am your Agriculture Management System advisor. I can help you with expert agricultural guidance tailored to your specific location and climate. How can I help you with your crops today?" },
    { code: 'fr', name: 'Français', welcome: "Bonjour ! Je suis votre conseiller du Système Adaptatif de Gestion Agricole. Je peux vous aider avec des conseils agricoles experts adaptés à votre emplacement et à votre climat. Comment puis-je vous aider avec vos cultures aujourd'hui ?" },
    { code: 'lg', name: 'Luganda', welcome: "Ki kati! Nze mubiwabuzibwa wo mu nteekateeka y'okuddukanya ebyobulimi ekyemala. Nyinza okukuyamba n'obubaka obukuguse obw'ebyo obulimi obukwatagana n'ekifo kyo n'obudde. Nnyinza okukuyamba ntya n'ebirime byo leero?" },
    { code: 'sw', name: 'Swahili', welcome: "Habari! Mimi ni mshauri wako wa Mfumo wa Kusimamia Kilimo Unaojirekebisha. Naweza kukusaidia kwa mwongozo wa kitaalamu wa kilimo uliowekwa kulingana na eneo lako na hali ya hewa. Naweza kukusaidia vipi na mazao yako leo?" },
    { code: 'rw', name: 'Kinyarwanda', welcome: "Muraho! Ndi umujyanama wanyu wa Sisitemu yo Gucunga Ubuhinzi Buhinduka. Nshobora kubafasha n’inama z’obuhinzi z’inzobere zihuye n’akarere kanyu n’ikirere. Nabafasha nte kubuhinzi bwanyu uyu munsi?" }
  ];

  const handleLangChange = (langCode: string) => {
    setSelectedLang(langCode);
    const lang = languages.find(l => l.code === langCode);
    if (lang && messages.length === 1 && messages[0].id === '1') {
      setMessages([{ ...messages[0], content: lang.welcome }]);
    }
  };

  const fetchHistory = async () => {
    if (user?.email) {
      try {
        const res = await fetch(`/api/chats?email=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          setHistorySessions(data.sessions || []);
        }
      } catch (error) {
        console.error("Failed to fetch chat history:", error);
      }
    }
  };

  const saveConversation = async () => {
    if (!user?.email || messages.length <= 1) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.slice(1), // Don't save the welcome message
          user_email: user.email,
          session_id: sessionId
        }),
      });
      if (res.ok) {
        alert("Conversation saved to history!");
      }
    } catch (error) {
      console.error("Save Error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const loadSession = async (sid: string) => {
    if (!user?.email) return;
    try {
      const res = await fetch(`/api/chats?email=${encodeURIComponent(user.email)}&session_id=${sid}`);
      if (res.ok) {
        const data = await res.json();
        setMessages([
          { id: '1', role: 'bot', content: "Viewing archived conversation:" },
          ...data.chats
        ]);
        setShowHistory(false);
      }
    } catch (error) {
      console.error("Load Error:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showHistory]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input,
      image: selectedImage || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    sendGAEvent({ event: 'chat_interaction', value: 'send_message' });

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      // Use correct SDK and Model
      // Use correct SDK and Model
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";

      let promptParts: any[] = [{ text: input || "Analyze this crop image and provide agricultural advice." }];

      if (userMessage.image) {
        const mimeType = userMessage.image.match(/data:(.*?);/)?.[1] || "image/jpeg";
        const base64Data = userMessage.image.split(',')[1];
        promptParts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        });
      }

      const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const locationContext = location
        ? `The user is currently located in or near: ${location.name} (Latitude: ${location.lat}, Longitude: ${location.lon}). Provide advice specific to this region's climate, soil, and typical agricultural practices.`
        : "The user's specific location is unknown, but provide best-practice global agricultural advice.";

      const preferredLanguage = languages.find(l => l.code === selectedLang)?.name || 'English';
      const dynamicSystemInstruction = `${AGROBOT_SYSTEM_INSTRUCTION}\n\nToday's date is: ${currentDate}.\n\nLOCATION CONTEXT:\n${locationContext}\n\nPREFFERED LANGUAGE: ${preferredLanguage}.\n\nAlways use this date and location context when answering questions about time, seasons, weather, or regional practices. Respond in the preferred language unless the user switch to another supported language.`;

      const responseStream = await ai.models.generateContentStream({
        model,
        contents: [{ parts: promptParts }],
        config: {
          systemInstruction: dynamicSystemInstruction,
        },
      });

      const botMessageId = generateId();
      setMessages((prev) => [
        ...prev,
        {
          id: botMessageId,
          role: 'bot',
          content: '',
        },
      ]);

      let fullText = '';
      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullText += chunk.text;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botMessageId ? { ...m, content: fullText } : m
            )
          );
        }
      }
    } catch (error: any) {
      console.error("Chat Error Detail:", error);
      const errorMessage = error.message || "Unknown error";
      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: 'bot', content: `Sorry, I encountered an error: ${errorMessage}. Please check your connection and try again.` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-emerald-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-black tracking-widest">
            AI
          </div>
          <div>
            <h2 className="font-semibold text-emerald-900">System Advisor</h2>
            <p className="text-xs text-emerald-700">Online • Expert AI Support</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedLang}
            onChange={(e) => handleLangChange(e.target.value)}
            className="px-2 py-1.5 bg-white text-emerald-700 rounded-lg text-[10px] font-black capitalize tracking-widest hover:bg-emerald-100 transition-colors cursor-pointer outline-none"
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
          {user && (
            <>
              <button
                onClick={() => {
                  setShowHistory(!showHistory);
                  if (!showHistory) fetchHistory();
                }}
                className="px-3 py-1.5 bg-white text-emerald-700 rounded-lg text-[10px] font-black capitalize tracking-widest hover:bg-emerald-100 transition-colors"
              >
                {showHistory ? 'Close History' : 'History'}
              </button>
              <button
                onClick={saveConversation}
                disabled={isSaving || messages.length <= 1}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black capitalize tracking-widest hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Chat'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Messages */}
        <div className={`h-full overflow-y-auto p-4 space-y-4 bg-gray-50/30 ${showHistory ? 'opacity-20 pointer-events-none' : ''}`}>
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${m.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : 'bg-white text-gray-800 rounded-tl-none shadow-sm'
                    }`}
                >
                  {m.image && (
                    <div className="relative w-full h-48 mb-2">
                      <Image
                        src={m.image}
                        alt="Uploaded"
                        fill
                        className="object-cover rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none prose-emerald">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* History Overlay */}
        <AnimatePresence mode="wait">
          {showHistory && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute inset-0 bg-white z-20 flex flex-col"
            >
              <div className="p-4 bg-gray-50 flex items-center justify-between">
                <h3 className="text-xs font-black capitalize tracking-widest text-emerald-900">Chat History</h3>
                <button
                  onClick={() => {
                    setMessages([{
                      id: '1',
                      role: 'bot',
                      content: "Hello! I am your Global Agriculture Management System advisor. I can help you with expert agricultural guidance tailored to your specific location and climate. How can I help you with your crops today?",
                    }]);
                    setShowHistory(false);
                    window.location.reload();
                  }}
                  className="text-[10px] font-black text-emerald-600 capitalize tracking-widest hover:underline"
                >
                  New Chat
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {historySessions.length === 0 ? (
                  <div className="text-center py-20 text-gray-400">
                    <p className="text-sm font-bold">No saved conversations found.</p>
                  </div>
                ) : (
                  historySessions.map((session: any) => (
                    <button
                      key={session.session_id}
                      onClick={() => loadSession(session.session_id)}
                      className="w-full text-left p-4 rounded-xl bg-gray-50/50 hover:bg-emerald-50 transition-colors group shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-black text-emerald-600 capitalize tracking-widest">
                          {new Date(session.started_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 font-medium line-clamp-2">
                        {session.first_message}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute bottom-24 left-4 z-10">
            <div className="bg-white p-3 rounded-2xl rounded-tl-none flex items-center gap-2 shadow-sm">
              <span className="text-xs text-emerald-600 animate-pulse font-black">---</span>
              <span className="text-xs text-gray-400">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white">
        {selectedImage && (
          <div className="mb-2 relative inline-block">
            <div className="relative w-20 h-20">
              <Image
                src={selectedImage}
                alt="Preview"
                fill
                className="object-cover rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md z-10"
            >
              <span className="text-[10px]">✕</span>
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 text-[10px] font-black text-gray-400 hover:text-emerald-600 transition-colors capitalize tracking-widest"
          >
            Upload
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <input
            type="text"
            value={input}
            autoComplete="off"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your crops..."
            className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && !selectedImage)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 transition-all font-bold text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
