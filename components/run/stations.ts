export type LineId = 'red' | 'green'

export type LabelAlign = 'start' | 'end' | 'center'

export type Station = {
  id: string
  name: string
  lines: LineId[]
  x: number
  y: number
  /** Label anchor offset from the dot, and how text aligns to that anchor. */
  label: { dx: number; dy: number; align: LabelAlign; text?: string }
  story: string
  game: { title: string; genre: string; time: string }
  fact: { no: number; title: string }
}

export const LINES: Record<
  LineId,
  { name: string; realm: string; color: string; dark: string; tint: string }
> = {
  red: {
    name: 'Red Line',
    realm: "Scholars' Realm",
    color: '#DA291C',
    dark: '#A51F14',
    tint: '#FDECEA',
  },
  green: {
    name: 'Green Line',
    realm: 'Ancient Tunnels',
    color: '#00843D',
    dark: '#00602C',
    tint: '#E3F4EA',
  },
}

export const STATIONS: Station[] = [
  // Red Line — Scholars' Realm
  {
    id: 'alewife',
    name: 'Alewife',
    lines: ['red'],
    x: 44,
    y: 172,
    label: { dx: 0, dy: -18, align: 'center' },
    story: 'Named for a small herring that still swims up the Mystic River every spring.',
    game: { title: 'Fish Run', genre: 'Reflex', time: '~30 sec' },
    fact: { no: 1, title: 'The Herring Run' },
  },
  {
    id: 'davis',
    name: 'Davis',
    lines: ['red'],
    x: 88,
    y: 200,
    label: { dx: 14, dy: 0, align: 'start' },
    story: 'Davis Square was a busy rail crossing long before it was a music hub.',
    game: { title: 'Switch Tracks', genre: 'Puzzle', time: '~45 sec' },
    fact: { no: 2, title: 'Crossing Point' },
  },
  {
    id: 'porter',
    name: 'Porter',
    lines: ['red'],
    x: 120,
    y: 240,
    label: { dx: 14, dy: 0, align: 'start' },
    story: 'The porterhouse steak may take its name from a hotel that once stood here.',
    game: { title: 'Steak Claim', genre: 'Trivia', time: '~1 min' },
    fact: { no: 3, title: 'The Porter House' },
  },
  {
    id: 'harvard',
    name: 'Harvard',
    lines: ['red'],
    x: 136,
    y: 300,
    label: { dx: -22, dy: 0, align: 'end' },
    story: 'The statue in Harvard Yard is called the statue of three lies.',
    game: { title: 'Three Lies', genre: 'Two Truths and a Lie', time: '~1 min' },
    fact: { no: 4, title: 'The Founding Year' },
  },
  {
    id: 'central',
    name: 'Central',
    lines: ['red'],
    x: 180,
    y: 340,
    label: { dx: -14, dy: 0, align: 'end' },
    story: "Cambridge City Hall, steps away, was a philanthropist's gift in 1889.",
    game: { title: "Rindge's Gift", genre: 'Memory', time: '~1 min' },
    fact: { no: 5, title: 'A Hall for the City' },
  },
  {
    id: 'kendall',
    name: 'Kendall/MIT',
    lines: ['red'],
    x: 224,
    y: 368,
    label: { dx: -10, dy: 18, align: 'end' },
    story: 'MIT packed up and moved across the river from Boston to Cambridge in 1916.',
    game: { title: 'The Great Crossing', genre: 'Puzzle', time: '~90 sec' },
    fact: { no: 6, title: 'Across the Charles' },
  },
  {
    id: 'charles',
    name: 'Charles/MGH',
    lines: ['red'],
    x: 266,
    y: 404,
    label: { dx: -14, dy: 4, align: 'end' },
    story: 'In 1846, surgeons nearby first demonstrated ether anesthesia in public.',
    game: { title: 'Ether Dome', genre: 'Quick Quiz', time: '~1 min' },
    fact: { no: 7, title: 'The Ether Dome' },
  },
  {
    id: 'park',
    name: 'Park Street',
    lines: ['red', 'green'],
    x: 288,
    y: 452,
    label: { dx: 16, dy: 0, align: 'start' },
    story: "Park Street opened in 1897 as part of America's first subway tunnel.",
    game: { title: 'First Rails', genre: 'Timeline', time: '~1 min' },
    fact: { no: 8, title: 'The First Tunnel' },
  },
  {
    id: 'downtown',
    name: 'Downtown Crossing',
    lines: ['red'],
    x: 320,
    y: 484,
    label: { dx: 14, dy: 0, align: 'start', text: 'Downtown\nCrossing' },
    story: 'Washington Street once ran along the Neck, the only land route into Boston.',
    game: { title: 'The Neck', genre: 'Path Builder', time: '~45 sec' },
    fact: { no: 9, title: 'The Only Road In' },
  },
  {
    id: 'south',
    name: 'South Station',
    lines: ['red'],
    x: 338,
    y: 532,
    label: { dx: 0, dy: 20, align: 'center' },
    story: 'When it opened in 1899, South Station was among the busiest stations on Earth.',
    game: { title: 'Rush Hour 1899', genre: 'Reflex', time: '~1 min' },
    fact: { no: 10, title: 'Grand Terminal' },
  },

  // Green Line — Ancient Tunnels
  {
    id: 'lechmere',
    name: 'Lechmere',
    lines: ['green'],
    x: 214,
    y: 236,
    label: { dx: 0, dy: -18, align: 'center' },
    story: 'Named for Richard Lechmere, a Loyalist whose land was seized in the Revolution.',
    game: { title: 'Loyal or Not', genre: 'Two Truths and a Lie', time: '~1 min' },
    fact: { no: 1, title: 'The Loyalist' },
  },
  {
    id: 'science',
    name: 'Science Park',
    lines: ['green'],
    x: 252,
    y: 268,
    label: { dx: -14, dy: 0, align: 'end' },
    story: 'The Museum of Science sits right on top of the old Charles River Dam.',
    game: { title: 'Dam Builders', genre: 'Puzzle', time: '~90 sec' },
    fact: { no: 2, title: 'Built on a Dam' },
  },
  {
    id: 'north',
    name: 'North Station',
    lines: ['green'],
    x: 292,
    y: 288,
    label: { dx: 14, dy: -4, align: 'start', text: 'North\nStation' },
    story: 'In 1919, a wave of molasses swept through nearby streets at about 35 mph.',
    game: { title: 'Sticky Situation', genre: 'Reflex', time: '~45 sec' },
    fact: { no: 3, title: 'The Molasses Flood' },
  },
  {
    id: 'haymarket',
    name: 'Haymarket',
    lines: ['green'],
    x: 318,
    y: 322,
    label: { dx: 14, dy: 0, align: 'start' },
    story: "Haymarket's open-air produce stalls have run here for over two centuries.",
    game: { title: 'Market Haggle', genre: 'Bargain', time: '~1 min' },
    fact: { no: 4, title: 'Stalls of Old' },
  },
  {
    id: 'gov',
    name: 'Government Center',
    lines: ['green'],
    x: 316,
    y: 366,
    label: { dx: 14, dy: 0, align: 'start', text: "Gov't\nCenter" },
    story: "Scollay Square, once Boston's rowdiest district, was razed for City Hall Plaza.",
    game: { title: 'Lost Square', genre: 'Memory', time: '~1 min' },
    fact: { no: 5, title: 'Scollay Square' },
  },
  {
    id: 'boylston',
    name: 'Boylston',
    lines: ['green'],
    x: 262,
    y: 488,
    label: { dx: 8, dy: 20, align: 'start' },
    story: 'Boylston opened in 1897 and is one of the oldest subway stops in the Americas.',
    game: { title: 'Tunnel Diggers', genre: 'Dig', time: '~45 sec' },
    fact: { no: 6, title: 'Original Tiles' },
  },
  {
    id: 'arlington',
    name: 'Arlington',
    lines: ['green'],
    x: 224,
    y: 500,
    label: { dx: 0, dy: 20, align: 'center' },
    story: "The Public Garden's Swan Boats have been pedaled by hand since 1877.",
    game: { title: 'Swan Paddle', genre: 'Rhythm', time: '~1 min' },
    fact: { no: 7, title: 'The Swan Boats' },
  },
  {
    id: 'copley',
    name: 'Copley',
    lines: ['green'],
    x: 184,
    y: 508,
    label: { dx: 0, dy: -18, align: 'center' },
    story: 'Trinity Church rests on about 4,500 wooden pilings driven into filled marsh.',
    game: { title: 'Hold It Up', genre: 'Balance', time: '~1 min' },
    fact: { no: 8, title: 'Built on Wood' },
  },
  {
    id: 'hynes',
    name: 'Hynes',
    lines: ['green'],
    x: 142,
    y: 514,
    label: { dx: 0, dy: 20, align: 'center' },
    story: 'Named for John B. Hynes, the mayor who led Boston through the 1950s.',
    game: { title: "Mayor's Desk", genre: 'Sorting', time: '~45 sec' },
    fact: { no: 9, title: 'The Mayor' },
  },
  {
    id: 'kenmore',
    name: 'Kenmore',
    lines: ['green'],
    x: 98,
    y: 526,
    label: { dx: 0, dy: -18, align: 'center' },
    story: 'The glowing sign over Kenmore Square has lit the skyline since 1965.',
    game: { title: 'Neon Night', genre: 'Pattern', time: '~30 sec' },
    fact: { no: 10, title: 'The Neon Sign' },
  },
]

export const ROUTES: Record<LineId, string[]> = {
  red: [
    'alewife',
    'davis',
    'porter',
    'harvard',
    'central',
    'kendall',
    'charles',
    'park',
    'downtown',
    'south',
  ],
  green: [
    'lechmere',
    'science',
    'north',
    'haymarket',
    'gov',
    'park',
    'boylston',
    'arlington',
    'copley',
    'hynes',
    'kenmore',
  ],
}

export const stationById = (id: string) => STATIONS.find((s) => s.id === id)!

export const INITIAL_PLAYED = ['alewife', 'davis', 'porter', 'kenmore', 'hynes', 'copley']
export const CURRENT_STATION = 'harvard'
export const NEXT_STATION = 'central'

export const primaryLine = (s: Station): LineId => s.lines[0]
