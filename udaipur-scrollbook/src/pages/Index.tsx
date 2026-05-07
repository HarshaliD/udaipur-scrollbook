import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import kamanBg from "@/assets/kaman-bg.svg";
import cityPalaceImg from "@/assets/city-palace.svg";
import jagdishTempleImg from "@/assets/jagdish-temple.svg";
import monsoonPalaceImg from "@/assets/monsoon-palace.svg";
import monsoonPalaceWindowImg from "@/assets/monsoon-palace-window.svg";
import saheliyonImg from "@/assets/saheliyon-ki-bari.svg";
import fatehSagarImg from "@/assets/fateh-sagar.svg";
import lakePicholaImg from "@/assets/lake-pichola.svg";
import oldCityWalkImg from "@/assets/old-city-walk.svg";
import girlImg from "@/assets/girl.svg";
import boatImg from "@/assets/boat.svg";
import lotusImg from "@/assets/lotus.svg";
import PuppetDancer from "@/components/PuppetDancer";
import BookLoader from "@/components/BookLoader";
import PhotoStack from "@/components/PhotoStack";
import ItineraryPlanner, { MASTER_LOCATIONS } from "@/components/ItineraryPlanner";

// API + Auth helpers
import {
  loginWithGoogle,
  fetchAllPhotosGrouped,
  uploadToCloudinary,
  uploadPhoto as apiUploadPhoto,
  updateMe as apiUpdateMe,
  fetchMyTrips,
  createTrip as apiCreateTrip,
  joinTrip as apiJoinTrip,
  updateItinerary as apiUpdateItinerary,
  deleteTrip as apiDeleteTrip,
  testCloudinaryCredentials,
  ApiError,
  ApiTrip,
  ApiPhoto,
  IItineraryItem,
} from "@/lib/api";
import {
  saveAuth,
  saveUser,
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

// ─── Image map: slug → imported SVG ──────────────────────────────────────────
const LOCATION_IMAGES: Record<string, string> = {
  "city-palace": cityPalaceImg,
  "jagdish-temple": jagdishTempleImg,
  "monsoon-palace": monsoonPalaceImg,
  "saheliyon-ki-bari": saheliyonImg,
  "fateh-sagar": fatehSagarImg,
  "lake-pichola": lakePicholaImg,
  "old-city-walk": oldCityWalkImg,
};

// ─── Memory data per location ─────────────────────────────────────────────────
interface MemoryData {
  note: string;
  date: string;
  visited: boolean;
}

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
  MASTER_LOCATIONS.forEach((loc) => {
    initial[loc.placeSlug] = { note: "", date: "", visited: false };
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
  const [photos, setPhotos] = useState<Record<string, ApiPhoto[]>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [sparkleId, setSparkleId] = useState<string | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [boatSailingId, setBoatSailingId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(true);
  const handleLoadingComplete = useCallback(() => setLoading(false), []);
  const [user, setUser] = useState<StoredUser | null>(getUser);
  const [authLoading, setAuthLoading] = useState(false);

  // ── Trip state ─────────────────────────────────────────────────────────────
  const [trips, setTrips] = useState<ApiTrip[]>([]);
  const [activeTrip, setActiveTrip] = useState<ApiTrip | null>(null);

  // ── Trip modal state (create / join / itinerary) ───────────────────────────
  const [showTripModal, setShowTripModal] = useState(false);
  const [tripModalMode, setTripModalMode] = useState<"create" | "join" | "itinerary-new" | "itinerary-edit">("create");
  const [tripInput, setTripInput] = useState("");
  const [tripLoading, setTripLoading] = useState(false);
  const [pendingTripName, setPendingTripName] = useState(""); // used during create flow

  // ── Cloudinary setup modal ─────────────────────────────────────────────────
  const [showCloudinaryModal, setShowCloudinaryModal] = useState(false);
  const [cloudName, setCloudName] = useState("");
  const [cloudPreset, setCloudPreset] = useState("");
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudSuccess, setCloudSuccess] = useState(false);
  const [hintCloudName, setHintCloudName] = useState(false);
  const [hintCloudPreset, setHintCloudPreset] = useState(false);
  // When a user tries to upload without credentials, we store the pending upload
  const pendingUpload = useRef<{ id: string; files: FileList } | null>(null);

  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set());
  const [scrollProgress, setScrollProgress] = useState(0);

  // ── Derive active locations from trip itinerary ────────────────────────────
  const activeLocations: IItineraryItem[] = user && activeTrip?.itinerary
    ? [...activeTrip.itinerary].sort((a, b) => a.order - b.order)
    : !user
      ? MASTER_LOCATIONS.map((loc, i) => ({ ...loc, order: i + 1 }))
      : [];

  const allVisited = activeLocations.length > 0 && activeLocations.every(
    (loc) => memories[loc.placeSlug]?.visited
  );

  // ── Load trips on login, restore last active trip ─────────────────────────
  useEffect(() => {
    if (!user) { setTrips([]); setActiveTrip(null); setPhotos({}); return; }
    fetchMyTrips()
      .then((myTrips) => {
        setTrips(myTrips);
        let savedTripId = null;
        try {
          savedTripId = localStorage.getItem("activeTrip");
        } catch { /* ignore */ }
        const restored = myTrips.find((t) => t._id === savedTripId) ?? myTrips[0] ?? null;
        setActiveTrip(restored);

        // Check for pending join code
        const pendingCode = localStorage.getItem("pendingJoinCode");
        if (pendingCode) {
          localStorage.removeItem("pendingJoinCode");
          setTripInput(pendingCode);
          setTripModalMode("join");
          setShowTripModal(true);
          // Wait a tick for modal to open, then attempt join
          setTimeout(() => {
            const btn = document.getElementById("join-submit-btn");
            if (btn) btn.click();
          }, 100);
        }
      })
      .catch(() => { /* non-fatal */ });
  }, [user]);

  // ── Load photos whenever activeTrip changes ────────────────────────────────
  useEffect(() => {
    if (!activeTrip) { setPhotos({}); return; }
    localStorage.setItem("activeTrip", activeTrip._id);
    fetchAllPhotosGrouped(activeTrip._id)
      .then((grouped) => setPhotos(grouped))
      .catch((err: ApiError | Error) => {
        console.warn("Could not load photos:", err.message);
      });
  }, [activeTrip]);

  // ── Initialise Google Identity Services ───────────────────────────────────
  useEffect(() => {
    const init = () => {
      if (!window.google) return;
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
          auto_select: false,
        });
      } catch (err) {
        console.error("Failed to initialize Google Sign-In:", err);
        toast({ 
          title: "Sign-in unavailable", 
          description: "Google Sign-In could not be initialized. Please refresh the page.", 
          variant: "destructive" 
        });
      }
    };
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

  // ── Render Official Google UI Button ──────────────────────────────────────
  useEffect(() => {
    if (user) return;
    const interval = setInterval(() => {
      const container = document.getElementById("google-login-btn-container");
      if (container && window.google) {
        // Only render if empty to avoid flicker
        if (container.childElementCount === 0) {
          window.google.accounts.id.renderButton(container, {
            theme: "outline",
            size: "large",
            shape: "pill",
          });
        }
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [user]);

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
  }, [activeLocations]);

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
      const stored: StoredUser = {
        id: apiUser.id,
        name: apiUser.name,
        email: apiUser.email,
        avatar: apiUser.avatar,
        cloudinaryName: apiUser.cloudinaryName,
        cloudinaryPreset: apiUser.cloudinaryPreset,
      };
      saveAuth(token, stored);
      setUser(stored);
      toast({
        title: "Welcome, " + apiUser.name + "! 🎒",
        description: "Your memories await.",
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Login failed. Please try again.";
      toast({ title: "Login failed", description: msg, variant: "destructive" });
      console.error("Google login error:", err);
    } finally {
      setAuthLoading(false);
    }
  }

  // triggerGoogleLogin has been removed in favor of renderButton

  function handleLogout() {
    clearAuth();
    setUser(null);
    setPhotos({});
    setTrips([]);
    setActiveTrip(null);
    localStorage.removeItem("activeTrip");
    window.google?.accounts.id.cancel();
    toast({ title: "Logged out", description: "See you next time! 👋" });
  }

  // ── Cloudinary setup handler ───────────────────────────────────────────────
  async function handleSaveCloudinary() {
    if (!cloudName.trim() || !cloudPreset.trim()) return;
    setCloudSaving(true);
    try {
      // Test credentials before saving
      await testCloudinaryCredentials(cloudName.trim(), cloudPreset.trim());

      // If test passed, save to backend
      const updatedUser = await apiUpdateMe(cloudName.trim(), cloudPreset.trim());
      const stored: StoredUser = {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        cloudinaryName: updatedUser.cloudinaryName,
        cloudinaryPreset: updatedUser.cloudinaryPreset,
      };
      saveUser(stored);
      setUser(stored);
      toast({ title: "Cloudinary linked! ☁️", description: "You can now upload photos." });

      setCloudSuccess(true);
      setTimeout(() => {
        setCloudSuccess(false);
        setShowCloudinaryModal(false);
        // If user was trying to upload, resume it
        if (pendingUpload.current) {
          const { id, files } = pendingUpload.current;
          pendingUpload.current = null;
          handlePhotoUpload(id, files, stored);
        }
      }, 1500);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to save credentials.";
      toast({ title: "Error", description: "Could not connect to your Cloudinary. Please check your credentials. " + msg, variant: "destructive" });
    } finally {
      setCloudSaving(false);
    }
  }

  // ── Trip handlers ─────────────────────────────────────────────────────────
  async function handleCreateTripWithItinerary(itinerary: IItineraryItem[]) {
    setTripLoading(true);
    try {
      const trip = await apiCreateTrip(pendingTripName, itinerary);
      toast({ title: `Trip "${trip.name}" created! 🎒`, description: `Invite code: ${trip.inviteCode}` });
      setTrips((prev) => {
        const exists = prev.find((t) => t._id === trip._id);
        return exists ? prev : [trip, ...prev];
      });
      setActiveTrip(trip);
      setShowTripModal(false);
      setPendingTripName("");
      setTripInput("");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Something went wrong.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setTripLoading(false);
    }
  }

  async function handleJoinTrip() {
    let inputCode = tripInput.trim();
    if (!inputCode) return;
    
    // Extract code if user pasted a full link
    if (inputCode.includes("/join/")) {
      const parts = inputCode.split("/join/");
      inputCode = parts[parts.length - 1].split("/")[0].split("?")[0];
      setTripInput(inputCode);
    }

    setTripLoading(true);
    try {
      const trip = await apiJoinTrip(inputCode);
      toast({ title: `Joined "${trip.name}"! 🎉`, description: "Welcome to the group." });
      setTrips((prev) => {
        const exists = prev.find((t) => t._id === trip._id);
        return exists ? prev : [trip, ...prev];
      });
      setActiveTrip(trip);
      setShowTripModal(false);
      setTripInput("");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Something went wrong.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setTripLoading(false);
    }
  }

  async function handleSaveItinerary(itinerary: IItineraryItem[]) {
    if (!activeTrip) return;
    setTripLoading(true);
    try {
      const updated = await apiUpdateItinerary(activeTrip._id, itinerary);
      setActiveTrip(updated);
      setTrips((prev) => prev.map((t) => t._id === updated._id ? updated : t));
      toast({ title: "Itinerary saved! 🗺️", description: "Your journey map is updated." });
      setShowTripModal(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Something went wrong.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setTripLoading(false);
    }
  }

  async function handleDeleteTrip() {
    if (!activeTrip) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${activeTrip.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setTripLoading(true);
    try {
      await apiDeleteTrip(activeTrip._id);
      toast({ title: "Trip deleted 🗑️", description: "The trip has been removed." });
      setTrips((prev) => prev.filter((t) => t._id !== activeTrip._id));
      setActiveTrip(null);
      setPhotos({});
      localStorage.removeItem("activeTrip");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to delete trip.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setTripLoading(false);
    }
  }

  function handleCopyInviteLink() {
    if (!activeTrip) return;
    const fullUrl = `${window.location.origin}/join/${activeTrip.inviteCode}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      toast({ title: "Copied! 📋", description: "Share this link to invite friends." });
    }).catch(() => {
      toast({ title: "Could not copy", description: "Please try again.", variant: "destructive" });
    });
  }

  // ── Visited / memory handlers ─────────────────────────────────────────────
  const markVisited = useCallback(
    (id: string) => {
      setMemories((prev) => {
        const updated = { ...prev, [id]: { ...prev[id], visited: true } };
        const nowAllVisited = activeLocations.every((loc) => updated[loc.placeSlug]?.visited);
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
    [allVisited, activeLocations]
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
    async (id: string, files: FileList | null, overrideUser?: StoredUser) => {
      if (!files || files.length === 0) return;
      if (!activeTrip) {
        toast({ title: "No active trip", description: "Create or join a trip first.", variant: "destructive" });
        return;
      }

      const currentUser = overrideUser ?? user;

      // Guard: must have Cloudinary credentials
      if (!currentUser?.cloudinaryName || !currentUser?.cloudinaryPreset) {
        pendingUpload.current = { id, files };
        setCloudName(currentUser?.cloudinaryName ?? "");
        setCloudPreset(currentUser?.cloudinaryPreset ?? "");
        setShowCloudinaryModal(true);
        return;
      }

      const loc = MASTER_LOCATIONS.find((l) => l.placeSlug === id);
      if (!loc) return;

      setUploadingId(id);
      const successUrls: string[] = [];
      const errors: string[] = [];

      for (const file of Array.from(files)) {
        try {
          // Step 1: browser → user's Cloudinary
          const url = await uploadToCloudinary(file, currentUser.cloudinaryName, currentUser.cloudinaryPreset);
          // Step 2: backend saves the URL
          const photo = await apiUploadPhoto(url, loc.placeSlug, loc.placeName, activeTrip._id);
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
          description: "Your memories are safely stored.",
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
    [activeTrip, user, toast]
  );

  // ── Derived ───────────────────────────────────────────────────────────────
  const pathTotalLength = 1800;
  const pathDrawn = pathTotalLength * scrollProgress;
  const visitedCount = activeLocations.filter((loc) => memories[loc.placeSlug]?.visited).length;

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
        {loading && <BookLoader onComplete={handleLoadingComplete} />}
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
            <div className="mt-6 flex flex-col items-center">
              <div id="google-login-btn-container" className="h-10 min-w-[200px] flex justify-center"></div>
              {authLoading && (
                <span className="mt-3 text-sm text-muted-foreground font-handwritten" style={{ fontSize: "16px" }}>
                  ⏳ Authenticating...
                </span>
              )}
            </div>
          ) : (
            <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
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
                onClick={() => setShowCloudinaryModal(true)}
                className="px-4 py-1.5 text-sm rounded-full border border-warm-orange text-warm-orange hover:bg-warm-orange hover:text-white transition-colors duration-200 font-handwritten"
              >
                ☁️ Archive Settings
              </button>
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="px-4 py-1.5 text-sm rounded-full border border-muted-foreground text-muted-foreground hover:border-destructive hover:text-destructive transition-colors duration-200 font-handwritten"
              >
                Logout
              </button>
            </div>
          )}

          {/* Trip gate bar — only shown when logged in */}
          {user && (
            <div className="mt-5 flex flex-col items-center gap-2">
              {!activeTrip ? (
                <>
                  <p style={{ fontFamily: "'Caveat', cursive", fontSize: "17px", color: "#888" }}>
                    Create or Join a Trip to get started
                  </p>
                  <div className="flex gap-2">
                    <button
                      id="create-trip-btn"
                      onClick={() => { setTripModalMode("create"); setShowTripModal(true); }}
                      className="px-5 py-2 rounded-full border-2 border-warm-orange text-warm-orange font-handwritten text-base hover:bg-warm-orange hover:text-primary-foreground transition-colors duration-200"
                    >
                      ✈️ Create Trip
                    </button>
                    <button
                      id="join-trip-btn"
                      onClick={() => { setTripModalMode("join"); setShowTripModal(true); }}
                      className="px-5 py-2 rounded-full border-2 border-muted-foreground text-muted-foreground font-handwritten text-base hover:border-warm-orange hover:text-warm-orange transition-colors duration-200"
                    >
                      🔗 Join Trip
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <span className="px-4 py-1.5 rounded-full bg-accent text-accent-foreground font-handwritten text-base">
                    🎒 {activeTrip.name}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                    Code: {activeTrip.inviteCode}
                  </span>
                  <button
                    id="copy-invite-link-btn"
                    onClick={handleCopyInviteLink}
                    className="text-xs px-3 py-1 rounded-full border border-warm-orange text-warm-orange hover:bg-warm-orange hover:text-white transition-colors font-handwritten"
                    title="Copy invite link to clipboard"
                  >
                    📋 Copy Link
                  </button>
                  <button
                    id="edit-itinerary-btn"
                    onClick={() => { setTripModalMode("itinerary-edit"); setShowTripModal(true); }}
                    className="text-xs px-3 py-1 rounded-full border border-muted-foreground text-muted-foreground hover:border-warm-orange hover:text-warm-orange transition-colors font-handwritten"
                  >
                    🗺️ Edit Itinerary
                  </button>
                  {trips.length > 1 && (
                    <select
                      id="trip-switcher"
                      className="text-sm rounded-full border border-border px-3 py-1 bg-background font-handwritten"
                      value={activeTrip._id}
                      onChange={(e) => {
                        const t = trips.find((x) => x._id === e.target.value);
                        if (t) setActiveTrip(t);
                      }}
                    >
                      {trips.map((t) => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                  )}
                  <button
                    id="new-trip-btn"
                    onClick={() => { setTripModalMode("create"); setShowTripModal(true); }}
                    className="text-xs px-3 py-1 rounded-full border border-muted-foreground text-muted-foreground hover:border-warm-orange hover:text-warm-orange transition-colors font-handwritten"
                  >
                    + New Trip
                  </button>
                  <button
                    id="delete-trip-btn"
                    onClick={handleDeleteTrip}
                    disabled={tripLoading}
                    className="text-xs px-3 py-1 rounded-full border border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors font-handwritten disabled:opacity-50"
                    title="Delete this trip"
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Trip Modal ──────────────────────────────────────────────────── */}
          {showTripModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
              onClick={() => setShowTripModal(false)}
            >
              <div
                className="bg-background rounded-2xl p-8 shadow-2xl flex flex-col gap-4 w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* ── Step 1: Name a trip (create mode) ── */}
                {tripModalMode === "create" && (
                  <>
                    <h2 style={{ fontFamily: "'Caveat', cursive", fontSize: "28px", color: "#3a2a1a" }}>
                      ✈️ Create a New Trip
                    </h2>
                    <input
                      id="trip-input"
                      autoFocus
                      type="text"
                      value={tripInput}
                      onChange={(e) => setTripInput(e.target.value)}
                      maxLength={100}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && tripInput.trim()) {
                          setPendingTripName(tripInput.trim());
                          setTripModalMode("itinerary-new");
                        }
                      }}
                      placeholder="Trip name (e.g. Monsoon 2026)"
                      className="w-full border border-border rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-warm-orange"
                      style={{ fontFamily: "'Caveat', cursive", fontSize: "18px" }}
                    />
                    <div className="flex gap-2">
                      <button
                        id="trip-next-btn"
                        onClick={() => {
                          if (!tripInput.trim()) return;
                          setPendingTripName(tripInput.trim());
                          setTripModalMode("itinerary-new");
                        }}
                        disabled={!tripInput.trim()}
                        className="flex-1 py-2 rounded-full bg-warm-orange text-primary-foreground font-handwritten text-lg hover:opacity-90 transition disabled:opacity-50"
                      >
                        Next → Pick Places
                      </button>
                      <button
                        onClick={() => { setShowTripModal(false); setTripInput(""); }}
                        className="px-4 py-2 rounded-full border border-muted-foreground text-muted-foreground font-handwritten hover:border-destructive hover:text-destructive transition"
                      >
                        Cancel
                      </button>
                    </div>
                    <button
                      className="text-sm text-muted-foreground underline underline-offset-2 font-handwritten"
                      onClick={() => setTripModalMode("join")}
                    >
                      Have an invite code? Join a trip →
                    </button>
                  </>
                )}

                {/* ── Step 2: Itinerary planner for brand-new trip ── */}
                {tripModalMode === "itinerary-new" && (
                  <>
                    <div>
                      <h2 style={{ fontFamily: "'Caveat', cursive", fontSize: "26px", color: "#3a2a1a" }}>
                        🗺️ Plan Your Itinerary
                      </h2>
                      <p style={{ fontFamily: "'Caveat', cursive", fontSize: "15px", color: "#888" }}>
                        for <strong>{pendingTripName}</strong>
                      </p>
                    </div>
                    <ItineraryPlanner
                      initial={[]}
                      onSave={handleCreateTripWithItinerary}
                      onCancel={() => setTripModalMode("create")}
                      isSaving={tripLoading}
                    />
                  </>
                )}

                {/* ── Join a trip ── */}
                {tripModalMode === "join" && (
                  <>
                    <h2 style={{ fontFamily: "'Caveat', cursive", fontSize: "28px", color: "#3a2a1a" }}>
                      🔗 Join a Trip
                    </h2>
                    <input
                      id="join-input"
                      autoFocus
                      type="text"
                      value={tripInput}
                      onChange={(e) => setTripInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleJoinTrip()}
                      placeholder="Enter invite code"
                      className="w-full border border-border rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-warm-orange"
                      style={{ fontFamily: "'Caveat', cursive", fontSize: "18px" }}
                    />
                    <div className="flex gap-2">
                      <button
                        id="join-submit-btn"
                        onClick={handleJoinTrip}
                        disabled={tripLoading || !tripInput.trim()}
                        className="flex-1 py-2 rounded-full bg-warm-orange text-primary-foreground font-handwritten text-lg hover:opacity-90 transition disabled:opacity-50"
                      >
                        {tripLoading ? "⏳ Joining..." : "Join"}
                      </button>
                      <button
                        onClick={() => { setShowTripModal(false); setTripInput(""); }}
                        className="px-4 py-2 rounded-full border border-muted-foreground text-muted-foreground font-handwritten hover:border-destructive hover:text-destructive transition"
                      >
                        Cancel
                      </button>
                    </div>
                    <button
                      className="text-sm text-muted-foreground underline underline-offset-2 font-handwritten"
                      onClick={() => setTripModalMode("create")}
                    >
                      Don't have a code? Create a new trip →
                    </button>
                  </>
                )}

                {/* ── Edit existing itinerary ── */}
                {tripModalMode === "itinerary-edit" && activeTrip && (
                  <>
                    <div>
                      <h2 style={{ fontFamily: "'Caveat', cursive", fontSize: "26px", color: "#3a2a1a" }}>
                        🗺️ Edit Itinerary
                      </h2>
                      <p style={{ fontFamily: "'Caveat', cursive", fontSize: "15px", color: "#888" }}>
                        {activeTrip.name}
                      </p>
                    </div>
                    <ItineraryPlanner
                      initial={activeTrip.itinerary}
                      onSave={handleSaveItinerary}
                      onCancel={() => setShowTripModal(false)}
                      isSaving={tripLoading}
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Cloudinary Setup Modal ─────────────────────────────────────── */}
          {showCloudinaryModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => { setShowCloudinaryModal(false); pendingUpload.current = null; }}
            >
              <div
                className="bg-[#fcfaf5] rounded-3xl p-8 shadow-2xl flex flex-col gap-6 w-full max-w-md mx-4 relative overflow-hidden"
                style={{
                  backgroundImage: "radial-gradient(#e5e0d0 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                  boxShadow: "inset 0 0 40px rgba(0,0,0,0.05), 0 20px 40px rgba(0,0,0,0.2)",
                  border: "1px solid #e5e0d0"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {cloudSuccess ? (
                  <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in duration-300">
                    <div className="w-24 h-24 rounded-full bg-warm-orange flex items-center justify-center shadow-lg mb-4 text-white">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 style={{ fontFamily: "'Caveat', cursive", fontSize: "32px", color: "#3a2a1a" }}>
                      Your Archive is ready!
                    </h2>
                    <p style={{ fontFamily: "'Caveat', cursive", fontSize: "18px", color: "#888" }}>
                      Resuming your journey...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="text-center">
                      <h2 style={{ fontFamily: "'Yatra One', cursive", fontSize: "28px", color: "#3a2a1a" }}>
                        ☁️ Set Up Your Pocket Archive
                      </h2>
                      <p style={{ fontFamily: "'Caveat', cursive", fontSize: "18px", color: "#888", marginTop: 4 }}>
                        Store your memories in your own personal vault.
                      </p>
                    </div>

                    {/* Step guide — "Merchant's Guide" style */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3 bg-white/70 p-3 rounded-xl border border-warm-orange/20 shadow-sm relative overflow-hidden">
                        <div className="w-6 h-6 rounded-full bg-warm-orange text-white flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-sm z-10" style={{ fontFamily: "'Caveat', cursive" }}>1</div>
                        <div className="z-10">
                          <p style={{ fontFamily: "'Caveat', cursive", fontSize: "17px", color: "#3a2a1a", leading: "tight" }}>
                            Create a free account at Cloudinary
                          </p>
                          <a
                            href="https://cloudinary.com/console"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-warm-orange/10 text-warm-orange hover:bg-warm-orange hover:text-white transition-colors text-sm font-handwritten"
                          >
                            Open Dashboard ↗
                          </a>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-white/70 p-3 rounded-xl border border-warm-orange/20 shadow-sm">
                        <div className="w-6 h-6 rounded-full bg-warm-orange text-white flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-sm" style={{ fontFamily: "'Caveat', cursive" }}>2</div>
                        <p style={{ fontFamily: "'Caveat', cursive", fontSize: "17px", color: "#3a2a1a" }}>
                          Copy your <strong>Cloud Name</strong> from the top of your Dashboard homepage.
                        </p>
                      </div>

                      <div className="flex items-start gap-3 bg-white/70 p-3 rounded-xl border border-warm-orange/20 shadow-sm">
                        <div className="w-6 h-6 rounded-full bg-warm-orange text-white flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-sm" style={{ fontFamily: "'Caveat', cursive" }}>3</div>
                        <p style={{ fontFamily: "'Caveat', cursive", fontSize: "17px", color: "#3a2a1a", leading: "tight" }}>
                          Go to <strong>Settings → Upload → Upload Presets</strong>. Click "Add upload preset", set Signing Mode to <strong>Unsigned</strong>, save, and copy its name.
                        </p>
                      </div>
                    </div>

                    <hr className="border-border my-2" />

                    <div className="flex flex-col gap-4">
                      {/* Cloud Name Input */}
                      <div>
                        <label style={{ fontFamily: "'Caveat', cursive", fontSize: "16px", color: "#555", fontWeight: "bold" }} className="block mb-1">
                          Cloud Name
                        </label>
                        <input
                          id="cloudinary-name-input"
                          type="text"
                          value={cloudName}
                          onChange={(e) => setCloudName(e.target.value)}
                          placeholder="e.g. dxyz12345"
                          className="w-full border-2 border-border/80 bg-white/90 rounded-lg px-4 py-2 text-base focus:outline-none focus:border-warm-orange transition-colors"
                          style={{ fontFamily: "'Caveat', cursive", fontSize: "18px" }}
                        />
                        <div className="mt-1">
                          <button
                            onClick={() => setHintCloudName(!hintCloudName)}
                            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-warm-orange transition-colors"
                            style={{ fontFamily: "'Caveat', cursive", fontSize: "14px" }}
                          >
                            <span>{hintCloudName ? "▼" : "▶"}</span> How do I find this?
                          </button>
                          {hintCloudName && (
                            <p className="text-xs text-muted-foreground mt-1 ml-4 animate-in fade-in" style={{ fontFamily: "'Caveat', cursive", fontSize: "14px" }}>
                              This is shown prominently at the top of your Cloudinary dashboard homepage.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Upload Preset Input */}
                      <div>
                        <label style={{ fontFamily: "'Caveat', cursive", fontSize: "16px", color: "#555", fontWeight: "bold" }} className="block mb-1">
                          Upload Preset Name
                        </label>
                        <input
                          id="cloudinary-preset-input"
                          type="text"
                          value={cloudPreset}
                          onChange={(e) => setCloudPreset(e.target.value)}
                          placeholder="e.g. scrollbook_unsigned"
                          className="w-full border-2 border-border/80 bg-white/90 rounded-lg px-4 py-2 text-base focus:outline-none focus:border-warm-orange transition-colors"
                          style={{ fontFamily: "'Caveat', cursive", fontSize: "18px" }}
                        />
                        <div className="mt-1">
                          <button
                            onClick={() => setHintCloudPreset(!hintCloudPreset)}
                            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-warm-orange transition-colors"
                            style={{ fontFamily: "'Caveat', cursive", fontSize: "14px" }}
                          >
                            <span>{hintCloudPreset ? "▼" : "▶"}</span> How do I find this?
                          </button>
                          {hintCloudPreset && (
                            <p className="text-xs text-muted-foreground mt-1 ml-4 animate-in fade-in" style={{ fontFamily: "'Caveat', cursive", fontSize: "14px" }}>
                              Found in Settings ⚙️ → Upload → Upload Presets. Make sure it says "Unsigned".
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => { setShowCloudinaryModal(false); pendingUpload.current = null; }}
                        className="px-5 py-2.5 rounded-full border-2 border-border text-muted-foreground font-handwritten hover:border-destructive hover:text-destructive transition text-lg"
                      >
                        Cancel
                      </button>
                      <button
                        id="save-cloudinary-btn"
                        onClick={handleSaveCloudinary}
                        disabled={cloudSaving || !cloudName.trim() || !cloudPreset.trim()}
                        className="flex-1 py-2.5 rounded-full bg-warm-orange text-white font-handwritten text-xl hover:opacity-90 transition disabled:opacity-50 shadow-md"
                      >
                        {cloudSaving ? "⏳ Archiving..." : "Save & Continue →"}
                      </button>
                    </div>
                  </>
                )}
              </div>
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

          {/* Empty state — logged in but no trip / no itinerary */}
          {user && !activeTrip && (
            <div className="text-center py-20">
              <p style={{ fontFamily: "'Caveat', cursive", fontSize: "22px", color: "#888" }}>
                Create or join a trip above to begin your scroll ✈️
              </p>
            </div>
          )}

          {activeTrip && activeLocations.length === 0 && (
            <div className="text-center py-20">
              <p style={{ fontFamily: "'Caveat', cursive", fontSize: "22px", color: "#888" }}>
                Your itinerary is empty!
              </p>
              <button
                onClick={() => { setTripModalMode("itinerary-edit"); setShowTripModal(true); }}
                className="mt-4 px-6 py-2.5 rounded-full border-2 border-warm-orange text-warm-orange font-handwritten text-lg hover:bg-warm-orange hover:text-primary-foreground transition"
              >
                🗺️ Plan Your Itinerary
              </button>
            </div>
          )}

          {/* Location sections */}
          {activeLocations.map((loc, idx) => {
            const mem = memories[loc.placeSlug] || { note: "", date: "", visited: false };
            const isLeft = idx % 2 === 0;
            const locPhotos = photos[loc.placeSlug] || [];
            const isVisible = visibleSections.has(idx);
            const isUploading = uploadingId === loc.placeSlug;
            const locImage = LOCATION_IMAGES[loc.placeSlug];

            return (
              <div
                key={loc.placeSlug}
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
                      Stop {idx + 1}
                    </span>
                  </div>

                  {/* Illustration */}
                  <div className="relative mb-4 overflow-hidden">
                    <div
                      className={`illustration-wrapper ${mem.visited ? "visited" : ""} ${shakeId === loc.placeSlug ? "shake-animation" : ""} mx-auto md:mx-0`}
                      style={{
                        transform: `rotate(${isLeft ? -2 : 2}deg)`,
                        maxWidth: 340,
                        filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))",
                        transition: "filter 1.2s ease",
                      }}
                    >
                      {loc.placeSlug === "monsoon-palace" ? (
                        <div className="relative w-full">
                          <img src={monsoonPalaceImg} alt={loc.placeName} className="w-full h-auto block" style={{ opacity: mem.visited ? 0 : 1, transition: "opacity 0.8s ease" }} />
                          <img src={monsoonPalaceWindowImg} alt={`${loc.placeName} - Window View`} className="w-full h-auto absolute top-0 left-0" style={{ opacity: mem.visited ? 1 : 0, transition: "opacity 0.8s ease" }} />
                        </div>
                      ) : locImage ? (
                        <img src={locImage} alt={loc.placeName} className="w-full h-auto" />
                      ) : null}
                    </div>
                    <SparkleOverlay active={sparkleId === loc.placeSlug} />
                    {boatSailingId === loc.placeSlug && loc.placeSlug === "city-palace" && (
                      <img src={boatImg} alt="Boat" className="boat-sailing z-20" />
                    )}
                    {loc.placeSlug === "jagdish-temple" && mem.visited && (
                      <img src={lotusImg} alt="Lotus" className="lotus-animation" />
                    )}
                    {loc.placeSlug === "saheliyon-ki-bari" && mem.visited && (
                      <img src={girlImg} alt="Girl" className="girl-animation" />
                    )}
                  </div>

                  {/* Location name */}
                  <h2 className="font-handwritten text-3xl sm:text-4xl text-foreground mb-3">{loc.placeName}</h2>

                  {/* Mark as Visited */}
                  {!mem.visited ? (
                    <button
                      id={`mark-visited-${loc.placeSlug}`}
                      onClick={() => markVisited(loc.placeSlug)}
                      className="px-5 py-2 rounded-full border-2 border-warm-orange text-warm-orange font-handwritten text-lg hover:bg-warm-orange hover:text-primary-foreground transition-colors duration-300 mb-4"
                    >
                      📍 Mark as Visited
                    </button>
                  ) : (
                    <button
                      id={`unmark-visited-${loc.placeSlug}`}
                      onClick={() => setMemories((prev) => ({ ...prev, [loc.placeSlug]: { ...prev[loc.placeSlug], visited: false } }))}
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
                        id={`photo-upload-label-${loc.placeSlug}`}
                        className={`flex flex-col items-center justify-center gap-2 py-6 px-4 border-2 border-dashed border-border rounded-xl bg-white transition-colors duration-200 ${
                          !activeTrip
                            ? "opacity-40 cursor-not-allowed"
                            : isUploading
                            ? "opacity-60 cursor-wait border-warm-orange"
                            : "cursor-pointer hover:border-[#e8804a]"
                        }`}
                      >
                        <span className="text-3xl">{isUploading ? "⏳" : "📷"}</span>
                        <span style={{ fontFamily: "'Caveat', cursive", fontSize: "18px", color: "#888" }}>
                          {isUploading
                            ? "Uploading..."
                            : !activeTrip
                            ? "Join a trip to upload photos"
                            : "Drop your memories here"}
                        </span>
                        <input
                          type="file"
                          id={`photo-input-${loc.placeSlug}`}
                          accept="image/*"
                          multiple
                          disabled={isUploading || !activeTrip}
                          onChange={(e) => handlePhotoUpload(loc.placeSlug, e.target.files)}
                          className="hidden"
                        />
                      </label>
                      {locPhotos.length > 0 && (
                        <div className="mt-4">
                          <PhotoStack photos={locPhotos} locationName={loc.placeName} />
                        </div>
                      )}
                      {locPhotos.length === 0 && activeTrip && (
                        <div className="mt-4 py-6 px-4 text-center bg-muted/30 rounded-lg border border-border/50">
                          <p style={{ fontFamily: "'Caveat', cursive", fontSize: "16px", color: "#aaa" }}>
                            No photos yet — be the first to capture a memory! 📸
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Note */}
                    <div>
                      <label style={{ fontFamily: "'Caveat', cursive", fontStyle: "italic", fontSize: "14px", color: "#888" }} className="block mb-1">
                        ✏️ What happened here...
                      </label>
                      <textarea
                        id={`note-${loc.placeSlug}`}
                        value={mem.note}
                        onChange={(e) => updateNote(loc.placeSlug, e.target.value)}
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
                          id={`date-${loc.placeSlug}`}
                          value={mem.date}
                          onChange={(e) => updateDate(loc.placeSlug, e.target.value)}
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
          {activeLocations.length > 0 && (
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
                {visitedCount}/{activeLocations.length} locations visited
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
