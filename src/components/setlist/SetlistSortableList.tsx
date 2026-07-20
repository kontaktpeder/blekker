import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SetlistSortableSong = {
  itemId: string;
  songId: string;
  title: string;
  artist: string | null;
  bpm: number | null;
};

type Props = {
  items: SetlistSortableSong[];
  activeSongId: string | null;
  onSelect: (songId: string) => void;
  onReorder: (orderedItemIds: string[]) => void;
  onRemove: (itemId: string) => void;
};

function SortableRow({
  item,
  index,
  active,
  onSelect,
  onRemove,
}: {
  item: SetlistSortableSong;
  index: number;
  active: boolean;
  onSelect: (songId: string) => void;
  onRemove: (itemId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.itemId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-md border flex items-stretch gap-1 px-1 py-1.5 transition-colors touch-manipulation",
        active ? "bg-primary/10 border-primary/30" : "border-transparent hover:bg-accent",
        isDragging && "bg-card shadow-lg border-border z-10 opacity-95",
      )}
    >
      <button
        type="button"
        className="shrink-0 self-stretch px-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/80 cursor-grab active:cursor-grabbing touch-none min-w-11 inline-flex items-center justify-center [-webkit-tap-highlight-color:transparent]"
        aria-label="Dra for å endre rekkefølge"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => onSelect(item.songId)}
        className="flex-1 text-left min-w-0 min-h-12 py-1.5 pr-1"
      >
        <div className="flex gap-2">
          <span
            className={cn(
              "font-mono text-xs tabular-nums pt-0.5 w-5",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0">
            <span className={cn("block truncate text-sm font-medium", active && "text-primary")}>
              {item.title}
            </span>
            <span className="block truncate text-xs text-muted-foreground font-mono">
              {item.artist ?? "—"} · {item.bpm ?? "—"} BPM
            </span>
          </span>
        </div>
      </button>
      <button
        type="button"
        onClick={() => {
          if (confirm("Remove from setlist?")) onRemove(item.itemId);
        }}
        className="shrink-0 self-center p-2.5 min-h-11 min-w-11 text-muted-foreground hover:text-destructive"
        aria-label="Remove"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

export function SetlistSortableList({
  items,
  activeSongId,
  onSelect,
  onReorder,
  onRemove,
}: Props) {
  const ids = useMemo(() => items.map((i) => i.itemId), [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-3">No songs yet. Add one below.</p>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ol className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 overscroll-contain">
          {items.map((item, i) => (
            <SortableRow
              key={item.itemId}
              item={item}
              index={i}
              active={item.songId === activeSongId}
              onSelect={onSelect}
              onRemove={onRemove}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
