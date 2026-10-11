import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily } from "./font";

// Video estilo "alta retención" para TikTok: jump cuts, subtítulos palabra por
// palabra, flashes, negativos, B-roll y texto detrás de la persona (rotoscopia).
// Fuente: public/tour.mp4 (IMG_0776, 30 fps). Recorte de la persona:
// public/tour-matte.webm (mismo timing, zona x=100 y=600 de 760x960).

export const TOUR_FPS = 30;

const YELLOW = "#FFD400";
const ORANGE = "#FF8A00";
const RED = "#FF2D2D";
const WHATSAPP = "#25D366";

// Tramos del clip original que se conservan (en frames de 30 fps); los huecos
// entre tramos se eliminan = jump cut.
export const SEGMENTS = [
  { src: 34, len: 59 }, // "Hola, amigos de Next Level de Puerto Rico."
  { src: 95, len: 63 }, // "Hoy nos encontramos acá en Santa Laja,"
  { src: 159, len: 113 }, // "una torre de apartamentos ubicada en ... Escalón Norte."
].reduce<{ src: number; len: number; out: number }[]>((acc, s) => {
  const prev = acc[acc.length - 1];
  acc.push({ ...s, out: prev ? prev.out + prev.len : 0 });
  return acc;
}, []);

export const TALK_END =
  SEGMENTS[SEGMENTS.length - 1].out + SEGMENTS[SEGMENTS.length - 1].len;
const OUTRO_LEN = 60;
export const TOUR_DURATION = TALK_END + OUTRO_LEN;

// Segundo del clip original -> frame del video final
export const srcToOut = (sec: number) => {
  const f = sec * TOUR_FPS;
  for (const s of SEGMENTS) {
    if (f < s.src) return s.out;
    if (f < s.src + s.len) return Math.round(s.out + f - s.src);
  }
  return TALK_END;
};

// Transcripción con tiempos por palabra (segundos del clip original).
// group: empieza un nuevo bloque de subtítulo.
type Word = { w: string; t: number; color?: string; group?: boolean };
const WORDS: Word[] = [
  { w: "HOLA,", t: 1.15, group: true },
  { w: "AMIGOS", t: 1.42 },
  { w: "DE", t: 1.6 },
  { w: "NEXT", t: 1.8, color: YELLOW, group: true },
  { w: "LEVEL", t: 2.02, color: YELLOW },
  { w: "DE", t: 2.24, group: true },
  { w: "PUERTO", t: 2.48, color: ORANGE },
  { w: "RICO", t: 2.64, color: ORANGE },
  { w: "HOY", t: 3.2, group: true },
  { w: "NOS", t: 3.22 },
  { w: "ENCONTRAMOS", t: 3.34, group: true },
  { w: "ACÁ", t: 3.72, group: true },
  { w: "EN", t: 4.1 },
  { w: "SANTA", t: 4.46, color: YELLOW, group: true },
  { w: "LAJA", t: 4.64, color: YELLOW },
  { w: "UNA", t: 5.32, group: true },
  { w: "TORRE", t: 5.6, color: ORANGE },
  { w: "DE", t: 5.88, group: true },
  { w: "APARTAMENTOS", t: 6.02, color: ORANGE },
  { w: "UBICADA", t: 6.54, group: true },
  { w: "EN", t: 7.04 },
  { w: "ESCALÓN", t: 7.98, color: RED, group: true },
  { w: "NORTE", t: 8.32, color: RED },
];
const CAPTIONS = WORDS.map((w) => ({ ...w, at: srcToOut(w.t) }));

