import { useEffect, useRef, useState } from 'react';
import LiveCodes from 'livecodes/react';
import type { Playground } from 'livecodes/react';

import type { Message } from './WorkspacePage';

/**
 * Parse fenced code blocks (```html / ```css / ```js / ```javascript) out of a
 * markdown-flavored LLM reply. Returns the most recent fence per language —
 * the assistant may iterate, and we always show the latest.
 */
function extractCode(text: string): { html: string; css: string; js: string } {
  const out = { html: '', css: '', js: '' };
  const re = /```(\w+)?\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const lang = (m[1] ?? '').toLowerCase();
    const body = m[2] ?? '';
    if (lang === 'html' || lang === 'htm') out.html = body;
    else if (lang === 'css') out.css = body;
    else if (lang === 'js' || lang === 'javascript') out.js = body;
  }
  return out;
}

function pickLatestCode(messages: Message[]): { html: string; css: string; js: string } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'assistant' || !m.content) continue;
    const parts = extractCode(m.content);
    if (parts.html || parts.css || parts.js) return parts;
  }
  return null;
}

const STARTER = {
  html: '<h1 class="hello">Hello, Airbotix!</h1>\n<p>Ask the AI to build something.</p>',
  css: '.hello { font-family: system-ui; color: #ff5a73; font-size: 2.5rem; }',
  js: '',
};

export function CodePane({ messages }: { messages: Message[] }) {
  const sdkRef = useRef<Playground | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const lastAppliedRef = useRef<string>('');

  const latest = pickLatestCode(messages);
  const code = latest ?? STARTER;
  const signature = `${code.html}${code.css}${code.js}`;

  useEffect(() => {
    if (!sdkReady || !sdkRef.current) return;
    if (signature === lastAppliedRef.current) return;
    lastAppliedRef.current = signature;
    sdkRef.current
      .setConfig({
        markup: { language: 'html', content: code.html },
        style: { language: 'css', content: code.css },
        script: { language: 'javascript', content: code.js },
      })
      .catch(() => {
        /* swallow — kid doesn't need a stack trace */
      });
  }, [sdkReady, signature, code.html, code.css, code.js]);

  return (
    <aside className="hidden lg:flex flex-1 min-w-0 shrink flex-col bg-canvas-pure border-l border-hairline">
      <div className="px-5 py-4 border-b border-hairline">
        <div className="eyebrow">💻 Code Lab</div>
        <div className="text-[14px] font-bold text-ink mt-1">
          {latest ? 'Your code is running' : 'Try a prompt to start'}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <LiveCodes
          height="100%"
          config={{
            markup: { language: 'html', content: STARTER.html },
            style: { language: 'css', content: STARTER.css },
            script: { language: 'javascript', content: STARTER.js },
          }}
          sdkReady={(sdk) => {
            sdkRef.current = sdk;
            setSdkReady(true);
          }}
        />
      </div>
    </aside>
  );
}
