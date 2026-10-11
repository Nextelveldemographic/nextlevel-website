# Reel NextLevel (Remotion)

Reel vertical de 15 s (1080x1920, 30 fps) para Instagram / TikTok.

```
npm install
npm run dev                                          # vista previa en el navegador
npx remotion render NextLevelReel out/reel.mp4       # exportar MP4
```

- Escenas y textos: `src/Reel.tsx` (gancho, clip, proyectos, cierre con WhatsApp).
- Clip grabado: `public/clip.mp4` (convertido a H.264; el .mov original de iPhone usa HEVC, que Chrome no reproduce).
- Fotos: `public/projects/`, logo: `public/logo.png`, fuente Inter: `public/fonts/`.
