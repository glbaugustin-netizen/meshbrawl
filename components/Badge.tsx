interface BadgeProps {
  label?: string;
  rotate?: number;
  className?: string;
  delay?: number;
}

export default function Badge({
  label = "POW!",
  rotate = -6,
  className = "",
  delay,
}: BadgeProps) {
  return (
    <span
      className={`inline-block font-bangers tracking-widest text-white bg-[#ff2e2e] border-[3px] border-[#1a1a1a] px-4 py-1 text-xl uppercase animate-badge-pop ${className}`}
      style={{
        transform: `rotate(${rotate}deg)`,
        borderRadius: "8px",
        animationDelay: delay !== undefined ? `${delay}s` : undefined,
      }}
    >
      {label}
    </span>
  );
}
