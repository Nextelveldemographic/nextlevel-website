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
