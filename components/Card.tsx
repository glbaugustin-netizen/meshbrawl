interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-white border-[5px] border-[#1a1a1a] rounded-[16px] shadow-[6px_6px_0_#1a1a1a] p-5 ${className}`}
    >
      {children}
    </div>
  );
}
