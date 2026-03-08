import { useState, useEffect, useRef, useCallback } from "react";

import cityPalaceImg from "@/assets/city-palace.svg";
import jagdishTempleImg from "@/assets/jagdish-temple.svg";
import monsoonPalaceImg from "@/assets/monsoon-palace.svg";
import fatehSagarImg from "@/assets/fateh-sagar.svg";
import oldCityWalkImg from "@/assets/old-city-walk.svg";
import boatImg from "@/assets/boat.svg";
import lotusImg from "@/assets/lotus.svg";
import PuppetDancer from "@/components/PuppetDancer";

interface LocationData {
  id: string;
  name: string;
  day: number;
  image: string;
  defaultDate: string;
}

interface MemoryData {
  note: string;
  date: string;
  visited: boolean;
}

const LOCATIONS: LocationData[] = [
  { id: "city-palace", name: "City Palace", day: 1, image: cityPalaceImg, defaultDate: "2025-03-01" },
  { id: "jagdish-temple", name: "Jagdish Temple", day: 1, image: jagdishTempleImg, defaultDate: "2025-03-01" },
  { id: "monsoon-palace", name: "Sajjangarh Monsoon Palace", day: 2, image: monsoonPalaceImg, defaultDate: "2025-03-02" },
  { id: "fateh-sagar", name: "Fateh Sagar Lake", day: 2, image: fatehSagarImg, defaultDate: "2025-03-02" },
  { id: "old-city-walk", name: "Old City Walk", day: 2, image: oldCityWalkImg, defaultDate: "2025-03-02" },
];

const STORAGE_KEY = "udaipur-memories";

function loadMemories(): Record<string, MemoryData> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  const initial: Record<string, MemoryData> = {};
  LOCATIONS.forEach((loc) => {
    initial[loc.id] = { note: "", date: loc.defaultDate, visited: false };
  });
  return initial;
}

function saveMemories(data: Record<string, MemoryData>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Sparkle component
function SparkleOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  const sparkles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * 360;
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * 60;
    const y = Math.sin(rad) * 60;
    return (
      <span
        key={i}
        className="sparkle absolute w-3 h-3 rounded-full"
        style={{
          background: `hsl(${34 + i * 20}, 80%, 60%)`,
          left: "50%",
          top: "50%",
          marginLeft: x,
          marginTop: y,
        }}
      />
    );
  });
  return <div className="absolute inset-0 pointer-events-none z-10">{sparkles}</div>;
}

// Confetti
function Confetti() {
  const pieces = Array.from({ length: 30 }, (_, i) => {
    const colors = ["#e8804a", "#7bbfe0", "#8aab8a", "#c8903a", "#d4896a"];
    return (
      <div
        key={i}
        className="confetti-piece rounded-sm"
        style={{
          left: `${Math.random() * 100}%`,
          background: colors[i % colors.length],
          animationDelay: `${Math.random() * 2}s`,
          animationDuration: `${2 + Math.random() * 2}s`,
        }}
      />
    );
  });
  return <div className="fixed inset-0 pointer-events-none z-50">{pieces}</div>;
}

// Polaroid
function PolaroidCard({ src, label, rotation }: { src: string; label: string; rotation: number }) {
  return (
    <div className="polaroid inline-block" style={{ transform: `rotate(${rotation}deg)` }}>
      <img src={src} alt={label} className="w-32 h-32 object-cover" />
      <p className="text-xs text-center mt-1 font-handwritten text-ink">{label}</p>
    </div>
  );
}

