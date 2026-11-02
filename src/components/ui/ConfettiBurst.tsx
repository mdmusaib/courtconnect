"use client";

import { useEffect, useState } from "react";

const COLORS = ["#059669", "#0891B2", "#F59E0B", "#F43F5E", "#8B5CF6"];
const PIECE_COUNT = 36;

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  drift: number;
  color: string;
  size: number;
  rounded: boolean;
}

export function ConfettiBurst() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const generated: Piece[] = Array.from({ length: PIECE_COUNT }, (_, id) => ({
      id,
      left: Math.random() * 100,
      delay: Math.random() * 400,
      duration: 2200 + Math.random() * 1400,
      drift: (Math.random() - 0.5) * 180,
      color: COLORS[id % COLORS.length],
      size: 6 + Math.random() * 6,
      rounded: Math.random() > 0.5,
    }));

    setPieces(generated);

    const timer = setTimeout(() => setVisible(false), 3400);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
    >
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-0 animate-confetti"
          style={
            {
              left: `${piece.left}%`,
              width: piece.size,
              height: piece.rounded ? piece.size : piece.size * 0.6,
              backgroundColor: piece.color,
              borderRadius: piece.rounded ? "9999px" : "2px",
              animationDelay: `${piece.delay}ms`,
              animationDuration: `${piece.duration}ms`,
              "--drift": `${piece.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
