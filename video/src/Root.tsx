import { Composition } from "remotion";
import { Reel, REEL_DURATION, REEL_FPS } from "./Reel";

// Reel vertical de 15 s para Instagram / TikTok:
// npx remotion render NextLevelReel out/reel.mp4

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="NextLevelReel"
      component={Reel}
      durationInFrames={REEL_DURATION}
      fps={REEL_FPS}
      width={1080}
      height={1920}
    />
  );
};
