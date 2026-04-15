import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import kamanBg from "@/assets/kaman-bg.svg";
import cityPalaceImg from "@/assets/city-palace.svg";
import jagdishTempleImg from "@/assets/jagdish-temple.svg";
import monsoonPalaceImg from "@/assets/monsoon-palace.svg";
import monsoonPalaceWindowImg from "@/assets/monsoon-palace-window.svg";
import saheliyonImg from "@/assets/saheliyon-ki-bari.svg";
import girlImg from "@/assets/girl.svg";
import boatImg from "@/assets/boat.svg";
import lotusImg from "@/assets/lotus.svg";
import PuppetDancer from "@/components/PuppetDancer";
import BookLoader from "@/components/BookLoader";
import PhotoStack from "@/components/PhotoStack";

// API + Auth helpers
import {
  loginWithGoogle,
  fetchAllPhotosGrouped,
  uploadPhoto as apiUploadPhoto,
  ApiError,
} from "@/lib/api";
import {
  saveAuth,
  getUser,
  getToken,
  clearAuth,
  StoredUser,
} from "@/lib/auth";

// Extend window for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string;
            callback: (r: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          prompt: () => void;
          cancel: () => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
        };
      };
    };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
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
  { id: "saheliyon-ki-bari", name: "Saheliyon Ki Bari", day: 2, image: saheliyonImg, defaultDate: "2025-03-02" },
];

// ─── Google Client ID ──────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = "173841781207-pj22hccbk4777a5dtas5nicg4dpa36s9.apps.googleusercontent.com";

// ─── Local-storage helpers ─────────────────────────────────────────────────────
const STORAGE_KEY = "udaipur-memories";

function loadMemories(): Record<string, MemoryData> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore parse errors */ }
  const initial: Record<string, MemoryData> = {};
  LOCATIONS.forEach((loc) => {
    initial[loc.id] = { note: "", date: loc.defaultDate, visited: false };
  });
  return initial;
}

