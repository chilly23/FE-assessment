"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Settings, Command, Copy, RotateCw, Edit2, Send, Menu, X } from 'lucide-react';

// Mock data & utils
const genId = () => Math.random().toString(36).slice(2);

const mockStream = async (text: string, onChunk: (chunk: string) => void) => {
  const words = text.split(' ');
  for (let i = 0; i < words.length; i++) {
    await new Promise(r => setTimeout(r, 50 + Math.random() * 50));
    onChunk(words[i] + ' ');
  }
};

const mockResponses = [
  "Here's a comprehensive analysis of your question. The key aspects to consider include performance optimization, user experience, and scalability. Let me break this down into several important points that will help you understand the full picture.",
  "That's an interesting question. Based on current best practices, I'd recommend focusing on component architecture first. Clean separation of concerns will make your codebase more maintainable and easier to scale as your application grows.",
  "Let me explain this concept step by step. First, we need to understand the fundamentals. Then we can explore more advanced techniques that professional developers use in production environments.",
];

const getMockResp = () => mockResponses[Math.floor(Math.random() * mockResponses.length)];

const mockNames = Array.from({ length: 1000000 }, (_, i) => `User${i + 1}`);

// Storage utils
const saveToLocal = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {}
};

const getFromLocal = (key: string) => {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : null;
  } catch (e) {
    return null;
  }
};

type Msg = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  artifact?: { type: string; code: string };
};

type Chat = {
  id: string;
  title: string;
  msgs: Msg[];
  created: number;
};

