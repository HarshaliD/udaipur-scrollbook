import { useState, useEffect, useCallback } from "react";

interface PhotoStackProps {
  photos: string[];
  locationName: string;
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

  // Generate stable-ish random transforms from index
  const getTransform = (i: number) => {
    const seed = i * 7 + 3;
    const rot = ((seed * 13) % 25) - 12;
    const tx = ((seed * 17) % 31) - 15;
    const ty = ((seed * 11) % 21) - 10;
    return { rot, tx, ty };
  };

  const visiblePhotos = photos.slice(0, 5);

  return (
    <>
      {/* Stacked photos */}
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
                ...(isTop
                  ? {
                      transition: "transform 0.3s ease",
                    }
                  : {}),
              }}
            >
              <div
                className={`bg-white p-1.5 pb-7 rounded shadow-md ${isTop ? "group-hover:-translate-y-2 group-hover:rotate-0 transition-transform duration-300" : ""}`}
                style={{
                  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                }}
              >
                <img
                  src={src}
                  alt={locationName}
                  className="w-full h-28 object-cover rounded-sm"
                />
                <p
                  className="text-xs text-center mt-1 absolute bottom-1.5 left-0 right-0"
                  style={{ fontFamily: "'Caveat', cursive", color: "#3a2a1a" }}
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
          style={{ fontFamily: "'Caveat', cursive", fontSize: 14, color: "#3a2a1a" }}
        >
          {photos.length} 📷
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={closeLightbox}
        >
          {/* Photo */}
          <div
            className="relative bg-white p-3 pb-10 rounded shadow-2xl max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[lightboxIndex]}
              alt={locationName}
              className="max-w-[85vw] max-h-[80vh] object-contain rounded-sm"
            />
            <p
              className="text-center mt-1 absolute bottom-2 left-0 right-0"
              style={{ fontFamily: "'Caveat', cursive", fontSize: 18, color: "#3a2a1a" }}
            >
              {locationName}
            </p>
          </div>

          {/* Arrows */}
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:scale-110 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length);
                }}
              >
                ‹
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:scale-110 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % photos.length);
                }}
              >
                ›
              </button>
            </>
          )}

          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white text-2xl hover:scale-110 transition-transform"
            onClick={closeLightbox}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
