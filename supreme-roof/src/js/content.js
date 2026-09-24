// Data for the interactive components. Copy is based on roofwaterproofingcompany.co.za;
// see README for what still needs the owner's confirmation.

export const ROOF_TYPES = [
  {
    key: 'Tiled', tex: 'tiles-valley',
    title: 'Tiled roofs',
    text: 'Most leaks on tiled roofs start at cracked or slipped tiles, valleys, ridges and flashing, not in the middle of the roof. We find the entry point, repair it and waterproof the vulnerable junctions.',
    issues: ['Cracked or slipped tiles', 'Leaking valleys', 'Failed flashing', 'Ridge and junction leaks'],
    services: ['Tiled roof repairs', 'Tiled roof waterproofing', 'Skylight installations'],
    help: 'Waterproofing',
  },
  {
    key: 'Flat', tex: 'torchon',
    title: 'Flat roofs',
    text: 'Flat roofs rely completely on their waterproofing and drainage. We specialise in torch-on systems, including 4mm silver oxide torch-on, with proper screed work, plus liquid-applied and coating systems where they suit the roof better.',
    issues: ['Ponding water', 'Delaminating or blistered membranes', 'Cracked screed', 'Blocked outlets'],
    services: ['Torch-on waterproofing', 'Screed and falls', 'Liquid membranes and coatings'],
    help: 'Waterproofing',
  },
  {
    key: 'Slate', tex: 'slate',
    title: 'Slate roofs',
    text: 'Slate lasts, if it is looked after. Our experienced slaters keep slate roofs looking right and leak-free, from routine maintenance to complete rebuilds.',
    issues: ['Cracked or missing slates', 'Failed fixings', 'Flashing leaks', 'Ageing underlay'],
    services: ['Slate repairs', 'Slate roof waterproofing', 'Maintenance and rebuilds'],
    help: 'Waterproofing',
  },
  {
    key: 'Metal', tex: 'metal-new',
    title: 'Metal roofs',
    text: 'Metal sheeting leaks at laps, fixings and flashing, and suffers when coatings and rust protection wear through. We waterproof and protect metal roofs to keep them sealed.',
    issues: ['Rust and corrosion', 'Leaking laps and fixings', 'Worn coatings', 'Damaged flashing'],
    services: ['Metal roof waterproofing', 'Coatings', 'Repairs'],
    help: 'Waterproofing',
  },
  {
    key: 'Commercial', tex: 'membrane-new',
    title: 'Commercial roofs',
    text: 'Offices and commercial buildings need roofs that protect tenants, stock and operations. We waterproof, repair and maintain commercial roofs, with the work planned after a proper assessment.',
    issues: ['Large flat areas and ponding', 'Ageing membranes', 'Blocked drainage', 'Deferred maintenance'],
    services: ['Commercial roof waterproofing', 'Maintenance programmes', 'Repairs'],
    help: 'Inspection',
  },
  {
    key: 'Industrial', tex: 'metal-rust',
    title: 'Industrial roofs',
    text: 'Factories and industrial facilities have large-span roofs where a leak can stop operations. We provide robust waterproofing tailored to industrial facilities, and the maintenance to keep it performing.',
    issues: ['Corroding sheeting', 'Leaking laps and skylights', 'Gutter and outlet failures', 'Large-area coating wear'],
    services: ['Industrial and factory roof waterproofing', 'Coatings', 'Maintenance'],
    help: 'Inspection',
  },
];

