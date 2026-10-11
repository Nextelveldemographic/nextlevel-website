# Videos NextLevel (Remotion)

- `NextLevelReel`: reel vertical de 15 s (1080x1920, 30 fps) para Instagram / TikTok.
- `NextLevelTour`: TikTok de ~10 s estilo alta retención (jump cuts, subtítulos palabra por palabra, flashes, negativos, B-roll y texto detrás de la persona).

```
npm install
npm run dev                                          # vista previa en el navegador
npx remotion render NextLevelReel out/reel.mp4       # exportar MP4
npx remotion render NextLevelTour out/tour.mp4
```

- Escenas y textos: `src/Reel.tsx` (gancho, clip, proyectos, cierre con WhatsApp).
- Clip grabado: `public/clip.mp4` (convertido a H.264; el .mov original de iPhone usa HEVC, que Chrome no reproduce).
- Fotos: `public/projects/`, logo: `public/logo.png`, fuente Inter: `public/fonts/`.

## NextLevelTour

- Subtítulos, tiempos por palabra, colores y encuadres: `WORDS` y `SHOTS` en `src/Tour.tsx`.
- `public/tour.mp4`: IMG_0776 a 30 fps, H.264, audio limpiado y normalizado a -14 LUFS.
- `public/tour-matte.webm`: recorte de la persona (rotoscopia con MediaPipe, VP9 con transparencia) de la zona x=100 y=600 de 760x960, con el mismo timing que `tour.mp4`.
- `public/sfx/`: whoosh, golpe y pop generados con ffmpeg (sin licencias de terceros).

## NextLevelCorporate

- Misma línea de tiempo y material que `NextLevelTour`, con tono sobrio: encuadre estable, fundidos en los cortes, subtítulos por frase con acentos en azul (paleta del sitio) y cierre con "Hablemos por WhatsApp".
- Textos en `LINES` dentro de `src/Corporate.tsx`. Antes de publicar, confirmar "Puerto Rico" y "Santa Laja".
- Render: `npx remotion render NextLevelCorporate out/corporate.mp4`

## NextLevelZoom

- Corte de 7,5 s: sin silencios, con zoom por toma (115 % / 130 % / 110 % / 140 % con arranque rápido), subtítulos Montserrat ExtraBold palabra por palabra con pop-in, sombra negra al 80 % y flash blanco al 50 % en "ZITALÁ".
- Textos, tiempos de palabra y tomas en `src/Zoom.tsx`. Revisar "Slideographic" y "Zitalá House" contra el audio antes de publicar.
- Montserrat (OFL) en `public/fonts/`. Sin música de fondo: no hay una pista con licencia en el entorno.

## NextLevelZoomV2

- Segunda versión del mismo encargo, rehecha desde cero: 6,6 s, la voz entra en el primer cuadro y no queda ningún hueco de 80 ms o más en el audio.
- Cortes (segundos del original): 0,56–2,20 · 3,03–7,50 · 8,27–8,72. El "Ehh…" (9,2–10,1 s) queda fuera.
- Zoom centrado en el rostro sin bordes negros, sombra paralela dura al 80 %, "ZITALÁ HOUSE" en rojo y pop sutil en cada palabra resaltada.
- Textos, tiempos y tomas en `src/ZoomV2.tsx`. Revisar "Slideographic" y "Zitalá House" antes de publicar.
- Render: `npx remotion render NextLevelZoomV2 out/zoom-v2.mp4`
