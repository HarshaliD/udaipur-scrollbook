import { useState, useEffect, useRef, useCallback } from "react";
import puppet1 from "@/assets/puppet1.svg";
import puppet2 from "@/assets/puppet2.svg";
import puppet3 from "@/assets/puppet3.svg";

const frames = [puppet1, puppet2, puppet3];

export default function PuppetDancer() {
  const [frameIndex, setFrameIndex] = useState(0);
  const [jiggleTransform, setJiggleTransform] = useState("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jiggleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const randomTransform = () => {
      const rotate = (Math.random() - 0.5) * 20;
      const scale = 0.9 + Math.random() * 0.3;
      const bounceY = (Math.random() - 0.5) * 16;
      const bounceX = (Math.random() - 0.5) * 10;
      setJiggleTransform(`rotate(${rotate}deg) scale(${scale}) translate(${bounceX}px, ${bounceY}px)`);
    };

    const onScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? window.scrollY / docHeight : 0;
      setScrollProgress(progress);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          setFrameIndex((prev) => (prev + 1) % frames.length);
        }, 300);
      }
      if (!jiggleRef.current) {
        jiggleRef.current = setInterval(randomTransform, 200);
      }

      timeoutRef.current = setTimeout(() => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        if (jiggleRef.current) { clearInterval(jiggleRef.current); jiggleRef.current = null; }
        setJiggleTransform("");
      }, 600);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (jiggleRef.current) clearInterval(jiggleRef.current);
    };
  }, []);

  // Listen for custom spin event
  useEffect(() => {
    const handleSpin = () => {
      setIsSpinning(true);
      setTimeout(() => setIsSpinning(false), 800);
    };
    window.addEventListener("puppet-spin", handleSpin);
    return () => window.removeEventListener("puppet-spin", handleSpin);
  }, []);

  // Transition zones: 0–0.08 = big→small, 0.08–0.92 = small, 0.92–1 = small→big
  const isIntro = scrollProgress < 0.08;
  const isOutro = scrollProgress > 0.92;
  const isBig = isIntro || isOutro;

  let sizeProgress: number; // 0 = full big, 1 = small
  if (isIntro) {
    sizeProgress = scrollProgress / 0.08;
  } else if (isOutro) {
    sizeProgress = (1 - scrollProgress) / 0.08;
  } else {
    sizeProgress = 1;
  }

  // Interpolate: big = 90vh, small = 160px
  const bigSize = 80; // vh
  const smallSize = 160; // px approx
  const opacity = isBig ? 0.15 + sizeProgress * 0.85 : 1;

  const containerStyle: React.CSSProperties = isBig
    ? {
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: `${bigSize * (1 - sizeProgress) + (sizeProgress * 10)}vh`,
        height: `${bigSize * (1 - sizeProgress) + (sizeProgress * 12)}vh`,
        opacity,
        zIndex: 5,
        pointerEvents: "none",
        transition: "width 0.3s ease-out, height 0.3s ease-out, opacity 0.3s ease-out",
      }
    : {
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: 120,
        height: 160,
        opacity: 1,
        zIndex: 20,
        pointerEvents: "none" as const,
        transition: "width 0.3s ease-out, height 0.3s ease-out, opacity 0.3s ease-out",
      };

  return (
    <div className={`hidden md:block ${isSpinning ? "puppet-spin-animation" : ""}`} style={containerStyle}>
      <div
        style={{
          transform: isBig ? "" : jiggleTransform,
          transition: "transform 0.2s ease-out",
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        {frames.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Puppet pose ${i + 1}`}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ opacity: i === frameIndex ? 1 : 0, transition: "opacity 0.15s" }}
          />
        ))}
      </div>
    </div>
  );
}
