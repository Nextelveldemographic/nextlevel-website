import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// Inter (fuente del sitio), incluida en public/ para renderizar sin internet
const fontFamily = "Inter";
const fontHandle = delayRender("Cargando Inter");
const inter = new FontFace(
  fontFamily,
  `url(${staticFile("fonts/Inter-latin.woff2")}) format("woff2")`,
  { weight: "100 900" },
);
inter
  .load()
  .then(() => {
    document.fonts.add(inter);
    continueRender(fontHandle);
  })
  .catch((err) => console.error(err));

// Colores del sitio (index.html)
const BLUE = "#2997FF";
const WHATSAPP = "#25D366";
// Fondo exacto de assets/logo.png, para que el logo no se vea como un recuadro
const LOGO_BG = "#16191F";

// Línea de tiempo (30 fps, 450 frames = 15 s)
export const REEL_FPS = 30;
export const REEL_DURATION = 450;
const HOOK = { from: 0, len: 54 };
const CLIP = { from: 54, len: 158 };
const MONTAGE = { from: 212, len: 168 };
const OUTRO = { from: 380, len: 70 };

const HOOK_PHOTOS = ["tunco", "volcan", "fonseca"];
const MONTAGE_PHOTOS = [
  { file: "escalon", name: "Condominio Montecarlo Escalón" },
  { file: "ruta-flores", name: "Hacienda Ruta de las Flores" },
  { file: "suchitoto", name: "Villas Coloniales Suchitoto" },
  { file: "pacifico", name: "Residencial Costa del Pacífico" },
  { file: "izalco", name: "Condominio Vista Izalco" },
  { file: "santa-tecla", name: "Parque Residencial Santa Tecla" },
];

const textShadow = "0 4px 24px rgba(0,0,0,0.55)";

// Destello blanco corto al inicio de cada corte
const Flash: React.FC<{ frames?: number }> = ({ frames = 5 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, frames], [0.85, 0], {
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ backgroundColor: "white", opacity }} />;
};

