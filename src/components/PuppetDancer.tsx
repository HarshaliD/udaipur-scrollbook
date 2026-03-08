import { useState, useEffect, useRef } from "react";
import puppet1 from "@/assets/puppet1.svg";
import puppet2 from "@/assets/puppet2.svg";
import puppet3 from "@/assets/puppet3.svg";

const frames = [puppet1, puppet2, puppet3];

export default function PuppetDancer() {
  const [frameIndex, setFrameIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const startCycling = () => {
      // Clear any existing stop timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Start cycling if not already
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          setFrameIndex((prev) => (prev + 1) % frames.length);
        }, 300);
      }

      // Stop cycling 600ms after last scroll event
      timeoutRef.current = setTimeout(() => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, 600);
    };

    window.addEventListener("scroll", startCycling, { passive: true });
    return () => {
      window.removeEventListener("scroll", startCycling);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none hidden md:block"
      style={{ width: 120, height: 160 }}
    >
      {frames.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={`Puppet pose ${i + 1}`}
          className="absolute inset-0 w-full h-full object-contain transition-opacity duration-200"
          style={{ opacity: i === frameIndex ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
