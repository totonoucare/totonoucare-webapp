// components/illust/sub/index.js
import SubQiStagnation from "./SubQiStagnation";
import SubQiDeficiency from "./SubQiDeficiency";
import SubBloodDeficiency from "./SubBloodDeficiency";
import SubBloodStasis from "./SubBloodStasis";
import SubFluidDamp from "./SubFluidDamp";
import SubFluidDeficiency from "./SubFluidDeficiency";
import SubDefault from "./SubDefault";

const MAP = {
  qi_stagnation: SubQiStagnation,
  qi_deficiency: SubQiDeficiency,
  blood_deficiency: SubBloodDeficiency,
  blood_stasis: SubBloodStasis,
  fluid_damp: SubFluidDamp,
  fluid_deficiency: SubFluidDeficiency,
};

const SIZE_CLASS = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-14 w-14",
};

export function SubIllust({ code, size = "sm", className = "", title, ...props }) {
  const Comp = MAP[code] || SubDefault;
  const base = SIZE_CLASS[size] || SIZE_CLASS.sm;
  return <Comp className={`${base} ${className}`} title={title} {...props} />;
}
