import HeroScene from "@/components/illust/home/HeroScene";
import HeroGuideBot from "@/components/illust/home/HeroGuideBot";
import { HeroRiskCard, HeroCareCard } from "@/components/illust/home/HeroMiniCards";

export default function HeroMain() {
  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <HeroScene className="h-[324px] w-full" />

      <div className="absolute left-3 top-4 w-[220px] sm:w-[230px]">
        <HeroRiskCard />
      </div>

      <div className="absolute right-3 top-[150px] w-[188px] sm:w-[194px]">
        <HeroCareCard />
      </div>

      <div className="absolute bottom-1 right-1">
        <HeroGuideBot className="h-[138px] w-[118px]" />
      </div>
    </div>
  );
}
