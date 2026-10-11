import React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { MONTSERRAT } from "./fontMontserrat";

// Corte de 6,6 s (public/zoom-cut-v2.mp4, ya recortado y con el audio
// normalizado). Todos los tiempos son frames de 30 fps de ese archivo.

export const ZOOM_V2_FPS = 30;
export const ZOOM_V2_DURATION = 197;

const WHITE = "#FFFFFF";
const YELLOW = "#FFD400";
const RED = "#FF2E2E";
const BASE_SIZE = 84;
const HIGHLIGHT_SCALE = 1.1;

type Word = { w: string; at: number; color?: string };
type Group = { start: number; words: Word[] };

// Texto según las instrucciones del encargo. Revisar contra el audio antes
// de publicar: "Slideographic" y "Zitalá House" no se pudieron confirmar.
const GROUPS: Group[] = [
  {
    start: 0,
    words: [
      { w: "HOLA", at: 0 },
      { w: "AMIGOS", at: 14 },
      { w: "DE", at: 25 },
      { w: "SLIDEOGRAPHIC", at: 31, color: YELLOW },
    ],
  },
  {
    start: 49,
    words: [
      { w: "NOS", at: 51 },
      { w: "ENCONTRAMOS", at: 59 },
      { w: "AHORA", at: 79 },
      { w: "ACÁ", at: 86 },
      { w: "EN", at: 91 },
    ],
  },
  {
    start: 107,
    words: [
      { w: "ZITALÁ", at: 107, color: RED },
      { w: "HOUSE", at: 123, color: RED },
      { w: "EN", at: 130 },
      { w: "COLONIA", at: 145 },
    ],
  },
  {
    start: 167,
    words: [
      { w: "ESCALÓN", at: 167, color: YELLOW },
      { w: "NORTE", at: 184, color: YELLOW },
    ],
  },
];

// Zoom por corte. `snap`: frames que dura el acercamiento rápido al entrar.
const SHOTS: { from: number; scale: number; snap?: number }[] = [
  { from: 0, scale: 1.15 }, // "Hola amigos de…"
  { from: 49, scale: 1.3 }, // "Nos encontramos ahora acá…"
  { from: 107, scale: 1.1 }, // "Zitalá House…" (con flash)
  { from: 130, scale: 1.4, snap: 4 }, // "en Colonia Escalón Norte"
];
const FLASH_FRAMES = [107, 108];

// Rostro en el cuadro original (1080x1920). Se centra en él y se limita el
// desplazamiento para que nunca se vean bordes negros.
const FACE = { x: 325, y: 795 };
const FACE_TARGET_Y = 600;

const clamp01 = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;
const limit = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const scaleAt = (frame: number) => {
  let i = 0;
  while (i + 1 < SHOTS.length && SHOTS[i + 1].from <= frame) i++;
  const shot = SHOTS[i];
  if (shot.snap !== undefined && i > 0 && frame < shot.from + shot.snap) {
    return interpolate(
      frame,
      [shot.from, shot.from + shot.snap],
      [SHOTS[i - 1].scale, shot.scale],
      clamp01,
    );
  }
  return shot.scale;
};

const ZoomedVideo: React.FC = () => {
  const s = scaleAt(useCurrentFrame());
  const tx = limit(540 - FACE.x * s, 1080 * (1 - s), 0);
  const ty = limit(FACE_TARGET_Y - FACE.y * s, 1920 * (1 - s), 0);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1080,
        height: 1920,
        transformOrigin: "0 0",
        transform: `translate(${tx}px, ${ty}px) scale(${s})`,
      }}
    >
      <OffthreadVideo
        src={staticFile("zoom-cut-v2.mp4")}
        muted
        style={{ position: "absolute", width: 1080, height: 1920 }}
      />
    </div>
  );
};

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const index = GROUPS.reduce(
    (found, g, i) => (g.start <= frame ? i : found),
    -1,
  );
  if (index < 0) return null;
  const group = GROUPS[index];

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: "0 70px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          maxWidth: 940,
          textAlign: "center",
          fontFamily: MONTSERRAT,
          fontWeight: 800,
          fontSize: BASE_SIZE,
          lineHeight: 1.12,
          color: WHITE,
          // sombra paralela negra al 80 % + un velo suave para separar del fondo claro
          textShadow: "4px 6px 0 rgba(0,0,0,0.8), 0 8px 22px rgba(0,0,0,0.35)",
        }}
      >
        {group.words.map((word) => {
          const local = frame - word.at;
          const highlighted = word.color !== undefined;
          return (
            <span
              key={`${word.w}-${word.at}`}
              style={{
                display: "inline-block",
                margin: "0 14px",
                color: word.color ?? WHITE,
                fontSize: highlighted ? BASE_SIZE * HIGHLIGHT_SCALE : BASE_SIZE,
                // todas las palabras ocupan su sitio desde el inicio: el texto no se desplaza
                opacity: local >= 0 ? 1 : 0,
                transform: `scale(${interpolate(local, [0, 3], [0.8, 1], clamp01)})`,
                transformOrigin: "center bottom",
              }}
            >
              {word.w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const highlighted = GROUPS.flatMap((g) => g.words).filter(
  (w) => w.color !== undefined,
);

export const ZoomV2: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <ZoomedVideo />
      <Captions />
      {FLASH_FRAMES.includes(frame) ? (
        <AbsoluteFill style={{ backgroundColor: WHITE, opacity: 0.5 }} />
      ) : null}

      <Audio src={staticFile("zoom-cut-v2.mp4")} />
      {highlighted.map((w) => (
        <Sequence key={`pop-${w.at}`} from={w.at} durationInFrames={6}>
          <Audio src={staticFile("sfx/pop.wav")} volume={0.25} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
