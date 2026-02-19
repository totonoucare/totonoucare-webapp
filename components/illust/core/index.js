import CoreDefault from "./CoreDefault";
import CoreShortTerm from "./CoreShortTerm";
import CoreActive from "./CoreActive";
import CoreTough from "./CoreTough";

import CoreSteadySmall from "./CoreSteadySmall";
import CoreBalance from "./CoreBalance";
import CoreLongRun from "./CoreLongRun";

import CoreSlowStart from "./CoreSlowStart";
import CoreMyPace from "./CoreMyPace";
import CoreSolid from "./CoreSolid";

/**
 * computed.core_code -> illustration component
 */
export const CORE_ILLUST = {
  accel_batt_small: CoreShortTerm,
  accel_batt_standard: CoreActive,
  accel_batt_large: CoreTough,

  steady_batt_small: CoreSteadySmall,
  steady_batt_standard: CoreBalance,
  steady_batt_large: CoreLongRun,

  brake_batt_small: CoreSlowStart,
  brake_batt_standard: CoreMyPace,
  brake_batt_large: CoreSolid,
};

export function CoreIllust({ code, className = "h-20 w-32", title }) {
  const Comp = CORE_ILLUST[code] || CoreDefault;
  return <Comp className={className} title={title} />;
}
