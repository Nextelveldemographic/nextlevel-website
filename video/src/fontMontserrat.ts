import { continueRender, delayRender, staticFile } from "remotion";

// Montserrat ExtraBold (OFL), incluida en public/ para renderizar sin internet
export const MONTSERRAT = "Montserrat";

const handle = delayRender("Cargando Montserrat");
const face = new FontFace(
  MONTSERRAT,
  `url(${staticFile("fonts/Montserrat-800-latin.woff2")}) format("woff2")`,
  { weight: "800" },
);
face
  .load()
  .then(() => {
    document.fonts.add(face);
    continueRender(handle);
  })
  .catch((err) => console.error(err));
