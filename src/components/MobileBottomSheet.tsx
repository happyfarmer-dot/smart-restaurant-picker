import React, { useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export type SheetStage = 'collapsed' | 'half' | 'full';

interface MobileBottomSheetProps {
  stage: SheetStage;
  onStageChange: (stage: SheetStage) => void;
  headerContent: React.ReactNode;
  children: React.ReactNode;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  stage,
  onStageChange,
  headerContent,
  children,
}) => {
  const startYRef = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const heightClass =
    stage === 'collapsed'
      ? 'h-[88px]'
      : stage === 'half'
      ? 'h-[50vh]'
      : 'h-[86vh]';

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const dy = e.touches[0].clientY - startYRef.current;
    setDragOffset(Math.max(-80, Math.min(80, dy)));
  };

  const handleTouchEnd = () => {
    if (startYRef.current === null) return;
    if (dragOffset < -35) {
      // 向上拖曳展開
      onStageChange(stage === 'collapsed' ? 'half' : 'full');
    } else if (dragOffset > 35) {
      // 向下拖曳收合
      onStageChange(stage === 'full' ? 'half' : 'collapsed');
    }
    startYRef.current = null;
    setDragOffset(0);
  };

  const cycleStage = () => {
    if (stage === 'collapsed') onStageChange('half');
    else if (stage === 'half') onStageChange('full');
    else onStageChange('collapsed');
  };

  return (
    <div
      className={`lg:hidden fixed inset-x-0 bottom-0 z-30 bg-slate-50 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-slate-200 flex flex-col transition-all duration-300 ${heightClass}`}
      style={{ transform: dragOffset ? `translateY(${dragOffset * 0.35}px)` : undefined }}
    >
      {/* Drag Handle & Header */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="shrink-0 px-4 pt-2.5 pb-2 bg-white rounded-t-3xl border-b border-slate-100 select-none"
      >
        <button
          type="button"
          onClick={cycleStage}
          className="w-full flex flex-col items-center gap-1 pb-1.5 cursor-pointer"
        >
          <span className="w-10 h-1.5 rounded-full bg-slate-300" />
        </button>
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">{headerContent}</div>
          <button
            type="button"
            onClick={cycleStage}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 cursor-pointer"
            title="切換面板高度"
          >
            {stage === 'full' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">{children}</div>
    </div>
  );
};
