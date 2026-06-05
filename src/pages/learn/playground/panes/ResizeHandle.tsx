// Thin draggable divider between resizable panels. The hit area is wider than
// the visible 2px line for an easy grab target; it tints brand-sky on hover/drag.
import { PanelResizeHandle } from 'react-resizable-panels';

export function ResizeHandle() {
  return (
    <PanelResizeHandle className="group relative flex w-2 shrink-0 items-stretch justify-center bg-transparent outline-none">
      <span className="w-0.5 rounded bg-hairline transition-colors group-hover:bg-brand-sky group-data-[resize-handle-state=drag]:bg-brand-sky" />
    </PanelResizeHandle>
  );
}