export const NEEDS = [
  { key: 'leak', label: 'I have a leak', help: 'Leak', title: 'Leak repairs',
    text: 'A leak is a symptom. We trace where the water is actually getting in, which is often not directly above the drip, and repair or waterproof that area.',
    next: 'Tell us where the water shows and when it happens. Photos from inside help.', cta: 'Report a leak' },
  { key: 'wp', label: 'My roof needs waterproofing', help: 'Waterproofing', title: 'Roof waterproofing',
    text: 'Waterproofing tailored to your roof system: torch-on and membranes for flat roofs, and targeted waterproofing of valleys, flashing and junctions on pitched roofs.',
    next: 'We assess the roof and recommend the system before quoting.', cta: 'Get a waterproofing assessment' },
  { key: 'tiles', label: 'My tiles are damaged', help: 'Roof repair', roof: 'Tiled', title: 'Tiled roof repairs',
    text: 'Cracked, broken and slipped tiles let water reach the underlay and timbers. We replace damaged tiles and check the surrounding roof while we\'re up there.',
    next: 'A photo from the ground is enough to start.', cta: 'Book a tile repair assessment' },
  { key: 'flat', label: 'I have a flat roof', help: 'Waterproofing', roof: 'Flat', title: 'Flat roof waterproofing',
    text: 'Our specialism: seamless torch-on, including 4mm silver oxide torch-on, with proper screed work, or liquid-applied systems where they suit better.',
    next: 'Tell us if you see ponding water, blisters or lifting seams.', cta: 'Assess my flat roof' },
  { key: 'maint', label: 'My roof needs maintenance', help: 'Roof maintenance', title: 'Roof maintenance',
    text: 'Inspections, debris removal, gutter cleaning and minor repairs that catch problems before they become leaks.',
    next: 'Ideal before the Highveld storm season.', cta: 'Book maintenance' },
  { key: 'new', label: 'I need a new roof', help: 'Re-roofing', title: 'Roof renovations & re-roofing',
    text: 'When repairs no longer make sense: a condition assessment and detailed plan, removal of old materials, repairs underneath, new roof covering, then sealing and finishing.',
    next: 'We\'ll tell you honestly whether repair or renovation makes more sense.', cta: 'Discuss re-roofing' },
  { key: 'em', label: 'I need an emergency assessment', help: 'Emergency', title: 'Emergency call-out', emergency: true,
    text: 'Water coming in now? We offer a 24-hour emergency call-out for urgent leaks. Call first. It\'s the fastest way to get the team moving.',
    next: 'Keep people and valuables away from the affected area and don\'t go onto the roof yourself.', cta: 'Request urgent assistance' },
];

// Project slots: placeholders until Supreme supplies real before/after photos and details.
export const PROJECTS = [
  { title: 'Flat roof: torch-on waterproofing', tags: ['residential', 'waterproofing'], before: 'membrane-ponding', after: 'torchon', work: 'Screed repairs, 4mm torch-on membrane' },
  { title: 'Tiled roof: leak & tile repairs', tags: ['residential', 'repairs'], before: 'tiles-cracked', after: 'tiles-new', work: 'Tile replacement, valley and flashing waterproofing' },
  { title: 'Commercial flat roof', tags: ['commercial', 'waterproofing'], before: 'membrane-failed', after: 'membrane-new', work: 'Membrane replacement and drainage' },
  { title: 'Factory roof', tags: ['industrial', 'waterproofing'], before: 'metal-rust', after: 'metal-new', work: 'Industrial roof waterproofing and coating' },
  { title: 'Slate roof restoration', tags: ['residential', 'roofing'], before: 'slate-old', after: 'slate', work: 'Slate repairs and maintenance' },
  { title: 'Roof renovation', tags: ['residential', 'roofing'], before: 'tiles-aged', after: 'tiles-new-dark', work: 'Strip, repair, re-roof and seal' },
];

// Approximate lon/lat, for the stylised service-area map only.
export const AREAS = [
  { key: 'fourways', name: 'Fourways', lon: 28.008, lat: -26.015 },
  { key: 'rivonia', name: 'Rivonia', lon: 28.058, lat: -26.051 },
  { key: 'bryanston', name: 'Bryanston', lon: 28.021, lat: -26.056, hq: true },
  { key: 'sandton', name: 'Sandton', lon: 28.057, lat: -26.107 },
  { key: 'randburg', name: 'Randburg', lon: 27.998, lat: -26.094 },
  { key: 'northcliff', name: 'Northcliff', lon: 27.968, lat: -26.143 },
  { key: 'jhbn', name: 'Johannesburg North', lon: 28.03, lat: -26.125, label: true },
  { key: 'jhb', name: 'Johannesburg', lon: 28.047, lat: -26.204 },
];

export const CONTACT = {
  phone: '067 817 3343',
  tel: '+27678173343',
  wa: '27678173343',
  email: 'sales@roofwaterproofingcompany.co.za',
  // approximate: 25 Plantation Road, Bryanston. Confirm before launch.
  lat: -26.0556, lng: 28.0209,
};
