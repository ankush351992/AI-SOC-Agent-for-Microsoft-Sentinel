import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles } from 'lucide-react';
import { triageApi } from '../services/api';

export default function AgentChat({ incident }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I'm your Sentinel AI Copilot for Incident #${incident?.incidentNumber || ''}. You can ask me to run custom KQL queries, inspect entity history, or draft containment actions.`
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isSending || !incident) return;

    const userMsg = { role: 'user', content: inputMessage };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const res = await triageApi.chat(incident.id, userMsg.content, messages);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.response || 'No response generated.' }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Error communicating with AI Copilot service.' }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const quickPrompts = [
    "Run 7-day sign-in KQL query for user",
    "Explain MITRE ATT&CK techniques",
    "What is the containment plan?",
  ];

  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-[760px] transition-colors duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">SOC Incident Copilot</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Contextual Sentinel Assistant</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
        {messages.map((m, idx) => {
          const isBot = m.role === 'assistant';
          return (
            <div
              key={idx}
              className={`flex items-start space-x-2.5 ${isBot ? '' : 'flex-row-reverse space-x-reverse'}`}
            >
              <div
                className={`p-1.5 rounded-lg shrink-0 ${
                  isBot
                    ? 'bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/30'
                    : 'bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-500/30'
                }`}
              >
                {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div
                className={`p-3 rounded-lg max-w-[85%] leading-relaxed ${
                  isBot
                    ? 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                    : 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          );
        })}
        {isSending && (
          <div className="flex items-center space-x-2 text-slate-500 text-xs italic">
            <Bot className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
            <span>Copilot is reasoning and querying telemetry...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800/80 flex items-center space-x-2 overflow-x-auto">
        <span className="text-[10px] text-slate-500 font-mono shrink-0 flex items-center">
          <Sparkles className="w-3 h-3 mr-1 text-amber-500" /> Quick:
        </span>
        {quickPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => {
              setInputMessage(p);
            }}
            className="text-[10px] bg-slate-200/80 dark:bg-slate-900 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 whitespace-nowrap transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center space-x-2">
        <input
          type="text"
          placeholder="Ask Copilot (e.g. Generate KQL hunting query...)"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          className="flex-1 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          type="submit"
          disabled={isSending || !inputMessage.trim()}
          className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg text-xs font-medium disabled:opacity-50 transition-all shadow-md shadow-blue-600/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
