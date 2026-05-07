import { useState, useEffect, useCallback } from "react";
import { ApiPhoto } from "@/lib/api";

interface PhotoStackProps {
  photos: ApiPhoto[];
  locationName: string;
}

function PolaroidCard({
  photo,
  locationName,
  style,
  className = "",
}: {
  photo: ApiPhoto;
  locationName: string;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div className={className} style={style}>
      <div
        className="bg-white p-1.5 pb-9 rounded shadow-md hover:-translate-y-1.5 transition-transform duration-300 relative"
        style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
      >
        <img src={photo.cloudinaryUrl} alt={locationName} className="w-full h-28 object-cover rounded-sm" />
        <div className="absolute bottom-1 left-2 flex items-center gap-1.5 overflow-hidden w-full">
          {photo.uploaderAvatar && (
            <img src={photo.uploaderAvatar} alt={photo.uploaderName} className="w-5 h-5 rounded-full border border-gray-200 object-cover" />
          )}
          <p
            className="text-[10px] truncate pr-4"
            style={{ fontFamily: "'Caveat', cursive", color: "hsl(var(--ink))" }}
          >
            {photo.uploaderName || "Traveler"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PhotoStack({ photos, locationName }: PhotoStackProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  // Dispatch event to hide/show puppet when lightbox opens/closes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("lightbox-toggle", { detail: lightboxIndex !== null }));
  }, [lightboxIndex]);

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
          <PolaroidCard photo={photos[0]} locationName={locationName} style={{ width: 140 }} />
        </div>
      );
    }

    if (count === 2) {
      return (
        <div className="flex justify-center items-end cursor-pointer -space-x-6" onClick={() => setLightboxIndex(1)}>
          <PolaroidCard photo={photos[0]} locationName={locationName} style={{ width: 130, transform: "rotate(-8deg)" }} />
          <PolaroidCard photo={photos[1]} locationName={locationName} style={{ width: 130, transform: "rotate(8deg)" }} />
        </div>
      );
    }

    if (count === 3) {
      const rots = [-10, 0, 10];
      return (
        <div className="flex justify-center items-end cursor-pointer -space-x-8" onClick={() => setLightboxIndex(2)}>
          {photos.map((photo, i) => (
            <PolaroidCard
              key={i}
              photo={photo}
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
        {visiblePhotos.map((photo, i) => {
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
                className={`bg-white p-1.5 pb-9 rounded shadow-md relative ${isTop ? "group-hover:-translate-y-2 group-hover:rotate-0 transition-transform duration-300" : ""}`}
                style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}
              >
                <img src={photo.cloudinaryUrl} alt={locationName} className="w-full h-28 object-cover rounded-sm" />
                <div className="absolute bottom-1 left-2 flex items-center gap-1.5 overflow-hidden w-full">
                  {photo.uploaderAvatar && (
                    <img src={photo.uploaderAvatar} alt={photo.uploaderName} className="w-5 h-5 rounded-full border border-gray-200 object-cover" />
                  )}
                  <p
                    className="text-[10px] truncate pr-4"
                    style={{ fontFamily: "'Caveat', cursive", color: "hsl(var(--ink))" }}
                  >
                    {photo.uploaderName || "Traveler"}
                  </p>
                </div>
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
            className="relative bg-white p-3 pb-12 rounded shadow-2xl max-w-[90vw] max-h-[90vh] z-[10000] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[lightboxIndex].cloudinaryUrl}
              alt={locationName}
              className="max-w-[85vw] max-h-[80vh] object-contain rounded-sm"
            />
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                {photos[lightboxIndex].uploaderAvatar && (
                  <img src={photos[lightboxIndex].uploaderAvatar} alt={photos[lightboxIndex].uploaderName} className="w-6 h-6 rounded-full border border-gray-200" />
                )}
                <span style={{ fontFamily: "'Caveat', cursive", fontSize: 16, color: "hsl(var(--ink))" }}>
                  by {photos[lightboxIndex].uploaderName || "Traveler"}
                </span>
              </div>
              <p style={{ fontFamily: "'Caveat', cursive", fontSize: 18, color: "hsl(var(--ink))", fontWeight: "bold" }}>
                {locationName}
              </p>
            </div>
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