export default function App() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCmd, setShowCmd] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [searchRes, setSearchRes] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selIdx, setSelIdx] = useState(0);
  const [stickyQ, setStickyQ] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeChat = chats.find(c => c.id === activeId);

  useEffect(() => {
    const saved = getFromLocal('chats');
    const savedActive = getFromLocal('activeId');
    if (saved && saved.length > 0) {
      setChats(saved);
      setActiveId(savedActive || saved[0].id);
    } else {
      const newChat = { id: genId(), title: 'New Chat', msgs: [], created: Date.now() };
      setChats([newChat]);
      setActiveId(newChat.id);
    }

    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCmd(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    saveToLocal('chats', chats);
    saveToLocal('activeId', activeId);
  }, [chats, activeId]);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current || !activeChat) return;
      const msgs = activeChat.msgs;
      if (msgs.length === 0) {
        setStickyQ('');
        return;
      }
      
      const scroll = scrollRef.current.scrollTop;
      if (scroll > 100) {
        const lastUserMsg = [...msgs].reverse().find(m => m.role === 'user');
        setStickyQ(lastUserMsg?.content || '');
      } else {
        setStickyQ('');
      }
    };

    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [activeChat]);

  useEffect(() => {
    if (input.includes('@')) {
      const atIdx = input.lastIndexOf('@');
      const q = input.slice(atIdx + 1);
      if (q.length > 0) {
        const filtered = mockNames.filter(n => n.toLowerCase().includes(q.toLowerCase())).slice(0, 5);
        setSearchRes(filtered);
        setShowSearch(true);
        setSelIdx(0);
      } else {
        setShowSearch(false);
      }
    } else {
      setShowSearch(false);
    }
  }, [input]);

  const newChat = () => {
    const c = { id: genId(), title: 'New Chat', msgs: [], created: Date.now() };
    setChats([c, ...chats]);
    setActiveId(c.id);
    setShowCmd(false);
  };

  const clearHist = () => {
    setChats([]);
    const c = { id: genId(), title: 'New Chat', msgs: [], created: Date.now() };
    setChats([c]);
    setActiveId(c.id);
    setShowCmd(false);
  };

  const sendMsg = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg: Msg = { id: genId(), role: 'user', content: input };
    const assistantMsg: Msg = { id: genId(), role: 'assistant', content: '' };

    const updatedChat = {
      ...activeChat!,
      title: activeChat!.msgs.length === 0 ? input.slice(0, 50) : activeChat!.title,
      msgs: [...activeChat!.msgs, userMsg, assistantMsg],
    };

    setChats(chats.map(c => c.id === activeId ? updatedChat : c));
    setInput('');
    setLoading(true);

    const shouldArtifact = Math.random() > 0.7;
    const resp = shouldArtifact 
      ? "Here's a code example:\n```javascript\nconst hello = () => console.log('Hello World');\n```" 
      : getMockResp();

    await mockStream(resp, (chunk) => {
      setChats(prev => prev.map(c => {
        if (c.id !== activeId) return c;
        const msgs = [...c.msgs];
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.role === 'assistant') {
          lastMsg.content += chunk;
        }
        return { ...c, msgs };
      }));
    });

    if (shouldArtifact) {
      setChats(prev => prev.map(c => {
        if (c.id !== activeId) return c;
        const msgs = [...c.msgs];
        const lastMsg = msgs[msgs.length - 1];
        lastMsg.artifact = { type: 'code', code: "const hello = () => console.log('Hello World');" };
        return { ...c, msgs };
      }));
    }

    setLoading(false);
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const copyMsg = (txt: string) => {
    navigator.clipboard.writeText(txt);
  };

  const regenMsg = () => {
    if (!activeChat || activeChat.msgs.length < 2) return;
    const msgs = activeChat.msgs.slice(0, -1);
    setChats(chats.map(c => c.id === activeId ? { ...c, msgs } : c));
    setTimeout(sendMsg, 100);
  };

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (!showSearch) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelIdx(prev => (prev + 1) % searchRes.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelIdx(prev => (prev - 1 + searchRes.length) % searchRes.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const atIdx = input.lastIndexOf('@');
      setInput(input.slice(0, atIdx) + '@' + searchRes[selIdx] + ' ');
      setShowSearch(false);
    } else if (e.key === 'Escape') {
      setShowSearch(false);
    }
  };

  const highlightMatch = (text: string, q: string) => {
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-bold">{text.slice(idx, idx + q.length)}</span>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div className="flex h-screen bg-white text-black">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-64' : 'w-0'} border-r border-black transition-all overflow-hidden`}>
        <div className="p-4 border-b border-black flex items-center justify-between">
          <h1 className="text-lg font-semibold">Chats</h1>
          <button onClick={newChat} className="p-1 hover:bg-gray-100">
            <Plus size={20} />
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-64px)]">
          {chats.map(c => (
            <div
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`p-3 cursor-pointer border-b border-gray-200 hover:bg-gray-50 ${activeId === c.id ? 'bg-gray-100' : ''}`}
            >
              <p className="text-sm truncate">{c.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-black flex items-center px-4 gap-3">
          <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 hover:bg-gray-100">
            <Menu size={20} />
          </button>
          <h2 className="text-lg font-semibold flex-1">{activeChat?.title || 'Chat'}</h2>
        </div>

        {/* Sticky Question */}
        {stickyQ && (
          <div className="sticky top-0 bg-white border-b border-gray-300 px-4 py-2 z-10">
            <p className="text-sm font-medium truncate">{stickyQ}</p>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {activeChat?.msgs.length === 0 && (
            <div className="h-full flex items-center justify-center text-gray-400">
              <p>Start a conversation</p>
            </div>
          )}
          {activeChat?.msgs.map((m, i) => (
            <div key={m.id} className="mb-6">
              <div className="font-semibold mb-2">{m.role === 'user' ? 'You' : 'Assistant'}</div>
              <div className="whitespace-pre-wrap">{m.content}</div>
              {m.artifact && (
                <div className="mt-3 border border-black p-3 bg-gray-50">
                  <pre className="text-sm overflow-x-auto">{m.artifact.code}</pre>
                </div>
              )}
              {m.role === 'assistant' && i === activeChat.msgs.length - 1 && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => copyMsg(m.content)} className="p-1 hover:bg-gray-100 border border-black">
                    <Copy size={16} />
                  </button>
                  <button onClick={regenMsg} className="p-1 hover:bg-gray-100 border border-black">
                    <RotateCw size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="mb-6">
              <div className="font-semibold mb-2">Assistant</div>
              <div className="flex items-center gap-2">
                <div className="animate-pulse">Thinking...</div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-black p-4 relative">
          {showSearch && (
            <div className="absolute bottom-full mb-2 left-4 right-4 bg-white border border-black max-h-48 overflow-y-auto">
              {searchRes.map((r, i) => (
                <div
                  key={r}
                  className={`p-2 cursor-pointer ${i === selIdx ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                  onClick={() => {
                    const atIdx = input.lastIndexOf('@');
                    setInput(input.slice(0, atIdx) + '@' + r + ' ');
                    setShowSearch(false);
                  }}
                >
                  {highlightMatch(r, input.slice(input.lastIndexOf('@') + 1))}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                handleSearchKey(e);
                if (e.key === 'Enter' && !showSearch) sendMsg();
              }}
              placeholder="Type a message... (use @ to mention)"
              className="flex-1 border border-black px-3 py-2 focus:outline-none"
            />
            <button onClick={sendMsg} disabled={loading} className="px-4 py-2 bg-black text-white hover:bg-gray-800 disabled:opacity-50">
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Command Menu */}
      {showCmd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-32 z-50" onClick={() => setShowCmd(false)}>
          <div className="bg-white border-2 border-black w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-black flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Command size={20} />
                <span className="font-semibold">Commands</span>
              </div>
              <button onClick={() => setShowCmd(false)}>
                <X size={20} />
              </button>
            </div>
            <div>
              <button onClick={newChat} className="w-full p-3 text-left hover:bg-gray-100 border-b border-gray-200">
                New Chat
              </button>
              <button onClick={clearHist} className="w-full p-3 text-left hover:bg-gray-100 border-b border-gray-200">
                Clear History
              </button>
              <button onClick={() => setShowCmd(false)} className="w-full p-3 text-left hover:bg-gray-100">
                Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}