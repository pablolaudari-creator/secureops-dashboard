import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, ChevronDown } from 'lucide-react';
import { useAgentChat, createConversation } from '../lib/agent-chat';
import { cn } from '../lib/utils';

interface AgentChatProps {
  agentId: string;
}

const AgentChat: React.FC<AgentChatProps> = ({ agentId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [starting, setStarting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { sendMessage, messages, isConnected } = useAgentChat(agentId, conversationId);

  useEffect(() => {
    if (isOpen && !conversationId && !starting) {
      setStarting(true);
      createConversation(agentId)
        .then(({ conversationId: id }) => setConversationId(id))
        .catch(console.error)
        .finally(() => setStarting(false));
    }
  }, [isOpen, agentId, conversationId, starting]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && isConnected) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isConnected]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !conversationId) return;
    setInput('');
    await sendMessage(text);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    'Estado del SGC hoy',
    'NC abiertas urgentes',
    'Rondas bajo 95%',
    'Estado CCTV por sede',
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300',
          'bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600',
          isOpen && 'rotate-90'
        )}
      >
        {isOpen
          ? <X size={22} className="text-white" />
          : <MessageCircle size={22} className="text-white" />
        }
        {!isOpen && messages.length === 0 && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0a0c11]" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-[#0d1117] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
          style={{ height: '520px' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 bg-gradient-to-r from-blue-600/10 to-indigo-700/10 shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Bot size={15} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Asesor SGC — SPI S.A.</p>
              <p className="text-[10px] text-white/40">
                {starting ? 'Conectando...' : isConnected ? '🟢 En línea — ISO 9001:2015' : '⏳ Iniciando...'}
              </p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/30 hover:text-white/60 transition-colors">
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && !starting && (
              <div className="space-y-3">
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={12} className="text-blue-400" />
                  </div>
                  <div className="bg-white/5 rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%]">
                    <p className="text-sm text-white/80 leading-relaxed">
                      ¡Buen día! Soy el Asesor SGC de SPI S.A. — ISO 9001:2015.
                      <br />
                      Tengo acceso a todos los módulos operativos. ¿En qué puedo ayudarte?
                    </p>
                  </div>
                </div>
                <div className="pl-8 flex flex-wrap gap-2">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      className="text-xs px-2.5 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {starting && (
              <div className="flex items-center justify-center gap-2 py-4 text-white/30 text-sm">
                <Loader2 size={16} className="animate-spin" />
                Iniciando asesor...
              </div>
            )}

            {messages.map(msg => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div key={msg.id} className={cn('flex gap-2.5', isAssistant ? 'justify-start' : 'justify-end')}>
                  {isAssistant && (
                    <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={12} className="text-blue-400" />
                    </div>
                  )}
                  <div className={cn(
                    'rounded-2xl px-3.5 py-2.5 max-w-[85%] text-sm leading-relaxed',
                    isAssistant
                      ? 'bg-white/5 text-white/80 rounded-tl-sm'
                      : 'bg-blue-600 text-white rounded-tr-sm'
                  )}>
                    {msg.content
                      ? msg.content
                      : isAssistant
                        ? (
                          <span className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                        )
                        : null
                    }
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/5 shrink-0">
            <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 px-3 py-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={isConnected ? 'Consultar al asesor SGC...' : 'Iniciando...'}
                disabled={!isConnected || !conversationId}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || !isConnected || !conversationId}
                className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 flex items-center justify-center transition-colors shrink-0"
              >
                <Send size={13} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AgentChat;