function saveMemories(data: Record<string, MemoryData>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Index() {
  const { toast } = useToast();

  // ── State ──────────────────────────────────────────────────────────────────
  const [memories, setMemories] = useState<Record<string, MemoryData>>(loadMemories);
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [sparkleId, setSparkleId] = useState<string | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [boatSailingId, setBoatSailingId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(getUser);
  const [authLoading, setAuthLoading] = useState(false);

  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set());
  const [scrollProgress, setScrollProgress] = useState(0);

  const allVisited = LOCATIONS.every((loc) => memories[loc.id]?.visited);

  // ── Load persisted photos from backend on mount ────────────────────────────
  useEffect(() => {
    if (!getToken()) return; // not logged in — skip backend fetch
    fetchAllPhotosGrouped()
      .then((grouped) => {
        setPhotos((prev) => ({ ...prev, ...grouped }));
      })
      .catch((err: ApiError | Error) => {
        // Non-fatal: user still sees locally-uploaded photos
        console.warn("Could not load photos from server:", err.message);
      });
  }, [user]); // re-run when user logs in

  // ── Initialise Google Identity Services ───────────────────────────────────
  useEffect(() => {
    const init = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
      });
    };

    // GIS loads async — retry until available
    if (window.google) {
      init();
    } else {
      const interval = setInterval(() => {
        if (window.google) { init(); clearInterval(interval); }
      }, 200);
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save memories to localStorage whenever they change ────────────────────
  useEffect(() => { saveMemories(memories); }, [memories]);

  // ── Scroll-based section fade-in ─────────────────────────────────────────
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

  // ── Scroll progress ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? scrollTop / docHeight : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  async function handleGoogleCredential(response: { credential: string }) {
    setAuthLoading(true);
    try {
      const { token, user: apiUser } = await loginWithGoogle(response.credential);
      saveAuth(token, apiUser);
      setUser(apiUser);
      toast({
        title: "Welcome, " + apiUser.name + "! 🎒",
        description: "Your photos will now be saved to the cloud.",
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Login failed. Please try again.";
      toast({ title: "Login failed", description: msg, variant: "destructive" });
    } finally {
      setAuthLoading(false);
    }
  }

  function triggerGoogleLogin() {
    if (!window.google) {
      toast({
        title: "Google not ready",
        description: "Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }
    window.google.accounts.id.prompt();
  }

  function handleLogout() {
    clearAuth();
    setUser(null);
    setPhotos({});
    window.google?.accounts.id.cancel();
    toast({ title: "Logged out", description: "See you next time! 👋" });
  }

  // ── Visited / memory handlers ─────────────────────────────────────────────
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
      setShakeId(id);
      setTimeout(() => setShakeId(null), 800);
      window.dispatchEvent(new Event("puppet-spin"));
      if (id === "city-palace") {
        setBoatSailingId(id);
        setTimeout(() => setBoatSailingId(null), 4500);
      }
      setSparkleId(id);
      setTimeout(() => setSparkleId(null), 800);
    },
    [allVisited]
  );

  const updateNote = useCallback(
    (id: string, note: string) => setMemories((prev) => ({ ...prev, [id]: { ...prev[id], note } })),
    []
  );

  const updateDate = useCallback(
    (id: string, date: string) => setMemories((prev) => ({ ...prev, [id]: { ...prev[id], date } })),
    []
  );

  // ── Photo upload ──────────────────────────────────────────────────────────
  const handlePhotoUpload = useCallback(
    async (id: string, files: FileList | null) => {
      if (!files || files.length === 0) return;

      const loc = LOCATIONS.find((l) => l.id === id);
      if (!loc) return;

      if (!user) {
        // Offline mode: store as blob URL (not persisted across sessions)
        const urls = Array.from(files).map((f) => URL.createObjectURL(f));
        setPhotos((prev) => ({ ...prev, [id]: [...(prev[id] || []), ...urls] }));
        toast({
          title: "Photo added locally 📷",
          description: "Log in to save photos to the cloud permanently.",
        });
        return;
      }

      // Online mode: upload to backend (Cloudinary)
      setUploadingId(id);
      const successUrls: string[] = [];
      const errors: string[] = [];

      for (const file of Array.from(files)) {
        try {
          const photo = await apiUploadPhoto(file, loc.id, loc.name);
          successUrls.push(photo.cloudinaryUrl);
        } catch (err) {
          const msg = err instanceof ApiError ? err.message : "Unknown upload error";
          errors.push(`${file.name}: ${msg}`);
        }
      }

      setUploadingId(null);

      if (successUrls.length > 0) {
        setPhotos((prev) => ({ ...prev, [id]: [...(prev[id] || []), ...successUrls] }));
        toast({
          title: `${successUrls.length} photo${successUrls.length > 1 ? "s" : ""} saved! ✨`,
          description: "Your memories are safely stored in the cloud.",
        });
      }

      if (errors.length > 0) {
        toast({
          title: "Some uploads failed",
          description: errors.join("\n"),
          variant: "destructive",
        });
      }
    },
    [user, toast]
  );

  // ── Derived ───────────────────────────────────────────────────────────────
  const pathTotalLength = 1800;
  const pathDrawn = pathTotalLength * scrollProgress;
  const visitedCount = LOCATIONS.filter((loc) => memories[loc.id]?.visited).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ backgroundColor: "transparent" }}>
      {/* Kaman background */}
      <div
        className="fixed inset-0 w-full h-full pointer-events-none z-0 flex items-start justify-center"
        style={{
          opacity: 0.6 + scrollProgress * 0.4,
          filter: `brightness(${0.15 + scrollProgress * 0.85})`,
          transition: "filter 0.2s linear, opacity 0.2s linear",
        }}
      >
        <img src={kamanBg} alt="" className="w-full h-auto min-h-full object-contain" />
      </div>

      {/* Page content layer */}
      <div className="relative z-[1] min-h-screen bg-background/60 paper-texture">
        {loading && <BookLoader onComplete={() => setLoading(false)} />}
        {showConfetti && <Confetti />}
        <PuppetDancer />

        {/* Hero */}
        <header className="relative flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
          <div className="text-5xl mb-6">🎒</div>
          <h1
            style={{ fontFamily: "'Yatra One', cursive", fontSize: "clamp(64px, 10vw, 96px)", color: "#3a2a1a" }}
            className="leading-tight mb-2"
          >
            Udaipur
          </h1>
          <p style={{ fontFamily: "'Caveat', cursive", fontStyle: "italic", fontSize: "24px", color: "#e8804a", marginTop: "8px" }}>
            Padhaaro Mare Des
          </p>

          {/* Auth buttons */}
          {!user ? (
            <button
              id="google-login-btn"
              onClick={triggerGoogleLogin}
              disabled={authLoading}
              className="mt-6 inline-flex items-center gap-2 px-6 py-2 rounded-full border-2 border-warm-orange text-warm-orange font-handwritten text-lg hover:bg-warm-orange hover:text-primary-foreground transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {authLoading ? "⏳ Signing in..." : "🔑 Sign in with Google"}
            </button>
          ) : (
            <div className="mt-6 flex items-center gap-3">
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-9 h-9 rounded-full border-2 border-warm-orange"
                />
              )}
              <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-secondary text-secondary-foreground font-handwritten text-lg">
                ✓ {user.name}
              </span>
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="px-4 py-1.5 text-sm rounded-full border border-muted-foreground text-muted-foreground hover:border-destructive hover:text-destructive transition-colors duration-200 font-handwritten"
              >
                Logout
              </button>
            </div>
          )}

          <div className="mt-10 animate-bounce text-warm-orange text-2xl">↓</div>
        </header>

        {/* Journey content */}
        <div className="relative max-w-4xl mx-auto px-4 pb-32">
          {/* SVG Path */}
          <svg
            className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-8 pointer-events-none z-0 hidden md:block"
            preserveAspectRatio="none"
            viewBox={`0 0 32 ${pathTotalLength}`}
          >
            <line x1="16" y1="0" x2="16" y2={pathTotalLength} stroke="hsl(34, 30%, 82%)" strokeWidth="2" strokeDasharray="8 6" />
            <line
              x1="16" y1="0" x2="16" y2={pathTotalLength}
              stroke="hsl(20, 76%, 60%)"
              strokeWidth="3"
              strokeDasharray={pathTotalLength}
              strokeDashoffset={pathTotalLength - pathDrawn}
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
            <circle cx="16" cy={Math.min(pathDrawn, pathTotalLength)} r="6" fill="hsl(20, 76%, 60%)" style={{ transition: "cy 0.1s linear" }} />
          </svg>

          {/* Location sections */}
          {LOCATIONS.map((loc, idx) => {
            const mem = memories[loc.id] || { note: "", date: loc.defaultDate, visited: false };
            const isLeft = idx % 2 === 0;
            const locPhotos = photos[loc.id] || [];
            const isVisible = visibleSections.has(idx);
            const isUploading = uploadingId === loc.id;

            return (
              <div
                key={loc.id}
                ref={(el) => { sectionRefs.current[idx] = el; }}
                className={`fade-up ${isVisible ? "visible" : ""} relative mb-24 md:mb-32`}
              >
                {/* Node circle */}
                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-0 w-10 h-10 rounded-full border-2 border-warm-orange bg-background items-center justify-center z-10 font-handwritten text-lg text-warm-orange font-bold shadow">
                  {idx + 1}
                </div>

                {/* Content card */}
                <div className={`md:w-[45%] ${isLeft ? "md:mr-auto md:pr-8" : "md:ml-auto md:pl-8"} pt-4 md:pt-0`}>
                  {/* Day badge */}
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
                        filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))",
                        transition: "filter 1.2s ease",
                      }}
                    >
                      {loc.id === "monsoon-palace" ? (
                        <div className="relative w-full">
                          <img src={monsoonPalaceImg} alt={loc.name} className="w-full h-auto block" style={{ opacity: mem.visited ? 0 : 1, transition: "opacity 0.8s ease" }} />
                          <img src={monsoonPalaceWindowImg} alt={`${loc.name} - Window View`} className="w-full h-auto absolute top-0 left-0" style={{ opacity: mem.visited ? 1 : 0, transition: "opacity 0.8s ease" }} />
                        </div>
                      ) : (
                        <img src={loc.image} alt={loc.name} className="w-full h-auto" />
                      )}
                    </div>
                    <SparkleOverlay active={sparkleId === loc.id} />
                    {boatSailingId === loc.id && loc.id === "city-palace" && (
                      <img src={boatImg} alt="Boat" className="boat-sailing z-20" />
                    )}
                    {loc.id === "jagdish-temple" && mem.visited && (
                      <img src={lotusImg} alt="Lotus" className="lotus-animation" />
                    )}
                    {loc.id === "saheliyon-ki-bari" && mem.visited && (
                      <img src={girlImg} alt="Girl" className="girl-animation" />
                    )}
                  </div>

                  {/* Location name */}
                  <h2 className="font-handwritten text-3xl sm:text-4xl text-foreground mb-3">{loc.name}</h2>

                  {/* Mark as Visited */}
                  {!mem.visited ? (
                    <button
                      id={`mark-visited-${loc.id}`}
                      onClick={() => markVisited(loc.id)}
                      className="px-5 py-2 rounded-full border-2 border-warm-orange text-warm-orange font-handwritten text-lg hover:bg-warm-orange hover:text-primary-foreground transition-colors duration-300 mb-4"
                    >
                      📍 Mark as Visited
                    </button>
                  ) : (
                    <button
                      id={`unmark-visited-${loc.id}`}
                      onClick={() => setMemories((prev) => ({ ...prev, [loc.id]: { ...prev[loc.id], visited: false } }))}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-secondary text-secondary-foreground font-handwritten text-lg mb-4 hover:bg-destructive hover:text-destructive-foreground transition-colors duration-300 cursor-pointer"
                    >
                      ✓ Visited
                    </button>
                  )}

                  {/* Memory card */}
                  <div className="bg-background border border-border rounded-lg p-4 shadow-sm space-y-5">
                    {/* Photo upload */}
                    <div>
                      <label
                        id={`photo-upload-label-${loc.id}`}
                        className={`flex flex-col items-center justify-center gap-2 py-6 px-4 border-2 border-dashed border-border rounded-xl bg-white transition-colors duration-200 ${isUploading ? "opacity-60 cursor-wait border-warm-orange" : "cursor-pointer hover:border-[#e8804a]"}`}
                      >
                        <span className="text-3xl">{isUploading ? "⏳" : "📷"}</span>
                        <span style={{ fontFamily: "'Caveat', cursive", fontSize: "18px", color: "#888" }}>
                          {isUploading ? "Uploading..." : "Drop your memories here"}
                        </span>
                        <input
                          type="file"
                          id={`photo-input-${loc.id}`}
                          accept="image/*"
                          multiple
                          disabled={isUploading}
                          onChange={(e) => handlePhotoUpload(loc.id, e.target.files)}
                          className="hidden"
                        />
                      </label>
                      {!user && (
                        <p style={{ fontFamily: "'Caveat', cursive", fontSize: "13px", color: "#aaa" }} className="text-center mt-1">
                          Sign in to save photos permanently ☁️
                        </p>
                      )}
                      {locPhotos.length > 0 && (
                        <div className="mt-4">
                          <PhotoStack photos={locPhotos} locationName={loc.name} />
                        </div>
                      )}
                    </div>

                    {/* Note */}
                    <div>
                      <label style={{ fontFamily: "'Caveat', cursive", fontStyle: "italic", fontSize: "14px", color: "#888" }} className="block mb-1">
                        ✏️ What happened here...
                      </label>
                      <textarea
                        id={`note-${loc.id}`}
                        value={mem.note}
                        onChange={(e) => updateNote(loc.id, e.target.value)}
                        placeholder="What do you remember about this place..."
                        className="diary-textarea w-full min-h-[112px] rounded-lg px-4 py-3 resize-y focus:outline-none"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          fontSize: "18px",
                          color: "#3a2a1a",
                          background: `#fefce8 repeating-linear-gradient(to bottom, transparent, transparent 27px, #e5e0d0 27px, #e5e0d0 28px)`,
                          border: "none",
                          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.06)",
                          lineHeight: "28px",
                        }}
                      />
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: "'Caveat', cursive", fontStyle: "italic", fontSize: "14px", color: "#888" }}>
                        Visited on
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">📅</span>
                        <input
                          type="date"
                          id={`date-${loc.id}`}
                          value={mem.date}
                          onChange={(e) => updateDate(loc.id, e.target.value)}
                          className="bg-transparent focus:outline-none"
                          style={{
                            fontFamily: "'Caveat', cursive",
                            fontSize: "16px",
                            color: "#3a2a1a",
                            border: "none",
                            borderBottom: "1.5px solid #d4c9b0",
                            padding: "2px 4px",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Trip Completed Section */}
          <div className={`text-center mt-16 transition-opacity duration-700 ${allVisited ? "opacity-100" : "opacity-30"}`}>
            <h2 className="font-handwritten text-4xl sm:text-5xl text-foreground mb-4">
              Journey Complete ✨
            </h2>
            {allVisited && Object.values(photos).flat().length > 0 && (
              <div className="flex flex-wrap justify-center gap-4 mb-8 max-w-lg mx-auto">
                <PhotoStack photos={Object.values(photos).flat()} locationName="Udaipur Memories" />
              </div>
            )}
            <p className="font-serif italic text-lg text-muted-foreground max-w-md mx-auto">
              "Udaipur — a journey of lakes, palaces, and memories."
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              {visitedCount}/{LOCATIONS.length} locations visited
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
