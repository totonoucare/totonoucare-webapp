import HeroScene from "@/components/illust/home/HeroScene";
import HeroGuideBot from "@/components/illust/home/HeroGuideBot";
import { HeroRiskCard, HeroCareCard } from "@/components/illust/home/HeroMiniCards";

export default function HeroMain() {
  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <HeroScene className="h-[320px] w-full" />

      <div className="absolute left-4 top-3 w-[206px] sm:w-[214px]">
        <HeroRiskCard />
      </div>

      <div className="absolute right-4 top-[164px] w-[182px] sm:w-[188px]">
        <HeroCareCard />
      </div>

      <div className="absolute bottom-0 right-2">
        <HeroGuideBot className="h-[148px] w-[126px]" />
      </div>
    </div>
  );
}
