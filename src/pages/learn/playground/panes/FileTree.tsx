import type { VfsFile } from '../../code/codeApi';

interface FileTreeProps {
  files: VfsFile[];
  activePath: string;
  onSelect: (path: string) => void;
}

const FILE_EMOJI: Record<string, string> = {
  html: '📄',
  htm: '📄',
  css: '🎨',
  js: '⚙️',
  json: '🗂',
  md: '📝',
  txt: '📃',
  // images
  png: '🖼',
  jpg: '🖼',
  jpeg: '🖼',
  gif: '🖼',
  svg: '🖼',
  webp: '🖼',
  // audio
  mp3: '🔊',
  wav: '🔊',
  ogg: '🔊',
  m4a: '🔊',
};

function emojiFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return FILE_EMOJI[ext] ?? '📄';
}

export function FileTree({ files, activePath, onSelect }: FileTreeProps) {
  return (
    <div className="p-3">
      <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-sky">
        📁 Files
      </div>
      <ul className="space-y-0.5">
        {files.map((f) => {
          const isActive = f.path === activePath;
          return (
            <li key={f.path}>
              <button
                onClick={() => onSelect(f.path)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold transition-colors ${
                  isActive
                    ? 'bg-canvas-pure/15 text-canvas-pure'
                    : 'text-stone2 hover:bg-canvas-pure/5 hover:text-canvas-pure'
                }`}
              >
                <span>{emojiFor(f.path)}</span>
                <span className="truncate">{f.path}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
