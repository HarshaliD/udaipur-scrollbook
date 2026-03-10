import { useState, useEffect, useCallback } from "react";

interface PhotoStackProps {
  photos: string[];
  locationName: string;
}

function PolaroidCard({
  src,
  locationName,
  style,
  className = "",
}: {
  src: string;
  locationName: string;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div className={className} style={style}>
      <div
        className="bg-white p-1.5 pb-7 rounded shadow-md hover:-translate-y-1.5 transition-transform duration-300"
        style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
      >
        <img src={src} alt={locationName} className="w-full h-28 object-cover rounded-sm" />
        <p
          className="text-xs text-center mt-1 absolute bottom-1.5 left-0 right-0"
          style={{ fontFamily: "'Caveat', cursive", color: "hsl(var(--ink))" }}
        >
          {locationName}
        </p>
      </div>
    </div>
  );
}

export default function PhotoStack({ photos, locationName }: PhotoStackProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i !== null ? (i + 1) % photos.length : null));
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, photos.length, closeLightbox]);

  if (photos.length === 0) return null;

  const count = photos.length;

  // Layouts by count
  const renderPhotos = () => {
    if (count === 1) {
      return (
        <div className="flex justify-center cursor-pointer" onClick={() => setLightboxIndex(0)}>
          <PolaroidCard src={photos[0]} locationName={locationName} style={{ width: 140 }} />
        </div>
      );
    }

    if (count === 2) {
      return (
        <div className="flex justify-center items-end cursor-pointer -space-x-6" onClick={() => setLightboxIndex(1)}>
          <PolaroidCard src={photos[0]} locationName={locationName} style={{ width: 130, transform: "rotate(-8deg)" }} />
          <PolaroidCard src={photos[1]} locationName={locationName} style={{ width: 130, transform: "rotate(8deg)" }} />
        </div>
      );
    }

    if (count === 3) {
      const rots = [-10, 0, 10];
      return (
        <div className="flex justify-center items-end cursor-pointer -space-x-8" onClick={() => setLightboxIndex(2)}>
          {photos.map((src, i) => (
            <PolaroidCard
              key={i}
              src={src}
              locationName={locationName}
              style={{ width: 125, transform: `rotate(${rots[i]}deg)`, zIndex: i }}
            />
          ))}
        </div>
      );
    }

    // 4+ photos: stacked pile
    const visiblePhotos = photos.slice(0, 5);
    const getTransform = (i: number) => {
      const seed = i * 7 + 3;
      const rot = ((seed * 13) % 25) - 12;
      const tx = ((seed * 17) % 31) - 15;
      const ty = ((seed * 11) % 21) - 10;
      return { rot, tx, ty };
    };

    return (
      <div
        className="relative mx-auto cursor-pointer group"
        style={{ height: 220, width: 200 }}
        onClick={() => setLightboxIndex(photos.length - 1)}
      >
        {visiblePhotos.map((src, i) => {
          const { rot, tx, ty } = getTransform(i);
          const isTop = i === visiblePhotos.length - 1;
          return (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 transition-transform duration-300 ease-out"
              style={{
                width: 140,
                marginLeft: -70,
                marginTop: -90,
                transform: `translateX(${tx}px) translateY(${ty}px) rotate(${rot}deg)`,
                zIndex: i,
              }}
            >
              <div
                className={`bg-white p-1.5 pb-7 rounded shadow-md ${isTop ? "group-hover:-translate-y-2 group-hover:rotate-0 transition-transform duration-300" : ""}`}
                style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
              >
                <img src={src} alt={locationName} className="w-full h-28 object-cover rounded-sm" />
                <p
                  className="text-xs text-center mt-1 absolute bottom-1.5 left-0 right-0"
                  style={{ fontFamily: "'Caveat', cursive", color: "hsl(var(--ink))" }}
                >
                  {locationName}
                </p>
              </div>
            </div>
          );
        })}
        {/* Photo count badge */}
        <div
          className="absolute -top-2 -right-2 z-10 bg-white border border-border rounded-full px-2 py-0.5 shadow-sm"
          style={{ fontFamily: "'Caveat', cursive", fontSize: 14, color: "hsl(var(--ink))" }}
        >
          {photos.length} 📷
        </div>
      </div>
    );
  };

  return (
    <>
      {renderPhotos()}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={closeLightbox}
        >
          <div
            className="relative bg-white p-3 pb-10 rounded shadow-2xl max-w-[90vw] max-h-[90vh] z-[10000]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[lightboxIndex]}
              alt={locationName}
              className="max-w-[85vw] max-h-[80vh] object-contain rounded-sm"
            />
            <p
              className="text-center mt-1 absolute bottom-2 left-0 right-0"
              style={{ fontFamily: "'Caveat', cursive", fontSize: 18, color: "hsl(var(--ink))" }}
            >
              {locationName}
            </p>
          </div>

          {photos.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:scale-110 transition-transform z-[10001]"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length); }}
              >‹</button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:scale-110 transition-transform z-[10001]"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % photos.length); }}
              >›</button>
            </>
          )}

          <button
            className="absolute top-4 right-4 text-white text-2xl hover:scale-110 transition-transform z-[10001]"
            onClick={closeLightbox}
          >✕</button>
        </div>
      )}
    </>
  );
}
