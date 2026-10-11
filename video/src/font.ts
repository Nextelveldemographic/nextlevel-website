import { continueRender, delayRender, staticFile } from "remotion";

// Inter (fuente del sitio), incluida en public/ para renderizar sin internet
export const fontFamily = "Inter";

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