// Encuadres. "a" = la persona hablando, con zoom distinto en cada corte;
// "b1"/"b2" = B-roll mientras la voz sigue.
type Shot = {
  from: number;
  kind: "a" | "b1" | "b2";
  scale?: number;
  fx?: number;
  fy?: number;
  behind?: { lines: string[]; color: string; size: number };
};
const SHOTS: Shot[] = [
  { from: 0, kind: "a", scale: 2.2, fx: 425, fy: 800 },
  {
    from: srcToOut(1.8),
    kind: "a",
    scale: 1.55,
    fx: 430,
    fy: 860,
    behind: { lines: ["NEXT", "LEVEL"], color: YELLOW, size: 190 },
  },
  { from: SEGMENTS[1].out, kind: "a", scale: 1.9, fx: 425, fy: 820 },
  { from: srcToOut(3.72), kind: "a", scale: 1.45, fx: 430, fy: 880 },
  { from: srcToOut(4.46), kind: "a", scale: 2.5, fx: 425, fy: 790 },
  { from: SEGMENTS[2].out, kind: "b1" },
  { from: srcToOut(6.54), kind: "b2" },
  {
    from: srcToOut(7.98),
    kind: "a",
    scale: 1.55,
    fx: 430,
    fy: 860,
    behind: { lines: ["ESCALÓN", "NORTE"], color: RED, size: 125 },
  },
];
const shotAt = (f: number) => {
  let i = 0;
  while (i + 1 < SHOTS.length && SHOTS[i + 1].from <= f) i++;
  const end = i + 1 < SHOTS.length ? SHOTS[i + 1].from : TALK_END;
  return { ...SHOTS[i], end };
};

// Golpes visuales: negativo y destello blanco
const INVERTS = [SHOTS[1].from, SHOTS[4].from, SHOTS[7].from];
const FLASHES = [
  SHOTS[2].from,
  SHOTS[3].from,
  SHOTS[5].from,
  SHOTS[6].from,
  TALK_END,
];
const HITS = INVERTS;
const WHOOSHES = [SHOTS[5].from - 3, SHOTS[6].from - 3, TALK_END - 3];

const SHAKE_LEN = 8;
const shake = (f: number) => {
  const hit = [...HITS].reverse().find((h) => h <= f);
  if (hit === undefined || f - hit > SHAKE_LEN) return { x: 0, y: 0 };
  const k = 1 - (f - hit) / SHAKE_LEN;
  return { x: Math.sin(f * 2.7) * 22 * k, y: Math.cos(f * 3.3) * 16 * k };
};

// Coloca el punto (fx, fy) del cuadro original en (540, 700) de la pantalla
const frameTransform = (scale: number, fx: number, fy: number) =>
  `translate(${540 - fx * scale}px, ${700 - fy * scale}px) scale(${scale})`;

const textShadow = "0 6px 0 rgba(0,0,0,0.35), 0 10px 30px rgba(0,0,0,0.6)";

const BehindText: React.FC<{
  lines: string[];
  color: string;
  size: number;
  start: number;
}> = ({ lines, color, size, start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - start,
    fps,
    config: { damping: 9, stiffness: 220 },
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 430 - 600,
        width: 1200,
        top: 700 - (lines.length * size * 0.92) / 2,
        textAlign: "center",
        fontFamily,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 0.92,
        letterSpacing: -size * 0.03,
        color,
        textShadow: "0 8px 30px rgba(0,0,0,0.35)",
        transform: `scale(${interpolate(s, [0, 1], [0.4, 1])})`,
        opacity: Math.min(1, s * 2),
      }}
    >
      {lines.map((l) => (
        <div key={l}>{l}</div>
      ))}
    </div>
  );
};

