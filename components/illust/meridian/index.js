import MeridianDefault from "./MeridianDefault";
import MeridianKidneyBL from "./MeridianKidneyBL";
import MeridianLiverGB from "./MeridianLiverGB";
import MeridianSpleenST from "./MeridianSpleenST";
import MeridianLungLI from "./MeridianLungLI";
import MeridianHeartSI from "./MeridianHeartSI";
import MeridianPcSj from "./MeridianPcSj";

const MAP = {
  kidney_bl: MeridianKidneyBL,
  liver_gb: MeridianLiverGB,
  spleen_st: MeridianSpleenST,
  lung_li: MeridianLungLI,
  heart_si: MeridianHeartSI,
  pc_sj: MeridianPcSj,
};

const SIZE_CLASS = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

export function MeridianIllust({ code, size = "md", className = "", title, ...props }) {
  const Comp = MAP[code] || MeridianDefault;
  const base = SIZE_CLASS[size] || SIZE_CLASS.md;
  return <Comp className={`${base} ${className}`} title={title} {...props} />;
}
