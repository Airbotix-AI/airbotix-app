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
      <div className="eyebrow eyebrow-sky mb-2">📁 Files</div>
      <ul className="space-y-0.5">
        {files.map((f) => {
          const isActive = f.path === activePath;
          return (
            <li key={f.path}>
              <button
                onClick={() => onSelect(f.path)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold transition-colors ${
                  isActive ? 'bg-wash-sky text-ink' : 'text-ink-soft hover:bg-surface'
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