// Foto horizontal recortada a vertical, con zoom y paneo
const KenBurns: React.FC<{
  src: string;
  len: number;
  zoomFrom?: number;
  zoomTo?: number;
  panFrom?: number;
  panTo?: number;
}> = ({ src, len, zoomFrom = 1.2, zoomTo = 1.05, panFrom = 0, panTo = 0 }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, len], [0, 1], {
    extrapolateRight: "clamp",
  });
  const scale = interpolate(t, [0, 1], [zoomFrom, zoomTo]);
  const x = interpolate(t, [0, 1], [panFrom, panTo]);
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "black" }}>
      <Img
        src={staticFile(`projects/${src}.jpg`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${x}%)`,
        }}
      />
    </AbsoluteFill>
  );
};

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const per = HOOK.len / HOOK_PHOTOS.length;

  const big = spring({ frame, fps, config: { damping: 11, stiffness: 180 } });
  const sub = spring({
    frame: frame - 16,
    fps,
    config: { damping: 14, stiffness: 160 },
  });

  return (
    <AbsoluteFill>
      {HOOK_PHOTOS.map((p, i) => (
        <Sequence
          key={p}
          from={Math.round(i * per)}
          durationInFrames={Math.round(per)}
        >
          <KenBurns src={p} len={per} zoomFrom={1.35} zoomTo={1.1} />
          <Flash />
        </Sequence>
      ))}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          fontFamily,
          color: "white",
          textAlign: "center",
          padding: 80,
        }}
      >
        <div
          style={{
            fontSize: 260,
            fontWeight: 900,
            letterSpacing: -8,
            lineHeight: 1,
            transform: `scale(${interpolate(big, [0, 1], [2.2, 1])})`,
            opacity: big,
            textShadow,
          }}
        >
          Volvé.
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1.1,
            transform: `translateY(${interpolate(sub, [0, 1], [60, 0])}px)`,
            opacity: sub,
            textShadow,
          }}
        >
          El país{" "}
          <span
            style={{
              background: BLUE,
              padding: "0 18px",
              borderRadius: 14,
              textShadow: "none",
            }}
          >
            ya está listo.
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const ClipScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = interpolate(frame, [0, CLIP.len], [1, 1.08]);

  const badge = spring({ frame: frame - 6, fps, config: { damping: 14 } });
  const words = "Retirate donde nacieron tus recuerdos.".split(" ");

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <OffthreadVideo
          src={staticFile("clip.mp4")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)",
        }}
      />
      <Flash frames={6} />
      <AbsoluteFill
        style={{ fontFamily, color: "white", alignItems: "center" }}
      >
        <div
          style={{
            marginTop: 260,
            padding: "18px 40px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.18)",
            border: "2px solid rgba(255,255,255,0.5)",
            backdropFilter: "blur(10px)",
            fontSize: 44,
            fontWeight: 700,
            opacity: badge,
            transform: `translateY(${interpolate(badge, [0, 1], [-40, 0])}px)`,
          }}
        >
          Para la diáspora salvadoreña
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 420,
            left: 80,
            right: 80,
            fontSize: 92,
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: -2,
            textShadow,
          }}
        >
          {words.map((w, i) => {
            const s = spring({
              frame: frame - 30 - i * 6,
              fps,
              config: { damping: 13, stiffness: 170 },
            });
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  marginRight: 20,
                  marginBottom: 12,
                  opacity: s,
                  transform: `translateY(${interpolate(s, [0, 1], [50, 0])}px)`,
                  ...(i >= 3
                    ? {
                        background: BLUE,
                        padding: "0 16px",
                        borderRadius: 12,
                        textShadow: "none",
                      }
                    : {}),
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const ProjectSlide: React.FC<{
  file: string;
  name: string;
  index: number;
  len: number;
}> = ({ file, name, index, len }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dir = index % 2 === 0 ? 1 : -1;
  const label = spring({
    frame: frame - 3,
    fps,
    config: { damping: 14, stiffness: 200 },
  });

  return (
    <AbsoluteFill>
      <KenBurns
        src={file}
        len={len}
        zoomFrom={1.15}
        zoomTo={1.02}
        panFrom={-8 * dir}
        panTo={8 * dir}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.7) 100%)",
        }}
      />
      <Flash frames={4} />
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 420,
          fontFamily,
          color: "white",
          opacity: label,
          transform: `translateX(${interpolate(label, [0, 1], [-80, 0])}px)`,
        }}
      >
        <div
          style={{
            width: 90,
            height: 10,
            background: BLUE,
            borderRadius: 5,
            marginBottom: 24,
          }}
        />
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.05,
            textShadow,
          }}
        >
          {name}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Montage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const per = MONTAGE.len / MONTAGE_PHOTOS.length;
  const head = spring({ frame, fps, config: { damping: 14 } });
  const current = Math.min(MONTAGE_PHOTOS.length, Math.floor(frame / per) + 1);

  return (
    <AbsoluteFill>
      {MONTAGE_PHOTOS.map((p, i) => (
        <Sequence
          key={p.file}
          from={Math.round(i * per)}
          durationInFrames={Math.round(per)}
        >
          <ProjectSlide file={p.file} name={p.name} index={i} len={per} />
        </Sequence>
      ))}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 30%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 230,
          left: 80,
          right: 80,
          fontFamily,
          color: "white",
          opacity: head,
          textShadow,
        }}
      >
        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: 4,
            marginBottom: 8,
          }}
        >
          {String(current).padStart(2, "0")} /{" "}
          {String(MONTAGE_PHOTOS.length).padStart(2, "0")}
        </div>
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -2,
          }}
        >
          Tu próximo hogar
          <br />
          ya existe.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame, fps, config: { damping: 10, stiffness: 150 } });
  const t1 = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const cta = spring({
    frame: frame - 18,
    fps,
    config: { damping: 9, stiffness: 160 },
  });
  const pulse = 1 + 0.04 * Math.sin(Math.max(0, frame - 30) / 4);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: LOGO_BG,
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        color: "white",
        textAlign: "center",
      }}
    >
      <Flash frames={6} />
      <Img
        src={staticFile("logo.png")}
        style={{
          width: 300,
          transform: `scale(${logo})`,
          opacity: logo,
        }}
      />
      <div
        style={{
          marginTop: 30,
          fontSize: 76,
          fontWeight: 900,
          letterSpacing: -2,
          opacity: t1,
          transform: `translateY(${interpolate(t1, [0, 1], [30, 0])}px)`,
        }}
      >
        Next Level Demographic
      </div>
      <div
        style={{
          marginTop: 18,
          fontSize: 42,
          fontWeight: 500,
          color: "rgba(255,255,255,0.75)",
          opacity: t1,
          padding: "0 70px",
          lineHeight: 1.25,
        }}
      >
        Nos encargamos de todo.
        <br />
        Sin costo para vos.
      </div>
      <div
        style={{
          marginTop: 70,
          padding: "30px 56px",
          borderRadius: 999,
          background: WHATSAPP,
          color: "white",
          fontSize: 54,
          fontWeight: 800,
          opacity: cta,
          transform: `scale(${cta * pulse})`,
          boxShadow: "0 12px 40px rgba(37,211,102,0.45)",
        }}
      >
        WhatsApp +503 6207-3860
      </div>
    </AbsoluteFill>
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
        height: 10,
        width: `${(frame / (durationInFrames - 1)) * 100}%`,
        background: BLUE,
      }}
    />
  );
};

export const Reel: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Sequence from={HOOK.from} durationInFrames={HOOK.len}>
        <Hook />
      </Sequence>
      <Sequence from={CLIP.from} durationInFrames={CLIP.len}>
        <ClipScene />
      </Sequence>
      <Sequence from={MONTAGE.from} durationInFrames={MONTAGE.len}>
        <Montage />
      </Sequence>
      <Sequence from={OUTRO.from} durationInFrames={OUTRO.len}>
        <Outro />
      </Sequence>
      <ProgressBar />
    </AbsoluteFill>
  );
};
