import { useState, useEffect, useRef } from "react";
import puppet1 from "@/assets/puppet1.svg";
import puppet2 from "@/assets/puppet2.svg";
import puppet3 from "@/assets/puppet3.svg";

const frames = [puppet1, puppet2, puppet3];

export default function PuppetDancer() {
  const [frameIndex, setFrameIndex] = useState(0);
  const [transform, setTransform] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jiggleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const randomTransform = () => {
      const rotate = (Math.random() - 0.5) * 20; // ±10deg
      const scale = 0.9 + Math.random() * 0.3; // 0.9–1.2
      const bounceY = (Math.random() - 0.5) * 16; // ±8px
      const bounceX = (Math.random() - 0.5) * 10; // ±5px
      setTransform(`rotate(${rotate}deg) scale(${scale}) translate(${bounceX}px, ${bounceY}px)`);
    };

    const startCycling = () => {
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
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (jiggleRef.current) {
          clearInterval(jiggleRef.current);
          jiggleRef.current = null;
        }
        setTransform("");
      }, 600);
    };

    window.addEventListener("scroll", startCycling, { passive: true });
    return () => {
      window.removeEventListener("scroll", startCycling);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (jiggleRef.current) clearInterval(jiggleRef.current);
    };
  }, []);

  return (
    <div
      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none hidden md:block"
      style={{ width: 120, height: 160 }}
    >
      <div
        style={{
          transform,
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
