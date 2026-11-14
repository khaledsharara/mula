/**
 * Icons you can give a category or account, grouped so the picker can filter them.
 * Every name here must also be in iconSet.ts (tests/logic/icons.test.ts checks this).
 */
export type IconGroup = { key: string; label: string; icons: string[] };

export const ICON_GROUPS: IconGroup[] = [
  {
    key: 'food',
    label: 'Food',
    icons: [
      'utensils', 'utensils-crossed', 'chef-hat', 'cooking-pot', 'coffee', 'cup-soda', 'glass-water', 'milk', 'beer',
      'wine', 'martini', 'pizza', 'sandwich', 'hamburger', 'salad', 'soup', 'egg-fried', 'beef', 'drumstick', 'fish',
      'croissant', 'cookie', 'cake', 'cake-slice', 'donut', 'dessert', 'ice-cream-cone', 'popsicle', 'candy',
      'lollipop', 'popcorn', 'apple', 'cherry', 'grape', 'banana', 'citrus', 'carrot', 'wheat', 'vegan',
      'shopping-basket',
    ],
  },
  {
    key: 'shopping',
    label: 'Shopping',
    icons: [
      'shopping-bag', 'shopping-cart', 'shopping-basket', 'store', 'handbag', 'tag', 'tags', 'receipt', 'barcode',
      'scan-barcode', 'ticket-percent', 'percent', 'gift', 'shirt', 'glasses', 'watch', 'gem', 'crown', 'scissors',
      'sparkles', 'spray-can', 'package', 'package-open', 'truck', 'backpack', 'umbrella', 'baby', 'pill',
      'pencil-ruler', 'smartphone',
    ],
  },
  {
    key: 'home',
    label: 'Home & bills',
    icons: [
      'house', 'building', 'building-complex', 'key-round', 'door-open', 'sofa', 'armchair', 'bed-double', 'bath',
      'shower-head', 'lamp', 'lightbulb', 'plug', 'zap', 'flame', 'droplet', 'droplets', 'thermometer', 'fan',
      'air-vent', 'washing-machine', 'refrigerator', 'microwave', 'wrench', 'hammer', 'drill', 'paint-roller',
      'paintbrush', 'trash', 'recycle', 'wifi', 'router', 'phone', 'tv', 'concierge-bell', 'shield', 'landmark',
      'mailbox', 'fence', 'hand-platter',
    ],
  },
  {
    key: 'transport',
    label: 'Transport & travel',
    icons: [
      'car', 'car-front', 'car-taxi-front', 'bus', 'bus-front', 'train-front', 'tram-front', 'plane',
      'plane-takeoff', 'ship', 'sailboat', 'bike', 'motorbike', 'fuel', 'square-parking', 'map', 'map-pin',
      'navigation', 'route', 'signpost', 'compass', 'globe', 'luggage', 'ticket', 'hotel', 'tent', 'caravan',
      'mountain', 'tree-palm', 'truck', 'rocket', 'cog',
    ],
  },
  {
    key: 'health',
    label: 'Health & fitness',
    icons: [
      'heart', 'heart-pulse', 'stethoscope', 'pill', 'pill-bottle', 'syringe', 'thermometer', 'bandage', 'hospital',
      'cross', 'activity', 'brain', 'eye', 'ear', 'face-slightly-smiling', 'dumbbell', 'bike', 'footprints',
      'person-standing', 'volleyball', 'trophy', 'medal', 'flower-2', 'leaf', 'apple', 'baby', 'accessibility',
      'glasses', 'hand-heart', 'shield-plus',
    ],
  },
  {
    key: 'fun',
    label: 'Fun & hobbies',
    icons: [
      'gamepad-2', 'joystick', 'dices', 'puzzle', 'eighth-notes', 'headphones', 'guitar', 'piano', 'mic', 'radio',
      'film', 'clapperboard', 'popcorn', 'tv', 'camera', 'palette', 'brush', 'pen-tool', 'book-open', 'library',
      'ticket', 'party-popper', 'drama', 'ferris-wheel', 'roller-coaster', 'tent', 'fish', 'sprout', 'cigarette',
      'wine', 'beer', 'wand-sparkles',
    ],
  },
  {
    key: 'money',
    label: 'Money & work',
    icons: [
      'wallet', 'banknote', 'coins', 'piggy-bank', 'credit-card', 'landmark', 'hand-coins', 'receipt',
      'badge-percent', 'badge-dollar-sign', 'circle-dollar-sign', 'dollar-sign', 'euro', 'pound-sterling',
      'japanese-yen', 'bitcoin', 'vault', 'chart-line', 'chart-pie', 'chart-column-big', 'trending-up',
      'trending-down', 'calculator', 'scale', 'gavel', 'briefcase', 'briefcase-business', 'building-complex',
      'file-text', 'signature', 'handshake', 'presentation', 'printer', 'stamp', 'laptop',
    ],
  },
  {
    key: 'tech',
    label: 'Tech',
    icons: [
      'smartphone', 'tablet-smartphone', 'laptop', 'monitor', 'monitor-smartphone', 'keyboard', 'mouse',
      'headphones', 'watch', 'camera', 'printer', 'cpu', 'hard-drive', 'server', 'cloud', 'wifi', 'router',
      'battery-charging', 'cable', 'plug', 'app-window', 'code', 'bot', 'gamepad-2', 'tv', 'radio', 'satellite-dish',
      'phone', 'mail', 'globe',
    ],
  },
  {
    key: 'people',
    label: 'People & life',
    icons: [
      'user', 'users', 'baby', 'person-standing', 'heart', 'hand-heart', 'handshake', 'gift', 'cake', 'party-popper',
      'graduation-cap', 'school', 'book', 'backpack', 'church', 'gem', 'ribbon', 'award', 'calendar', 'bell', 'mail',
      'message-circle', 'phone', 'face-slightly-smiling', 'shield-check', 'house', 'briefcase', 'paw-print',
    ],
  },
  {
    key: 'nature',
    label: 'Nature & pets',
    icons: [
      'paw-print', 'dog', 'cat', 'bird', 'fish', 'rabbit', 'turtle', 'bug', 'leaf', 'trees', 'tree-pine',
      'tree-palm', 'flower', 'flower-2', 'sprout', 'sun', 'moon', 'cloud-sun', 'cloud-rain', 'snowflake', 'umbrella',
      'mountain', 'waves-horizontal', 'flame', 'droplet', 'shell', 'earth',
    ],
  },
  {
    key: 'symbols',
    label: 'Symbols',
    icons: [
      'shapes', 'star', 'heart', 'circle', 'square', 'triangle', 'hexagon', 'diamond', 'flag', 'bookmark', 'tag',
      'bell', 'calendar', 'clock', 'alarm-clock', 'timer', 'hourglass', 'check', 'circle-check', 'info',
      'circle-question-mark', 'sparkle', 'zap', 'infinity', 'hash', 'at-sign', 'lock', 'key', 'shield', 'target',
      'anchor', 'rocket', 'lightbulb', 'layers', 'box', 'archive', 'folder', 'repeat',
    ],
  },
];

/** Every pickable icon once, in group order (the picker's "All" tab). */
export const PICKABLE_ICONS: string[] = [...new Set(ICON_GROUPS.flatMap((g) => g.icons))];