export default function Index() {
  const [memories, setMemories] = useState<Record<string, MemoryData>>(loadMemories);
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [sparkleId, setSparkleId] = useState<string | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [boatSailingId, setBoatSailingId] = useState<string | null>(null);
  const [lotusId, setLotusId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set());
  const [scrollProgress, setScrollProgress] = useState(0);

  const allVisited = LOCATIONS.every((loc) => memories[loc.id]?.visited);

  // Save to localStorage on change
  useEffect(() => {
    saveMemories(memories);
  }, [memories]);

  // Intersection observer for fade-up
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = sectionRefs.current.indexOf(entry.target as HTMLDivElement);
          if (idx !== -1 && entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, idx]));
          }
        });
      },
      { threshold: 0.15 }
    );
    sectionRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Scroll progress for path
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? scrollTop / docHeight : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const markVisited = useCallback(
    (id: string) => {
      setMemories((prev) => {
        const updated = { ...prev, [id]: { ...prev[id], visited: true } };
        const nowAllVisited = LOCATIONS.every((loc) => updated[loc.id]?.visited);
        if (nowAllVisited && !allVisited) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 4000);
        }
        return updated;
      });
      // Shake animation
      setShakeId(id);
      setTimeout(() => setShakeId(null), 800);
      // Boat sailing animation
      setBoatSailingId(id);
      setTimeout(() => setBoatSailingId(null), 4500);
      // Sparkle
      setSparkleId(id);
      setTimeout(() => setSparkleId(null), 800);
    },
    [allVisited]
  );

  const updateNote = useCallback((id: string, note: string) => {
    setMemories((prev) => ({ ...prev, [id]: { ...prev[id], note } }));
  }, []);

  const updateDate = useCallback((id: string, date: string) => {
    setMemories((prev) => ({ ...prev, [id]: { ...prev[id], date } }));
  }, []);

  const handlePhotoUpload = useCallback((id: string, files: FileList | null) => {
    if (!files) return;
    const urls = Array.from(files).map((f) => URL.createObjectURL(f));
    setPhotos((prev) => ({ ...prev, [id]: [...(prev[id] || []), ...urls] }));
  }, []);

  // Path total length
  const pathTotalLength = 1800;
  const pathDrawn = pathTotalLength * scrollProgress;

  // Count visited for path segments
  const visitedCount = LOCATIONS.filter((loc) => memories[loc.id]?.visited).length;

  return (
    <div className="min-h-screen bg-background paper-texture relative overflow-x-hidden">
      {showConfetti && <Confetti />}
      <PuppetDancer />

      {/* Hero */}
      <header className="relative flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <div className="text-5xl mb-6">🎒</div>
        <h1 className="font-handwritten text-5xl sm:text-7xl md:text-8xl text-foreground leading-tight mb-4">
          My Udaipur Memory Journey
        </h1>
        <p className="font-serif text-lg sm:text-xl text-muted-foreground italic max-w-md">
          A two-day trip through the City of Lakes
        </p>
        <div className="mt-10 animate-bounce text-warm-orange text-2xl">↓</div>
      </header>

      {/* Journey content */}
      <div className="relative max-w-4xl mx-auto px-4 pb-32">
        {/* SVG Path — center vertical line */}
        <svg
          className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-8 pointer-events-none z-0 hidden md:block"
          preserveAspectRatio="none"
          viewBox={`0 0 32 ${pathTotalLength}`}
        >
          {/* Background dashed path */}
          <line
            x1="16" y1="0" x2="16" y2={pathTotalLength}
            stroke="hsl(34, 30%, 82%)"
            strokeWidth="2"
            strokeDasharray="8 6"
          />
          {/* Drawn path */}
          <line
            x1="16" y1="0" x2="16" y2={pathTotalLength}
            stroke="hsl(20, 76%, 60%)"
            strokeWidth="3"
            strokeDasharray={pathTotalLength}
            strokeDashoffset={pathTotalLength - pathDrawn}
            style={{ transition: "stroke-dashoffset 0.1s linear" }}
          />
          {/* Traveler dot */}
          <circle
            cx="16"
            cy={Math.min(pathDrawn, pathTotalLength)}
            r="6"
            fill="hsl(20, 76%, 60%)"
            style={{ transition: "cy 0.1s linear" }}
          />
        </svg>

        {/* Location sections */}
        {LOCATIONS.map((loc, idx) => {
          const mem = memories[loc.id] || { note: "", date: loc.defaultDate, visited: false };
          const isLeft = idx % 2 === 0;
          const locPhotos = photos[loc.id] || [];
          const isVisible = visibleSections.has(idx);

          return (
            <div
              key={loc.id}
              ref={(el) => { sectionRefs.current[idx] = el; }}
              className={`fade-up ${isVisible ? "visible" : ""} relative mb-24 md:mb-32`}
            >
              {/* Node circle — centered on desktop */}
              <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-0 w-10 h-10 rounded-full border-2 border-warm-orange bg-background items-center justify-center z-10 font-handwritten text-lg text-warm-orange font-bold shadow">
                {idx + 1}
              </div>

              {/* Content card */}
              <div
                className={`md:w-[45%] ${isLeft ? "md:mr-auto md:pr-8" : "md:ml-auto md:pl-8"} pt-4 md:pt-0`}
              >
                {/* Day badge + Mobile number */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="md:hidden w-8 h-8 rounded-full border-2 border-warm-orange bg-background flex items-center justify-center font-handwritten text-warm-orange font-bold text-sm">
                    {idx + 1}
                  </span>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-accent text-accent-foreground">
                    Day {loc.day}
                  </span>
                </div>

                {/* Illustration */}
                <div className="relative mb-4 overflow-hidden">
                  <div
                    className={`illustration-wrapper ${mem.visited ? "visited" : ""} ${shakeId === loc.id ? "shake-animation" : ""} mx-auto md:mx-0`}
                    style={{
                      transform: `rotate(${isLeft ? -2 : 2}deg)`,
                      maxWidth: 340,
                      filter: loc.id === "city-palace"
                        ? "drop-shadow(0 4px 12px rgba(0,0,0,0.15))"
                        : mem.visited
                          ? "grayscale(0%) drop-shadow(0 4px 12px rgba(0,0,0,0.15))"
                          : "grayscale(100%) drop-shadow(0 2px 6px rgba(0,0,0,0.08))",
                      transition: "filter 1.2s ease",
                    }}
                  >
                    <img src={loc.image} alt={loc.name} className="w-full h-auto" />
                  </div>
                  <SparkleOverlay active={sparkleId === loc.id} />
                  {/* Boat animation */}
                  {boatSailingId === loc.id && (
                    <img
                      src={boatImg}
                      alt="Boat"
                      className="boat-sailing z-20"
                    />
                  )}
                </div>

                {/* Location name */}
                <h2 className="font-handwritten text-3xl sm:text-4xl text-foreground mb-3">
                  {loc.name}
                </h2>

                {/* Mark as Visited button */}
                {!mem.visited ? (
                  <button
                    onClick={() => markVisited(loc.id)}
                    className="px-5 py-2 rounded-full border-2 border-warm-orange text-warm-orange font-handwritten text-lg hover:bg-warm-orange hover:text-primary-foreground transition-colors duration-300 mb-4"
                  >
                    📍 Mark as Visited
                  </button>
                ) : (
                  <button
                    onClick={() => setMemories((prev) => ({ ...prev, [loc.id]: { ...prev[loc.id], visited: false } }))}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-secondary text-secondary-foreground font-handwritten text-lg mb-4 hover:bg-destructive hover:text-destructive-foreground transition-colors duration-300 cursor-pointer"
                  >
                    ✓ Visited
                  </button>
                )}

                {/* Memory card */}
                <div className="bg-background border border-border rounded-lg p-4 shadow-sm space-y-4">
                  {/* Photo upload */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      📸 Add photos
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handlePhotoUpload(loc.id, e.target.files)}
                      className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded-full file:border file:border-border file:text-sm file:font-medium file:bg-muted file:text-foreground hover:file:bg-accent cursor-pointer"
                    />
                    {locPhotos.length > 0 && (
                      <div className="flex flex-wrap gap-3 mt-3">
                        {locPhotos.map((src, pi) => (
                          <PolaroidCard
                            key={pi}
                            src={src}
                            label={loc.name}
                            rotation={Math.random() * 6 - 3}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      ✏️ Memory note
                    </label>
                    <textarea
                      value={mem.note}
                      onChange={(e) => updateNote(loc.id, e.target.value)}
                      placeholder="Write your memory here..."
                      className="notepad-textarea w-full min-h-[84px] border border-border rounded-md bg-background px-3 py-2 text-sm font-serif text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      📅 Date
                    </label>
                    <input
                      type="date"
                      value={mem.date}
                      onChange={(e) => updateDate(loc.id, e.target.value)}
                      className="border border-border rounded-md bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Trip Completed Section */}
        <div
          className={`text-center mt-16 transition-opacity duration-700 ${allVisited ? "opacity-100" : "opacity-30"}`}
        >
          <h2 className="font-handwritten text-4xl sm:text-5xl text-foreground mb-4">
            Journey Complete ✨
          </h2>

          {/* Photo collage */}
          {allVisited && Object.values(photos).flat().length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 mb-8 max-w-lg mx-auto">
              {Object.entries(photos).flatMap(([locId, urls]) =>
                urls.map((src, i) => (
                  <PolaroidCard
                    key={`${locId}-${i}`}
                    src={src}
                    label={LOCATIONS.find((l) => l.id === locId)?.name || ""}
                    rotation={Math.random() * 6 - 3}
                  />
                ))
              )}
            </div>
          )}

          <p className="font-serif italic text-lg text-muted-foreground max-w-md mx-auto">
            "Udaipur — a journey of lakes, palaces, and memories."
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            {visitedCount}/6 locations visited
          </p>
        </div>
      </div>
    </div>
  );
}
