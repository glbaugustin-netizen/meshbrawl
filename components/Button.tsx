"use client";

import { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

export default function Button({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-block px-8 py-3 font-bangers tracking-widest text-2xl uppercase border-[5px] border-[#1a1a1a] rounded-[14px] cursor-pointer transition-all duration-100 active:translate-y-[6px] active:shadow-[0_2px_0_#1a1a1a] select-none";

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-[#ff2e2e] text-[#ffd400] shadow-[0_8px_0_#1a1a1a] hover:-translate-y-[3px] hover:shadow-[0_11px_0_#1a1a1a]",
    secondary:
      "bg-[#2e6bff] text-white shadow-[0_8px_0_#1a1a1a] hover:-translate-y-[3px] hover:shadow-[0_11px_0_#1a1a1a]",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
