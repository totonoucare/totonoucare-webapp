// components/illust/core/index.js

const CORE_IMAGE_SRC = {
  accel_batt_small: "/illust/core/cheetah.webp",
  accel_batt_standard: "/illust/core/wolf.webp",
  accel_batt_large: "/illust/core/orca.webp",

  brake_batt_small: "/illust/core/hedgehog.webp",
  brake_batt_standard: "/illust/core/penguin.webp",
  brake_batt_large: "/illust/core/elephant.webp",
};

function CoreFallback({ className = "h-20 w-32", title }) {
  return (
    <div
      className={[
        "grid place-items-center overflow-hidden rounded-[18px]",
        "bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]",
        "ring-1 ring-inset ring-black/5",
        className,
      ].join(" ")}
      aria-label={title || "体質イラスト"}
      title={title || "体質イラスト"}
    >
      <div className="px-3 text-center text-[10px] font-black tracking-wide text-slate-400">
        IMAGE
      </div>
    </div>
  );
}

export function CoreIllust({ code, className = "h-20 w-32", title }) {
  const src = CORE_IMAGE_SRC[code];

  if (!src) {
    return <CoreFallback className={className} title={title} />;
  }

  return (
    <div
      className={["overflow-hidden", className].join(" ")}
      title={title || code}
      aria-label={title || code}
    >
      <img
        src={src}
        alt={title || code}
        className="h-full w-full object-contain"
        loading="lazy"
      />
    </div>
  );
}
