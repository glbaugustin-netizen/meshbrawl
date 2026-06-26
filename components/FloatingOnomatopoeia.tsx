"use client";

import { useEffect, useRef, useState } from "react";

// Onomatopées comic qui pop aléatoirement autour du hero puis disparaissent.
const POOL = [
  { word: "BOOM!", color: "#ffd400" },
  { word: "POW!",  color: "#ff4d8d" },
  { word: "BAM!",  color: "#5aa9ff" },
  { word: "KO!",   color: "#ff2e2e" },
  { word: "WHAM!", color: "#ffd400" },
  { word: "ZAP!",  color: "#5aa9ff" },
  { word: "BANG!", color: "#ff4d8d" },
  { word: "SLAM!", color: "#0aa36b" },
] as const;

// Zones de spawn : on évite le centre où s'affiche le slogan.
const ZONES = [
  { xMin: 2,  xMax: 20, yMin: 8,  yMax: 85 }, // colonne gauche
  { xMin: 72, xMax: 90, yMin: 8,  yMax: 85 }, // colonne droite
  { xMin: 25, xMax: 66, yMin: 2,  yMax: 14 }, // bande haute
  { xMin: 25, xMax: 66, yMin: 80, yMax: 92 }, // bande basse
] as const;

const LIFETIME = 1800;

interface Pop {
  id:     number;
  word:   string;
  color:  string;
  x:      number;
  y:      number;
  rotate: number;
  size:   number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

export default function FloatingOnomatopoeia() {
  const [pops, setPops] = useState<Pop[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const spawn = () => {
      const zone = pick(ZONES);
      const item = pick(POOL);
      const id   = nextId.current++;
      const pop: Pop = {
        id,
        word:   item.word,
        color:  item.color,
        x:      rand(zone.xMin, zone.xMax),
        y:      rand(zone.yMin, zone.yMax),
        rotate: rand(-14, 14),
        size:   rand(40, 78),
      };
      setPops((prev) => [...prev, pop]);
      const t = setTimeout(() => {
        setPops((prev) => prev.filter((p) => p.id !== id));
      }, LIFETIME);
      timeouts.push(t);
    };

    spawn();
    const interval = setInterval(spawn, 850);

    return () => {
      clearInterval(interval);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="hidden md:block absolute inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {pops.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left:      `${p.x}%`,
            top:       `${p.y}%`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        >
          <span
            className="font-bangers tracking-widest uppercase select-none animate-onomatopoeia-pop block"
            style={{
              fontSize:         `${p.size}px`,
              color:            p.color,
              WebkitTextStroke: "2px #1a1a1a",
              textShadow:       "4px 4px 0 #1a1a1a",
              lineHeight:       1,
            }}
          >
            {p.word}
          </span>
        </div>
      ))}
    </div>
  );
}
