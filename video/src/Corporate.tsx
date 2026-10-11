import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { fontFamily } from "./font";
import { SEGMENTS, TALK_END, srcToOut } from "./Tour";

// Versión corporativa del TikTok: mismo material y misma línea de tiempo que
// NextLevelTour, pero con encuadre estable, fundidos en lugar de destellos,
// subtítulos por frase y la paleta del sitio (grises + azul). Sin negativos,
// sin sacudidas ni efectos de sonido.

const OUTRO_LEN = 90;
export const CORP_DURATION = TALK_END + OUTRO_LEN;

const INK = "#1D1D1F";
const PAPER = "#F5F5F7";
const GREY = "#A1A1A6";
const BLUE = "#2997FF";
const BLUE_BTN = "#0071E3";
const WHATSAPP_TEXT = "+503 6207-3860";

// Subtítulos por frase (segundos del clip original). Las palabras de `accent`
// van en azul. Revisar "Puerto Rico" y "Santa Laja" antes de publicar: la
// transcripción automática no las confirmó.
const LINES = [
  {
    t: 1.15,
    text: "Hola, amigos de Next Level de Puerto Rico.",
    accent: "Next Level",
  },
  {
    t: 3.2,
    text: "Hoy nos encontramos acá en Santa Laja,",
    accent: "Santa Laja",
  },
  {
    t: 5.32,
    text: "una torre de apartamentos ubicada en Escalón Norte.",
    accent: "Escalón Norte",
  },
];
const CAPTIONS = LINES.map((l, i) => ({
  ...l,
  start: srcToOut(l.t),
  end: i + 1 < LINES.length ? srcToOut(LINES[i + 1].t) : TALK_END,
}));

// Encuadre medio, centrado en la persona, con espacio para subtítulos y la
// interfaz de TikTok. (FX, FY) del cuadro original queda en (540, TARGET_Y).
const FX = 420;
const FY = 1100;
const TARGET_Y = 840;
const framing = (s: number) =>
  `translate(${540 - FX * s}px, ${TARGET_Y - FY * s}px) scale(${s})`;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const BROLL_FROM = srcToOut(6.54);

// Entrada de cada tramo con un fundido corto: el corte se percibe como
// transición limpia, no como golpe.
const TalkSegment: React.FC<{
  seg: (typeof SEGMENTS)[number];
  index: number;
}> = ({ seg, index }) => {
  const local = useCurrentFrame();
  const g = seg.out + local;
  const s = interpolate(g, [0, TALK_END], [1.3, 1.38], clamp);
  const fade = index === 0 ? 1 : interpolate(local, [0, 8], [0, 1], clamp);
  const wordmark = interpolate(local, [14, 44], [0, 0.9], clamp);

  return (
    <AbsoluteFill style={{ opacity: fade, backgroundColor: INK }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1080,
          height: 1920,
          transformOrigin: "0 0",
          transform: framing(s),
        }}
      >
        <OffthreadVideo
          src={staticFile("tour.mp4")}
          trimBefore={seg.src}
          muted
          style={{ position: "absolute", width: 1080, height: 1920 }}
        />
      </div>

      {index === 0 ? (
        // Marca detrás de la persona: el recorte (matte) la separa del fondo
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 430,
            textAlign: "center",
            fontFamily,
            fontWeight: 700,
            fontSize: 165,
            letterSpacing: -4,
            color: PAPER,
            opacity: wordmark,
          }}
        >
          Next Level
        </div>
      ) : null}

      {index === 0 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1080,
            height: 1920,
            transformOrigin: "0 0",
            transform: framing(s),
          }}
        >
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
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// Un solo B-roll, con fundido, mientras la voz sigue: la vista desde la ventana
const BRoll: React.FC = () => {
  const frame = useCurrentFrame();
  const len = TALK_END - BROLL_FROM;
  const opacity = interpolate(
    frame,
    [0, 10, len - 10, len],
    [0, 1, 1, 0],
    clamp,
  );
  const scale = interpolate(frame, [0, len], [1.06, 1.14], clamp);
  return (
    <AbsoluteFill style={{ opacity, backgroundColor: INK }}>
      <OffthreadVideo
        src={staticFile("clip.mp4")}
        trimBefore={60}
        muted
        style={{
          width: 1080,
          height: 1920,
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(29,29,31,0) 50%, rgba(29,29,31,0.55) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

const Brand: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        top: 200,
        display: "flex",
        alignItems: "center",
        gap: 20,
        fontFamily,
        fontWeight: 600,
        fontSize: 34,
        color: PAPER,
        opacity,
      }}
    >
      <Img src={staticFile("logo.png")} style={{ width: 96, height: "auto" }} />
      <div>Next Level Demographic</div>
    </div>
  );
};

