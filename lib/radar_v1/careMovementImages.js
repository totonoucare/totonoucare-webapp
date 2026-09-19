// Generated warm line illustrations. SVG is retained for legacy or unknown IDs.
const GENERATED_IMAGES = {
  "line-heart-si-little-finger-stroke": {
    "src": "/care-movements/line-heart-si-little-finger-stroke.webp",
    "width": 1536,
    "height": 1024
  },
  "line-heart-si-scapula-contact": {
    "src": "/care-movements/line-heart-si-scapula-contact.webp",
    "width": 1536,
    "height": 1024
  },
  "line-heart-si-shoulder-roll": {
    "src": "/care-movements/line-heart-si-shoulder-roll.webp",
    "width": 1536,
    "height": 1024
  },
  "line-kidney-bl-calf-stroke": {
    "src": "/care-movements/line-kidney-bl-calf-stroke.webp",
    "width": 1536,
    "height": 1024
  },
  "line-kidney-bl-low-back-contact": {
    "src": "/care-movements/line-kidney-bl-low-back-contact.webp",
    "width": 1536,
    "height": 1024
  },
  "line-kidney-bl-toe-lift": {
    "src": "/care-movements/line-kidney-bl-toe-lift.webp",
    "width": 1536,
    "height": 1024
  },
  "line-liver-gb-outer-thigh-stroke": {
    "src": "/care-movements/line-liver-gb-outer-thigh-stroke.webp",
    "width": 1536,
    "height": 1024
  },
  "line-liver-gb-side-bend": {
    "src": "/care-movements/line-liver-gb-side-bend.webp",
    "width": 1536,
    "height": 1024
  },
  "line-liver-gb-side-breath": {
    "src": "/care-movements/line-liver-gb-side-breath.webp",
    "width": 1536,
    "height": 1024
  },
  "line-lung-li-chest-breath": {
    "src": "/care-movements/line-lung-li-chest-breath.webp",
    "width": 1536,
    "height": 1024
  },
  "line-lung-li-clavicle-stroke": {
    "src": "/care-movements/line-lung-li-clavicle-stroke.webp",
    "width": 1536,
    "height": 1024
  },
  "line-lung-li-thumb-forearm-stroke": {
    "src": "/care-movements/line-lung-li-thumb-forearm-stroke.webp",
    "width": 1536,
    "height": 1024
  },
  "line-pc-sj-inner-forearm-stroke": {
    "src": "/care-movements/line-pc-sj-inner-forearm-stroke.webp",
    "width": 1254,
    "height": 1254
  },
  "line-pc-sj-outer-forearm-stroke": {
    "src": "/care-movements/line-pc-sj-outer-forearm-stroke.webp",
    "width": 1536,
    "height": 1024
  },
  "line-pc-sj-wrist-circle": {
    "src": "/care-movements/line-pc-sj-wrist-circle.webp",
    "width": 1536,
    "height": 1024
  },
  "line-spleen-st-abdominal-breath": {
    "src": "/care-movements/line-spleen-st-abdominal-breath.webp",
    "width": 1536,
    "height": 1024
  },
  "line-spleen-st-knee-extension": {
    "src": "/care-movements/line-spleen-st-knee-extension.webp",
    "width": 1536,
    "height": 1024
  },
  "line-spleen-st-shin-stroke": {
    "src": "/care-movements/line-spleen-st-shin-stroke.webp",
    "width": 1536,
    "height": 1024
  }
};

export function getCareMovementImage(id) {
  return GENERATED_IMAGES[id] || { src: `/care-movements/${id}.svg`, width: 480, height: 300 };
}
