import { useState } from "react";
import { IItineraryItem } from "@/lib/api";

// ─── Master catalogue of locations we have SVG art for ────────────────────────
export const MASTER_LOCATIONS: Omit<IItineraryItem, "order">[] = [
  { placeSlug: "city-palace",        placeName: "City Palace" },
  { placeSlug: "jagdish-temple",     placeName: "Jagdish Temple" },
  { placeSlug: "monsoon-palace",     placeName: "Sajjangarh Monsoon Palace" },
  { placeSlug: "saheliyon-ki-bari",  placeName: "Saheliyon Ki Bari" },
  { placeSlug: "fateh-sagar",        placeName: "Fateh Sagar Lake" },
  { placeSlug: "lake-pichola",       placeName: "Lake Pichola" },
  { placeSlug: "old-city-walk",      placeName: "Old City Walk" },
];

interface Props {
  /** Initial selection — pass [] for a brand new trip */
  initial: IItineraryItem[];
  onSave: (itinerary: IItineraryItem[]) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export default function ItineraryPlanner({ initial, onSave, onCancel, isSaving }: Props) {
  // selected holds the ordered list as slugs
  const [selected, setSelected] = useState<string[]>(
    initial.length > 0
      ? [...initial].sort((a, b) => a.order - b.order).map((i) => i.placeSlug)
      : []
  );
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const toggle = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  // ── Drag-to-reorder ──────────────────────────────────────────────────────
  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setSelected((prev) => {
      const next = [...prev];
      const [item] = next.splice(dragIdx, 1);
      next.splice(idx, 0, item);
      return next;
    });
    setDragIdx(idx);
  };

  const handleDragEnd = () => setDragIdx(null);

  // ── Move up / down ───────────────────────────────────────────────────────
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...selected];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setSelected(next);
  };

  const handleSave = () => {
    const itinerary: IItineraryItem[] = selected.map((slug, i) => {
      const loc = MASTER_LOCATIONS.find((l) => l.placeSlug === slug)!;
      return { placeSlug: slug, placeName: loc.placeName, order: i + 1 };
    });
    onSave(itinerary);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Selection grid ─────────────────────────────────────────────── */}
      <div>
        <p style={{ fontFamily: "'Caveat', cursive", fontSize: "15px", color: "#888" }} className="mb-3">
          Tap a place to add or remove it from your trip:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {MASTER_LOCATIONS.map((loc) => {
            const isOn = selected.includes(loc.placeSlug);
            return (
              <button
                key={loc.placeSlug}
                onClick={() => toggle(loc.placeSlug)}
                className={`px-3 py-2 rounded-xl text-left text-sm font-medium border-2 transition-all duration-200 ${
                  isOn
                    ? "border-warm-orange bg-warm-orange/10 text-warm-orange"
                    : "border-border bg-background text-muted-foreground hover:border-warm-orange/50"
                }`}
                style={{ fontFamily: "'Caveat', cursive", fontSize: "16px" }}
              >
                {isOn ? "✓ " : "＋ "}
                {loc.placeName}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Order list ─────────────────────────────────────────────────── */}
      {selected.length > 0 && (
        <div>
          <p style={{ fontFamily: "'Caveat', cursive", fontSize: "15px", color: "#888" }} className="mb-2">
            Drag to reorder your journey:
          </p>
          <ol className="flex flex-col gap-2">
            {selected.map((slug, idx) => {
              const loc = MASTER_LOCATIONS.find((l) => l.placeSlug === slug)!;
              return (
                <li
                  key={slug}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 border-border bg-background cursor-grab select-none transition-all ${
                    dragIdx === idx ? "opacity-50 scale-95 border-warm-orange" : "hover:border-warm-orange/40"
                  }`}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{
                      background: "hsl(20, 76%, 60%)",
                      color: "white",
                      fontFamily: "'Caveat', cursive",
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className="flex-1"
                    style={{ fontFamily: "'Caveat', cursive", fontSize: "17px", color: "#3a2a1a" }}
                  >
                    {loc.placeName}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                      className="text-xs text-muted-foreground disabled:opacity-20 hover:text-warm-orange leading-none"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => move(idx, 1)}
                      disabled={idx === selected.length - 1}
                      className="text-xs text-muted-foreground disabled:opacity-20 hover:text-warm-orange leading-none"
                    >
                      ▼
                    </button>
                  </div>
                  <button
                    onClick={() => toggle(slug)}
                    className="text-muted-foreground hover:text-destructive text-sm ml-1 transition-colors"
                    title="Remove"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {selected.length === 0 && (
        <p
          className="text-center py-4"
          style={{ fontFamily: "'Caveat', cursive", fontSize: "16px", color: "#aaa" }}
        >
          Select at least one place to start your journey ✈️
        </p>
      )}

      {/* ── Actions ────────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving || selected.length === 0}
          className="flex-1 py-2.5 rounded-full bg-warm-orange text-primary-foreground font-handwritten text-lg hover:opacity-90 transition disabled:opacity-50"
        >
          {isSaving ? "⏳ Saving..." : "✈️ Set Itinerary"}
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-2 rounded-full border border-muted-foreground text-muted-foreground font-handwritten hover:border-destructive hover:text-destructive transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
