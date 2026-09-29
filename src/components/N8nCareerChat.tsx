import React, { useState, useRef, useEffect } from 'react';
import {
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import { CareerRoadmap } from '../types/roadmap';

export const N8N_WEBHOOK_CHAT_URL =
  'https://sahitya-2506.app.n8n.cloud/webhook/36fb15fa-9d05-40e7-a11f-aebe4cb4f71a/chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface N8nCareerChatProps {
  activeRoadmap: CareerRoadmap;
  weeklyHours: number;
  isOpen: boolean;
  onToggleOpen: (open: boolean) => void;
}

function generateSessionId() {
  return `meridian_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

export const N8nCareerChat: React.FC<N8nCareerChatProps> = ({
  activeRoadmap,
  weeklyHours,
  isOpen,
  onToggleOpen,
}) => {
  const [sessionId, setSessionId] = useState<string>(() => generateSessionId());
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Connected to your n8n Career Advisor workflow. Ask me anything about transitioning from ${activeRoadmap.currentRole} to ${activeRoadmap.targetRole}, capstone architecture, or interview preparation.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [includeRoadmapContext, setIncludeRoadmapContext] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async (rawText?: string) => {
    const textToSend = (rawText ?? inputValue).trim();
    if (!textToSend || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!rawText) {
      setInputValue('');
    }
    setIsSending(true);
    setErrorText(null);

    const metadata = includeRoadmapContext
      ? {
          currentRole: activeRoadmap.currentRole,
          targetRole: activeRoadmap.targetRole,
          industrySector: activeRoadmap.industrySector,
          weeklyHours,
          medianCompensationRange: activeRoadmap.marketOutlook.medianCompensationRange,
        }
      : {};

    try {
      let replyText = '';

      // Primary path: proxy through /api/n8n/chat to avoid browser CORS errors
      const proxyRes = await fetch('/api/n8n/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendMessage',
          sessionId,
          chatInput: textToSend,
          metadata,
        }),
      });

      if (proxyRes.ok) {
        const data = await proxyRes.json();
        replyText = data.output || 'Received empty response from n8n workflow.';
      } else {
        // Fallback: direct POST to the n8n webhook URL
        const directRes = await fetch(N8N_WEBHOOK_CHAT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sendMessage',
            sessionId,
            chatInput: textToSend,
            metadata,
          }),
        });

        if (!directRes.ok) {
          throw new Error(`Webhook responded with status ${directRes.status}`);
        }
        const directData = await directRes.json();
        const normalized = Array.isArray(directData) ? directData[0] : directData;
        replyText =
          normalized?.output ||
          normalized?.text ||
          normalized?.message ||
          JSON.stringify(normalized);
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to reach n8n chat webhook. Please verify the workflow is active.';
      setErrorText(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleResetSession = () => {
    const nextSession = generateSessionId();
    setSessionId(nextSession);
    setErrorText(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `New session initialized. How can I help you plan your ${activeRoadmap.targetRole} learning path?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const starterPrompts = [
    `What should I focus on first to transition into ${activeRoadmap.targetRole}?`,
    `Suggest interview preparation questions for Stage 01 of my roadmap.`,
    `How can I structure my capstone project for ${activeRoadmap.industrySector}?`,
  ];

  return (
    <>
      {/* Floating Bottom-Right Chat Launcher */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => onToggleOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2.5 px-4 py-3 text-xs font-semibold text-white bg-slate-900 border border-slate-700 rounded-xl shadow-lg hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Open n8n AI Career Advisor Chat"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <MessageSquare className="w-4 h-4 text-sky-400" />
          <span>AI Career Chat</span>
        </button>
      )}

      {/* Chat Drawer / Panel */}
      {isOpen && (
        <aside
          aria-label="n8n Career Advisor Chat"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[620px] h-[78vh] bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-2 border-b border-slate-800">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <h3 className="text-xs font-semibold tracking-wide truncate">
                  Meridian n8n Career Advisor
                </h3>
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                Active Track: {activeRoadmap.targetRole}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <a
                href={N8N_WEBHOOK_CHAT_URL}
                target="_blank"
                rel="noopener noreferrer"
                title="Open hosted n8n webhook chat in new tab"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={handleResetSession}
                title="Reset chat session"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToggleOpen(false)}
                aria-label="Close chat panel"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context Bar */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeRoadmapContext}
                onChange={(e) => setIncludeRoadmapContext(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-sky-600"
              />
              <span>Attach active roadmap context ({weeklyHours}h/wk)</span>
            </label>
            <span className="font-mono text-[10px] text-slate-400">n8n webhook</span>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[86%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-1 px-1">
                  {msg.role === 'user' ? 'You' : 'Advisor'} · {msg.timestamp}
                </span>
              </div>
            ))}

            {isSending && (
              <div className="flex items-start">
                <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 inline-flex items-center gap-2">
                  <RefreshCw className="w-3 h-3 animate-spin text-sky-600" />
                  <span>Awaiting n8n workflow response...</span>
                </div>
              </div>
            )}

            {errorText && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                <div className="font-semibold">▲ Connection Alert</div>
                <p className="mt-0.5">{errorText}</p>
              </div>
            )}

            {/* Quick Starter Prompts when only initial message is present */}
            {messages.length === 1 && !isSending && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[11px] font-medium text-slate-500">Suggested questions:</p>
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-sky-600 hover:text-slate-950 transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask your n8n Career Advisor..."
              aria-label="Chat message input"
              disabled={isSending}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-2 focus:outline-sky-600 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isSending || !inputValue.trim()}
              aria-label="Send message"
              className="px-3.5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </aside>
      )}
    </>
  );
};
