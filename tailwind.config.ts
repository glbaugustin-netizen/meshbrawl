import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "badge-pop": {
          "0%, 100%": { scale: "1" },
          "50%": { scale: "1.12" },
        },
        "blink-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "badge-pop": "badge-pop 1.4s ease-in-out infinite",
        "blink-dot": "blink-dot 1s ease-in-out infinite",
      },
      colors: {
        yellow: "#ffd400",
        black: "#1a1a1a",
        red: "#ff2e2e",
        blue: "#2e6bff",
        green: "#0aa36b",
        white: "#fff",
      },
      fontFamily: {
        bangers: ["Bangers", "cursive"],
        archivo: ["Archivo", "sans-serif"],
        "archivo-black": ["Archivo Black", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
