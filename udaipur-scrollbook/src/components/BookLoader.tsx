import { useState, useEffect } from "react";
import udaipurArtwork from "@/assets/udaipur-artwork.svg";

interface BookLoaderProps {
  onComplete: () => void;
}

export default function BookLoader({ onComplete }: BookLoaderProps) {
  const [stage, setStage] = useState<"closed" | "opening" | "writing" | "blooming" | "exit" | "done">("closed");

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Stage 1: Closed book visible for 0.2s
    timers.push(setTimeout(() => setStage("opening"), 200));
    // Stage 2: Book opens over 0.8s
    timers.push(setTimeout(() => setStage("writing"), 1000));
    // Stage 3: Text writing 0.5s
    timers.push(setTimeout(() => setStage("blooming"), 1500));
    // Stage 4: Flower bloom 0.4s
    timers.push(setTimeout(() => setStage("exit"), 1900));
    // Stage 5: Fade out 0.4s
    timers.push(setTimeout(() => {
      setStage("done");
      onComplete();
    }, 2300));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  if (stage === "done") return null;

  const isOpening = stage === "opening" || stage === "writing" || stage === "blooming" || stage === "exit";
  const isWriting = stage === "writing" || stage === "blooming" || stage === "exit";
  const isBlooming = stage === "blooming" || stage === "exit";
  const isExit = stage === "exit";

  return (
    <div
      className={`book-loader ${isExit ? "book-loader-exit" : ""}`}
    >
      {/* Paper texture background */}
      <div className="book-loader-bg paper-texture" />

      {/* Book pages container */}
      <div className="book-container" style={{ perspective: "1200px" }}>
        {/* Left page */}
        <div
          className="book-page book-page-left"
          style={{
            transform: isOpening ? "rotateY(0deg)" : "rotateY(-90deg)",
          }}
        />
        {/* Right page */}
        <div
          className="book-page book-page-right"
          style={{
            transform: isOpening ? "rotateY(0deg)" : "rotateY(90deg)",
          }}
        />

        {/* Udaipur artwork */}
        <div
          className="book-artwork"
          style={{
            opacity: isOpening ? 1 : 0,
            transform: isOpening ? "scale(1)" : "scale(0.8)",
          }}
        >
          <img src={udaipurArtwork} alt="Udaipur" className="book-artwork-img" />

          {/* SVG text overlay for calligraphy stroke animation */}
          <svg
            className={`book-title-svg ${isWriting ? "writing" : ""}`}
            viewBox="0 0 300 60"
            xmlns="http://www.w3.org/2000/svg"
          >
            <text
              x="150"
              y="45"
              textAnchor="middle"
              className="book-title-text"
              style={{
                fontFamily: "'Caveat', cursive",
                fontSize: "48px",
                fill: "none",
                stroke: "hsl(27, 33%, 16%)",
                strokeWidth: "1.5",
              }}
            >
              Udaipur
            </text>
          </svg>

          {/* Decorative flowers */}
          <div className={`book-flowers ${isBlooming ? "blooming" : ""}`}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className="book-flower"
                style={{
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                ✿
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Fold line shadow for closed state */}
      {stage === "closed" && (
        <div className="book-fold-shadow" />
      )}
    </div>
  );
}
