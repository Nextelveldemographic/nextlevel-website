import React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

// Clip de 7,5 s con jump cuts, zooms por toma y subtítulos Montserrat
// ExtraBold palabra por palabra. Fuente: public/zoom-cut.mp4 (ya recortado,
// con el audio normalizado). Tiempos de palabra en frames de 30 fps.

export const ZOOM_FPS = 30;
export const ZOOM_DURATION = 225;

const MONTSERRAT = "Montserrat";

// Montserrat ExtraBold (OFL), incluida en public/ para renderizar sin internet
const fontHandle = delayRender("Cargando Montserrat");
const montserrat = new FontFace(
  MONTSERRAT,
  `url(${staticFile("fonts/Montserrat-800-latin.woff2")}) format("woff2")`,
  { weight: "800" },
);
montserrat
  .load()
  .then(() => {
    document.fonts.add(montserrat);
    continueRender(fontHandle);
  })
  .catch((err) => console.error(err));
const YELLOW = "#FFD400";
const ORANGE = "#FF8A00";
const WHITE = "#FFFFFF";
const HIGHLIGHT_SCALE = 1.1;
const BASE_SIZE = 84;

type Word = {
  w: string;
  at: number; // frame de aparición
  color?: string;
  sfx?: boolean; // sonido sutil (solo en amarillo)
};
type Group = { start: number; words: Word[] };

// Texto según tus instrucciones. Revisar contra el audio antes de publicar:
// la transcripción automática no confirmó "Slideographic" ni "Zitalá House".
const GROUPS: Group[] = [
  {
    start: 0,
    words: [
      { w: "HOLA", at: 0 },
      { w: "AMIGOS", at: 13 },
      { w: "DE", at: 26 },
      { w: "SLIDEOGRAPHIC", at: 35, color: YELLOW, sfx: true },
    ],
  },
  {
    start: 67,
    words: [
      { w: "NOS", at: 68 },
      { w: "ENCONTRAMOS", at: 76 },
      { w: "AHORA", at: 86 },
      { w: "ACÁ", at: 98 },
      { w: "EN", at: 110 },
    ],
  },
  {
    start: 132,
    words: [
      { w: "ZITALÁ", at: 132, color: ORANGE },
      { w: "HOUSE", at: 145, color: ORANGE },
      { w: "EN", at: 157 },
      { w: "COLONIA", at: 168 },
    ],
  },
  {
    start: 185,
    words: [
      { w: "ESCALÓN", at: 185, color: YELLOW, sfx: true },
      { w: "NORTE", at: 206, color: YELLOW, sfx: true },
    ],
  },
];

// Tomas: zoom por corte. Cada toma reencuadra la imagen completa, así no
// quedan bandas negras. `snap` = zoom rápido (4 frames) al iniciar la toma.
const SHOTS: { from: number; scale: number; snap?: number }[] = [
  { from: 0, scale: 1.15 }, // 1: "Hola amigos de…", rostro y torso
  { from: 67, scale: 1.3 }, // 2: "Nos encontramos ahora acá en"
  { from: 132, scale: 1.1 }, // 3: "Zitalá House en…"
  { from: 163, scale: 1.4, snap: 4 }, // 4: "…Colonia Escalón Norte", zoom rápido
];

const FACE_X = 540; // centro horizontal del cuadro original
const FACE_Y = 800; // altura del rostro en el cuadro original (1080x1920)
const TARGET_Y = 640; // dónde queda el rostro en pantalla

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const shotScale = (frame: number) => {
  let i = 0;
  while (i + 1 < SHOTS.length && SHOTS[i + 1].from <= frame) i++;
  const shot = SHOTS[i];
  if (shot.snap !== undefined && frame < shot.from + shot.snap) {
    const prev = SHOTS[i - 1]?.scale ?? shot.scale;
    return interpolate(
      frame,
      [shot.from, shot.from + shot.snap],
      [prev, shot.scale],
      clamp,
    );
  }
  return shot.scale;
};

const ZoomedVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const s = shotScale(frame);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1080,
        height: 1920,
        transformOrigin: "0 0",
        transform: `translate(${FACE_X * (1 - s)}px, ${TARGET_Y - FACE_Y * s}px) scale(${s})`,
      }}
    >
      <OffthreadVideo
        src={staticFile("zoom-cut.mp4")}
        muted
        style={{ position: "absolute", width: 1080, height: 1920 }}
      />
    </div>
  );
};

const Group: React.FC<{ group: Group; end: number }> = ({ group, end }) => {
  const frame = useCurrentFrame();
  if (frame < group.start || frame >= end) return null;
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
          textTransform: "uppercase",
          color: WHITE,
          textShadow: "6px 6px 12px rgba(0,0,0,0.8)",
        }}
      >
        {group.words.map((word) => {
          const local = frame - word.at;
          const scale = interpolate(local, [0, 3], [0.8, 1], clamp);
          const opacity = interpolate(local, [0, 1], [0, 1], clamp);
          const highlighted = word.color !== undefined;
          return (
            <span
              key={`${word.w}-${word.at}`}
              style={{
                display: "inline-block",
                margin: "0 14px",
                color: word.color ?? WHITE,
                fontSize: highlighted ? BASE_SIZE * HIGHLIGHT_SCALE : BASE_SIZE,
                opacity,
                transform: `scale(${scale})`,
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

export const Zoom: React.FC = () => {
  const frame = useCurrentFrame();
  const flash = frame === 132 || frame === 133;
  const sfx = GROUPS.flatMap((g) => g.words).filter((w) => w.sfx);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <ZoomedVideo />
      {GROUPS.map((g, i) => (
        <Group
          key={g.start}
          group={g}
          end={GROUPS[i + 1]?.start ?? ZOOM_DURATION}
        />
      ))}
      {flash ? (
        <AbsoluteFill style={{ backgroundColor: "white", opacity: 0.5 }} />
      ) : null}

      <Audio src={staticFile("zoom-cut.mp4")} />
      {sfx.map((w) => (
        <Sequence key={`sfx-${w.at}`} from={w.at}>
          <Audio src={staticFile("sfx/pop.wav")} volume={0.25} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
