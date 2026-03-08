import puppet1 from "@/assets/puppet1.svg";
import puppet2 from "@/assets/puppet2.svg";
import puppet3 from "@/assets/puppet3.svg";

const frames = [puppet1, puppet2, puppet3];

interface PuppetDancerProps {
  scrollProgress: number;
}

export default function PuppetDancer({ scrollProgress }: PuppetDancerProps) {
  const frameIndex = Math.min(
    Math.floor(scrollProgress * frames.length),
    frames.length - 1
  );

  return (
    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none hidden md:block"
      style={{ width: 120, height: 160 }}
    >
      {frames.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={`Puppet pose ${i + 1}`}
          className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300"
          style={{ opacity: i === frameIndex ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