const ARoll: React.FC<{ seg: (typeof SEGMENTS)[number] }> = ({ seg }) => {
  const local = useCurrentFrame();
  const f = seg.out + local;
  const shot = shotAt(f);
  if (shot.kind !== "a") return null;
  // pequeño zoom continuo dentro de cada toma
  const breathe = interpolate(f, [shot.from, shot.end], [1, 1.04]);
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "black" }}>
      <div
        style={{
          position: "absolute",
          width: 1080,
          height: 1920,
          transformOrigin: "0 0",
          transform: frameTransform(shot.scale! * breathe, shot.fx!, shot.fy!),
        }}
      >
        <OffthreadVideo
          src={staticFile("tour.mp4")}
          trimBefore={seg.src}
          muted
          style={{ position: "absolute", width: 1080, height: 1920 }}
        />
        {shot.behind ? (
          <>
            <BehindText {...shot.behind} start={shot.from - seg.out} />
            <OffthreadVideo
              src={staticFile("tour-matte.webm")}
              trimBefore={seg.src}
              transparent
              muted
              style={{
                position: "absolute",
                left: 100,
                top: 600,
                width: 760,
                height: 960,
              }}
            />
          </>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// B-roll tomado del otro clip grabado en el mismo lugar (public/clip.mp4)
const BRoll: React.FC<{
  len: number;
  trimBefore: number;
  scale: [number, number];
  fx: [number, number];
  fy: [number, number];
  children?: React.ReactNode;
}> = ({ len, trimBefore, scale, fx, fy, children }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, len], [0, 1], { extrapolateRight: "clamp" });
  const s = interpolate(t, [0, 1], scale);
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "black" }}>
      <div
        style={{
          position: "absolute",
          width: 1080,
          height: 1920,
          transformOrigin: "0 0",
          transform: frameTransform(
            s,
            interpolate(t, [0, 1], fx),
            interpolate(t, [0, 1], fy),
          ),
        }}
      >
        <OffthreadVideo
          src={staticFile("clip.mp4")}
          trimBefore={trimBefore}
          muted
          style={{ width: 1080, height: 1920 }}
        />
      </div>
      {children}
    </AbsoluteFill>
  );
};

const LocationPin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({
    frame: frame - 2,
    fps,
    config: { damping: 8, stiffness: 200 },
  });
  const label = spring({ frame: frame - 8, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", fontFamily }}>
      <svg
        width={170}
        height={230}
        viewBox="0 0 24 32"
        style={{
          marginTop: 330,
          transform: `translateY(${interpolate(drop, [0, 1], [-400, 0])}px)`,
          filter: "drop-shadow(0 12px 18px rgba(0,0,0,0.5))",
        }}
      >
        <path
          d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z"
          fill={RED}
        />
        <circle cx="12" cy="12" r="4.6" fill="white" />
      </svg>
      <div
        style={{
          marginTop: 24,
          padding: "16px 36px",
          borderRadius: 18,
          background: "white",
          color: "black",
          fontSize: 56,
          fontWeight: 900,
          transform: `scale(${label})`,
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        }}
      >
        ESCALÓN NORTE
      </div>
    </AbsoluteFill>
  );
};

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame >= TALK_END) return null;

  // bloque activo = último inicio de grupo ya alcanzado
  let start = -1;
  CAPTIONS.forEach((c, i) => {
    if (c.group && c.at <= frame) start = i;
  });
  if (start < 0) return null;
  let end = start + 1;
  while (end < CAPTIONS.length && !CAPTIONS[end].group) end++;
  const words = CAPTIONS.slice(start, end).filter((c) => c.at <= frame);
  const chars = CAPTIONS.slice(start, end).reduce((n, c) => n + c.w.length, 0);
  const fontSize = chars > 10 ? 104 : 128;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 380,
        paddingLeft: 50,
        paddingRight: 50,
      }}
    >
      <div style={{ textAlign: "center", lineHeight: 1.05 }}>
        {words.map((c, i) => {
          const s = spring({
            frame: frame - c.at,
            fps,
            config: { damping: 8, stiffness: 320, mass: 0.5 },
          });
          const latest = i === words.length - 1;
          return (
            <span
              key={c.at + c.w}
              style={{
                display: "inline-block",
                margin: "0 26px",
                fontFamily,
                fontWeight: 900,
                fontSize,
                letterSpacing: -2,
                color: c.color ?? "white",
                WebkitTextStroke: "12px black",
                paintOrder: "stroke fill",
                textShadow,
                transform: `scale(${interpolate(s, [0, 1], [0.3, latest ? 1.08 : 1])}) rotate(${
                  latest ? -2 : 0
                }deg)`,
              }}
            >
              {c.w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = (delay: number) =>
    spring({
      frame: frame - delay,
      fps,
      config: { damping: 8, stiffness: 260 },
    });
  const line = (text: string, delay: number, size: number, color = "white") => (
    <div
      style={{
        fontSize: size,
        fontWeight: 900,
        letterSpacing: -2,
        lineHeight: 1.05,
        color,
        WebkitTextStroke: "12px black",
        paintOrder: "stroke fill",
        textShadow,
        transform: `scale(${pop(delay)})`,
      }}
    >
      {text}
    </div>
  );
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          filter: "blur(14px) brightness(0.45)",
          transform: "scale(1.1)",
        }}
      >
        <OffthreadVideo
          src={staticFile("clip.mp4")}
          trimBefore={30}
          muted
          style={{ width: 1080, height: 1920 }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          fontFamily,
          color: "white",
          gap: 10,
        }}
      >
        <Img
          src={staticFile("logo.png")}
          style={{
            width: 200,
            borderRadius: 24,
            marginBottom: 40,
            transform: `scale(${pop(0)})`,
          }}
        />
        {line("¿QUERÉS", 2, 130)}
        {line("CONOCERLO?", 8, 130, YELLOW)}
        <div style={{ height: 50 }} />
        {line("ESCRIBINOS AL", 18, 72)}
        <div
          style={{
            marginTop: 16,
            padding: "26px 50px",
            borderRadius: 999,
            background: WHATSAPP,
            fontSize: 64,
            fontWeight: 900,
            transform: `scale(${pop(24) * (1 + 0.05 * Math.sin(Math.max(0, frame - 34) / 3))})`,
            boxShadow: "0 12px 40px rgba(37,211,102,0.5)",
          }}
        >
          WhatsApp <span style={{ color: YELLOW }}>+503 6207-3860</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const last = [...FLASHES].reverse().find((f) => f <= frame);
  if (last === undefined || frame - last > 3) return null;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        opacity: interpolate(frame - last, [0, 3], [0.9, 0]),
      }}
    />
  );
};

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: 12,
        width: `${(frame / (durationInFrames - 1)) * 100}%`,
        background: YELLOW,
      }}
    />
  );
};

