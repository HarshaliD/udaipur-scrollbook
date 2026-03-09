import { useState, useEffect } from "react";
import udaipurSvg from "@/assets/udaipur.svg";

interface BookLoaderProps {
  onComplete: () => void;
}

export default function BookLoader({ onComplete }: BookLoaderProps) {
  const [phase, setPhase] = useState<"closed" | "opening" | "open" | "fading" | "done">("closed");

  useEffect(() => {
    // closed 0.5s → opening 2s → open 1s → fading 0.6s → done
    const t1 = setTimeout(() => setPhase("opening"), 500);
    const t2 = setTimeout(() => setPhase("open"), 2500);
    const t3 = setTimeout(() => setPhase("fading"), 3500);
    const t4 = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 4100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  if (phase === "done") return null;

  const isOpening = phase === "opening" || phase === "open" || phase === "fading";
  const isFading = phase === "fading";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
      style={{
        opacity: isFading ? 0 : 1,
        transition: "opacity 0.6s ease-out",
        perspective: "1200px",
      }}
    >
      <div className="relative" style={{ width: 540, height: 667 }}>
        {/* Left page */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "50%",
            height: "100%",
            overflow: "hidden",
            transformOrigin: "right center",
            transform: isOpening ? "rotateY(0deg)" : "rotateY(-90deg)",
            transition: "transform 2s ease-in-out",
            backfaceVisibility: "hidden",
          }}
        >
          <img
            src={udaipurSvg}
            alt=""
            style={{ width: 540, height: 667, maxWidth: "none" }}
          />
        </div>
        {/* Right page */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "50%",
            height: "100%",
            overflow: "hidden",
            transformOrigin: "left center",
            transform: isOpening ? "rotateY(0deg)" : "rotateY(90deg)",
            transition: "transform 2s ease-in-out",
            backfaceVisibility: "hidden",
          }}
        >
          <img
            src={udaipurSvg}
            alt=""
            style={{
              width: 540,
              height: 667,
              maxWidth: "none",
              marginLeft: "-100%",
            }}
          />
        </div>
      </div>
    </div>
  );
}
