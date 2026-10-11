import { Composition } from "remotion";
import { Reel, REEL_DURATION, REEL_FPS } from "./Reel";
import { Tour, TOUR_DURATION, TOUR_FPS } from "./Tour";
import { Corporate, CORP_DURATION } from "./Corporate";

// Reel vertical de 15 s para Instagram / TikTok:
// npx remotion render NextLevelReel out/reel.mp4

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="NextLevelReel"
        component={Reel}
        durationInFrames={REEL_DURATION}
        fps={REEL_FPS}
        width={1080}
        height={1920}
      />
      {/* TikTok alta retención: npx remotion render NextLevelTour out/tour.mp4 */}
      <Composition
        id="NextLevelTour"
        component={Tour}
        durationInFrames={TOUR_DURATION}
        fps={TOUR_FPS}
        width={1080}
        height={1920}
      />
      {/* Versión corporativa del mismo corte: npx remotion render NextLevelCorporate out/corporate.mp4 */}
      <Composition
        id="NextLevelCorporate"
        component={Corporate}
        durationInFrames={CORP_DURATION}
        fps={TOUR_FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