export const Tour: React.FC = () => {
  const frame = useCurrentFrame();
  const inverted = INVERTS.some((f) => frame >= f && frame < f + 3);
  const { x, y } = shake(frame);
  const b1 = SHOTS[5];
  const b2 = SHOTS[6];

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${x}px, ${y}px) scale(${x || y ? 1.04 : 1})`,
          filter: inverted ? "invert(1) contrast(1.2)" : undefined,
        }}
      >
        {SEGMENTS.map((seg) => (
          <Sequence key={seg.src} from={seg.out} durationInFrames={seg.len}>
            <ARoll seg={seg} />
          </Sequence>
        ))}
        <Sequence from={b1.from} durationInFrames={b2.from - b1.from}>
          <BRoll
            len={b2.from - b1.from}
            trimBefore={0}
            scale={[1.8, 1.95]}
            fx={[260, 760]}
            fy={[480, 480]}
          />
        </Sequence>
        <Sequence from={b2.from} durationInFrames={SHOTS[7].from - b2.from}>
          <BRoll
            len={SHOTS[7].from - b2.from}
            trimBefore={60}
            scale={[2.3, 2.7]}
            fx={[300, 300]}
            fy={[470, 430]}
          >
            <LocationPin />
          </BRoll>
        </Sequence>
        <Sequence from={TALK_END}>
          <Outro />
        </Sequence>
        <Captions />
      </AbsoluteFill>
      <Flash />
      <ProgressBar />

      {SEGMENTS.map((seg) => (
        <Sequence key={`a${seg.src}`} from={seg.out} durationInFrames={seg.len}>
          <Audio src={staticFile("tour.mp4")} trimBefore={seg.src} />
        </Sequence>
      ))}
      {HITS.map((f) => (
        <Sequence key={`h${f}`} from={f}>
          <Audio src={staticFile("sfx/hit.wav")} volume={0.7} />
        </Sequence>
      ))}
      {WHOOSHES.map((f) => (
        <Sequence key={`w${f}`} from={f}>
          <Audio src={staticFile("sfx/whoosh.wav")} volume={0.45} />
        </Sequence>
      ))}
      {CAPTIONS.filter((c) => c.color && c.group).map((c) => (
        <Sequence key={`p${c.at}`} from={c.at}>
          <Audio src={staticFile("sfx/pop.wav")} volume={0.35} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
