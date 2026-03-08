import { useState, useEffect, useRef } from "react";
import puppet1 from "@/assets/puppet1.svg";
import puppet2 from "@/assets/puppet2.svg";
import puppet3 from "@/assets/puppet3.svg";

const frames = [puppet1, puppet2, puppet3];

export default function PuppetDancer() {
  const [frameIndex, setFrameIndex] = useState(0);
  const [jiggleTransform, setJiggleTransform] = useState("");
  const [scrollProgress, setScrollProgress] = useState(0);
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

  // 0–0.15 = shrink from huge to small, 0.85–1 = grow back
  const introZone = 0.15;
  const outroStart = 0.85;

  let t: number; // 0 = fully big, 1 = fully small
  if (scrollProgress < introZone) {
    t = scrollProgress / introZone;
  } else if (scrollProgress > outroStart) {
    t = (1 - scrollProgress) / (1 - outroStart);
  } else {
    t = 1;
  }

  const isBig = t < 1;

  // Size: big = 100vmin, small = 120px width / 160px height
  // Lerp in vmin for big, px for small
  const sizeVmin = 100 * (1 - t); // 100 → 0
  const sizePxW = 120 * t; // 0 → 120
  const sizePxH = 160 * t; // 0 → 160

  const width = isBig ? `calc(${sizeVmin}vmin + ${sizePxW}px)` : "120px";
  const height = isBig ? `calc(${sizeVmin * 1.33}vmin + ${sizePxH}px)` : "160px";
  const opacity = isBig ? 0.55 + t * 0.45 : 1;

  return (
    <div
      className="hidden md:block fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{
        width,
        height,
        opacity,
        zIndex: isBig ? 5 : 20,
        pointerEvents: "none",
        transition: "width 0.15s ease-out, height 0.15s ease-out, opacity 0.15s ease-out",
      }}
    >
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