const Caption: React.FC = () => {
  const frame = useCurrentFrame();
  const line = CAPTIONS.find((c) => frame >= c.start && frame < c.end);
  if (!line) return null;

  const local = frame - line.start;
  const opacity = Math.min(
    interpolate(local, [0, 10], [0, 1], clamp),
    interpolate(frame, [line.end - 8, line.end], [1, 0], clamp),
  );
  const y = interpolate(local, [0, 12], [14, 0], clamp);

  const [before, after] = line.text.split(line.accent);
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 120,
        top: 1290,
        display: "flex",
        justifyContent: "center",
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          background: "rgba(29,29,31,0.78)",
          borderRadius: 28,
          padding: "30px 44px",
          fontFamily,
          fontWeight: 600,
          fontSize: 56,
          lineHeight: 1.28,
          color: PAPER,
          textAlign: "center",
        }}
      >
        {before}
        {after === undefined ? null : (
          <>
            <span style={{ color: BLUE, fontWeight: 700 }}>{line.accent}</span>
            {after}
          </>
        )}
      </div>
    </div>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = (delay: number) => ({
    opacity: interpolate(frame, [delay, delay + 14], [0, 1], clamp),
    transform: `translateY(${interpolate(frame, [delay, delay + 14], [24, 0], clamp)}px)`,
  });
  const fadeIn = interpolate(frame, [0, 12], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ opacity: fadeIn, backgroundColor: INK }}>
      <AbsoluteFill
        style={{
          filter: "blur(18px) brightness(0.35)",
          transform: "scale(1.1)",
        }}
      >
        <OffthreadVideo
          src={staticFile("clip.mp4")}
          trimBefore={30}
          muted
          style={{ width: 1080, height: 1920, objectFit: "cover" }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(29,29,31,0.6)" }} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          fontFamily,
          color: PAPER,
        }}
      >
        <Img
          src={staticFile("logo.png")}
          style={{ width: 170, height: "auto", marginBottom: 36, ...enter(0) }}
        />
        <div
          style={{
            fontSize: 66,
            fontWeight: 700,
            letterSpacing: -1,
            ...enter(6),
          }}
        >
          Next Level Demographic
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 42,
            fontWeight: 500,
            color: GREY,
            ...enter(14),
          }}
        >
          Volvé. El país ya está listo.
        </div>
        <div
          style={{
            marginTop: 64,
            padding: "26px 56px",
            borderRadius: 999,
            background: BLUE_BTN,
            color: "white",
            fontSize: 44,
            fontWeight: 600,
            ...enter(24),
          }}
        >
          Hablemos por WhatsApp
        </div>
        <div
          style={{
            marginTop: 26,
            fontSize: 40,
            fontWeight: 500,
            color: GREY,
            ...enter(32),
          }}
        >
          {WHATSAPP_TEXT}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Corporate: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      {SEGMENTS.map((seg, i) => (
        <Sequence key={seg.src} from={seg.out} durationInFrames={seg.len}>
          <TalkSegment seg={seg} index={i} />
        </Sequence>
      ))}
      <Sequence from={BROLL_FROM} durationInFrames={TALK_END - BROLL_FROM}>
        <BRoll />
      </Sequence>
      <Sequence from={TALK_END} durationInFrames={OUTRO_LEN}>
        <Outro />
      </Sequence>
      <Sequence durationInFrames={TALK_END}>
        <Brand />
        <Caption />
      </Sequence>
      {SEGMENTS.map((seg) => (
        <Sequence key={`a${seg.src}`} from={seg.out} durationInFrames={seg.len}>
          <Audio src={staticFile("tour.mp4")} trimBefore={seg.src} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
