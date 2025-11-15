/* app/components/SymptomTriage.tsx */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../LanguageProvider';

type Msg = { id: string; role: 'user' | 'assistant'; text: string };

function pickText(x: any): string {
  if (!x) return '';
  if (typeof x === 'string') return x;
  const cands = [
    x.result,
    x.response,
    x.text,
    x.content,
    x.message,
    x?.choices?.[0]?.message?.content,
    x?.data?.choices?.[0]?.message?.content,
  ].filter(Boolean);
  if (typeof cands[0] === 'string') return cands[0] as string;
  try { return JSON.stringify(x, null, 2); } catch { return ''; }
}

// Safe getter with fallback text
function F(dict: any, key: string, def: string) {
  const v = dict?.[key];
  return typeof v === 'string' && v.trim() ? v : def;
}

export default function SymptomTriage() {
  const { lang, t } = useLanguage();
  const ui = (t && (t.ui || t)) || {};

  // Build translated UI strings with safe fallbacks
  const tri = useMemo(() => {
    const prompt = F(ui, 'triagePrompt', 'Describe your symptom');
    const welcome = F(
      ui,
      'triageWelcome',
      'Hi, I’m an AI triage helper. Tell me your main symptom (e.g., “sharp chest pain when I breathe”). I may ask a few questions to help you decide what to do next. This is not medical advice—seek urgent care for emergencies.'
    );
    const placeholder = F(
      ui,
      'triagePH',
      'Describe your symptoms… (Enter to send, Shift+Enter for a new line)'
    );
    const start = F(ui, 'triageStart', 'Start Triage');
    const disclaimerTitle = F(t, 'disclaimerTitle', 'DISCLAIMER'); // root-level
    const disclaimer = F(
      ui,
      'triageDisclaimer',
      'This assistant is for informational purposes only and is not medical advice. If symptoms are severe, sudden, or worsening, seek emergency care immediately.'
    );
    const errorText = F(
      ui,
      'triageError',
      'I ran into a problem responding. Please try again, and seek urgent care if this is an emergency.'
    );
    return { prompt, welcome, placeholder, start, disclaimerTitle, disclaimer, errorText };
  }, [t, ui, lang]);

  // Chat state
  const [messages, setMessages] = useState<Msg[]>([
    { id: crypto.randomUUID(), role: 'assistant', text: '' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep first assistant bubble synced to the localized welcome
  useEffect(() => {
    setMessages((prev) => {
      if (!prev.length || prev[0].role !== 'assistant') {
        return [{ id: crypto.randomUUID(), role: 'assistant', text: tri.welcome }, ...prev];
      }
      if (prev[0].text !== tri.welcome) {
        const copy = prev.slice();
        copy[0] = { ...copy[0], text: tri.welcome };
        return copy;
      }
      return prev;
    });
  }, [tri.welcome]);

  // Auto-scroll on updates
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.concat(userMsg).map((m) => ({ role: m.role, content: m.text }));
      const res = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'triage', lang, query: text, history }),
      });
      const payload = await res.json();
      const reply = pickText(payload) || F(ui, 'noResult', 'No results.');
      const ai: Msg = { id: crypto.randomUUID(), role: 'assistant', text: reply };
      setMessages((prev) => [...prev, ai]);
    } catch {
      const err: Msg = { id: crypto.randomUUID(), role: 'assistant', text: tri.errorText };
      setMessages((prev) => [...prev, err]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '1.05rem' }}>
        {tri.prompt}
      </div>

      <div style={styles.card}>
        <div ref={listRef} style={styles.chat}>
          {messages.map((m) => (
            <ChatBubble key={m.id} role={m.role} text={m.text} />
          ))}
          {loading && (
            <div style={styles.row}>
              <div style={{ ...styles.bubbleAI, opacity: 0.9 }}>
                <span style={styles.typingDot}>●</span>
                <span style={styles.typingDot}>●</span>
                <span style={styles.typingDot}>●</span>
              </div>
            </div>
          )}
        </div>

        <div style={styles.inputRow}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={tri.placeholder}
            rows={2}
            style={styles.textarea}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              ...styles.sendBtn,
              opacity: loading || !input.trim() ? 0.6 : 1,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '…' : tri.start}
          </button>
        </div>

        <div style={styles.disclaimer}>
          <strong>{tri.disclaimerTitle}:</strong> {tri.disclaimer}
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ role, text }: { role: 'user' | 'assistant'; text: string }) {
  const isAI = role === 'assistant';
  return (
    <div style={styles.row}>
      <div style={isAI ? styles.bubbleAI : styles.bubbleUser}>{text}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 780, margin: '0 auto' },
  card: {
    background: 'transparent',
    border: 'transparent',
    borderRadius: 14,
    padding: 14,
    boxShadow: '0 6px 16px rgba(0,0,0,0.05)',
  },
  chat: {
    maxHeight: 520,
    overflowY: 'auto',
    padding: '6px 4px',
    scrollBehavior: 'smooth',
  },
  row: { display: 'flex', margin: '8px 0' },

  bubbleAI: {
    marginRight: 'auto',
    background: 'transparent',
    border: 'transparent',
    color: '#0b3b91',
    borderRadius: 12,
    padding: '10px 12px',
    fontSize: '1.02rem',
    lineHeight: 1.55,
    maxWidth: '85%',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
  bubbleUser: {
    marginLeft: 'auto',
    background: 'transparent',
    border: 'transparent',
    color: '#182711ff',
    borderRadius: 12,
    padding: '10px 12px',
    fontSize: '1.02rem',
    lineHeight: 1.55,
    maxWidth: '85%',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
  inputRow: { display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 10 },
  textarea: {
    flex: 1,
    borderRadius: 10,
    border: '1px solid #d1d5db',
    padding: '10px 12px',
    fontSize: '1rem',
    lineHeight: 1.5,
    resize: 'vertical',
    minHeight: 44,
    maxHeight: 220,
  },
  sendBtn: {
    border: 'none',
    borderRadius: 10,
    padding: '10px 14px',
    background: 'linear-gradient(135deg, #0b74de 0%, #69a6ff 100%)',
    color: '#fff',
    fontWeight: 700,
  },
  disclaimer: {
    marginTop: 10,
    fontSize: '.88rem',
    color: '#374151',
    opacity: 0.85,
  },
  typingDot: { display: 'inline-block', marginRight: 4, animation: 'pulseDots 1.2s infinite ease-in-out' },
};
