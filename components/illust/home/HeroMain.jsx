import HeroScene from "@/components/illust/home/HeroScene";
import HeroGuideBot from "@/components/illust/home/HeroGuideBot";
import { HeroRiskCard, HeroCareCard } from "@/components/illust/home/HeroMiniCards";

export default function HeroMain() {
  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <HeroScene className="h-[320px] w-full" />

      <div className="absolute left-3 top-4 w-[212px] sm:left-2 sm:w-[224px]">
        <HeroRiskCard />
      </div>

      <div className="absolute right-3 top-[144px] w-[176px] sm:w-[188px]">
        <HeroCareCard />
      </div>

      <div className="absolute bottom-2 right-2">
        <HeroGuideBot className="h-[122px] w-[104px]" />
      </div>
    </div>
  );
}
