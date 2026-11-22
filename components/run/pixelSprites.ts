// Pixel-art sprites for the map. Each row is one pixel row; each character is a color
// from the sprite's palette (merged over BASE_PAL), '.' is transparent.

export type Sprite = { rows: string[]; pal?: Record<string, string> }

export const BASE_PAL: Record<string, string> = {
  k: '#2A2522', // outline / shadow
  w: '#F6EEDC', // white trim
  b: '#6FA8D6', // window
  d: '#5A3A22', // door
  g: '#F2B233', // gold
  B: '#A64B32', // brick
  G: '#3F8A3A', // leaves
  l: '#63B34E', // light leaves
  t: '#6B4A2E', // trunk
  y: '#FFE29A', // lit window / bulb
}

/** The most notable building near each station. */
export const LANDMARKS: Record<string, Sprite> = {
  // The End-of-Line Boss's iron tower
  alewife: {
    rows: [
      '......F......',
      '......FFf....',
      '......Ff.....',
      '......i......',
      '..i.i.i.i.i..',
      '..iiiiiiiii..',
      '...IIIIIII...',
      '...IeIIIeI...',
      '...IIIIIII...',
      '...IIyyyII...',
      '...IIIIIII...',
      '..iIIIIIIIi..',
      '..iIoIIIoIi..',
      '..iIIIIIIIi..',
      '.iiIIIdIIIii.',
      '.iiIIIdIIIii.',
      'kkkkkkkkkkkkk',
    ],
    pal: { F: '#DA291C', f: '#F97316', i: '#26262E', I: '#454552', e: '#FF4433', y: '#FFD25A', o: '#F97316' },
  },
  // Somerville Theatre: brick with a marquee of bulbs
  davis: {
    rows: [
      '..kkkkkkkkkkk..',
      '..BBBBBBBBBBB..',
      '..BbBBbBbBBbB..',
      '..BbBBbBbBBbB..',
      '..BBBBBBBBBBB..',
      'yRyRyRyRyRyRyRy',
      'RwwwwwwwwwwwwwR',
      'RwkkwkkwkkwkkwR',
      'RwwwwwwwwwwwwwR',
      'yRyRyRyRyRyRyRy',
      '..BBBdddddBBB..',
      '..BBBdddddBBB..',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { R: '#DA291C', b: '#FFD27A' },
  },
  // Porter Exchange: a stepped Art Deco tower
  porter: {
    rows: [
      '......kkk......',
      '......ccc......',
      '.....ccccc.....',
      '.....cScSc.....',
      '.....cScSc.....',
      '...ccccccccc...',
      '...cScScScSc...',
      '...cScScScSc...',
      '...cScScScSc...',
      '.ccccccccccccc.',
      '.cScScScScScSc.',
      '.cScScScScScSc.',
      '.cScScScScScSc.',
      '.cScScSdScScSc.',
      '.cccccdddccccc.',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { c: '#E8DFC8', S: '#8FA6BA' },
  },
  // Harvard: brick hall with a white cupola
  harvard: {
    rows: [
      '.......g.......',
      '......wgw......',
      '......www......',
      '.....wwbww.....',
      '.....wwwww.....',
      '..sssssssssss..',
      '.sSSSSSSSSSSSs.',
      'sssssssssssssss',
      '.BBBBBBBBBBBBB.',
      '.BwBBwBBBwBBwB.',
      '.BwBBwBBBwBBwB.',
      '.BBBBBBBBBBBBB.',
      '.BwBBwBdBwBBwB.',
      '.BBBBBBdBBBBBB.',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { s: '#3E454E', S: '#5B6570' },
  },
  // Cambridge City Hall: sandstone with a clock tower
  central: {
    rows: [
      '.......g.......',
      '......kkk......',
      '......sss......',
      '......scs......',
      '......sss......',
      '......sbs......',
      '......sss......',
      '.rrrrrrrrrrrrr.',
      '..sssssssssss..',
      '..sbsbsssbsbs..',
      '..sssssssssss..',
      '..sbsbsdsbsbs..',
      '..sssssdsssss..',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { s: '#C9B28A', r: '#7A4A32', c: '#2B2B33' },
  },
  // MIT: the Great Dome over a row of columns
  kendall: {
    rows: [
      '......kkkkk......',
      '....kDDDDDDDk....',
      '...kDDDDDDDDDk...',
      '..kDDDDDDDDDDDk..',
      '..kkkkkkkkkkkkk..',
      '.wwwwwwwwwwwwwww.',
      '.wcwcwcwcwcwcwcw.',
      '.wcwcwcwcwcwcwcw.',
      '.wcwcwcwcwcwcwcw.',
      '.wwwwwwwwwwwwwww.',
      'sssssssssssssssss',
      'kkkkkkkkkkkkkkkkk',
    ],
    pal: { D: '#DCD6C8', w: '#EDE6D6', c: '#8C8576', s: '#BDB5A3' },
  },
  // Longfellow Bridge: the "salt and pepper" towers
  charles: {
    rows: [
      '..kk.......kk..',
      '.kssk.....kssk.',
      '.ssss.....ssss.',
      '.sbss.....ssbs.',
      '.ssss.....ssss.',
      '.sbss.....ssbs.',
      '.ssss.....ssss.',
      'sssssssssssssss',
      'sksssksssksssks',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { s: '#BFB6A6', b: '#5B6570' },
  },
  // Massachusetts State House: the gold dome
  park: {
    rows: [
      '........k........',
      '.......kgk.......',
      '......ggggg......',
      '.....ggggggg.....',
      '....kkkkkkkkk....',
      '....wwwwwwwww....',
      '..BBBBBBBBBBBBB..',
      '..BwBwBwBwBwBwB..',
      '.kwwwwwwwwwwwwwk.',
      '.kwkwkwkwkwkwkwk.',
      '.kwkwkwkwkwkwkwk.',
      '..BBBBBBdBBBBBB..',
      '..BBBBBBdBBBBBB..',
      'kkkkkkkkkkkkkkkkk',
    ],
    pal: { g: '#F2C03A', w: '#F2EBDD', B: '#B5573A' },
  },
  // Old South Meeting House: brick church with a white steeple
  downtown: {
    rows: [
      '.....g.....',
      '.....w.....',
      '.....w.....',
      '....www....',
      '....wbw....',
      '....www....',
      '...wwwww...',
      '...wwbww...',
      '...wwwww...',
      '..wwwwwww..',
      '..wbwwwbw..',
      '..wwwwwww..',
      '.BBBBBBBBB.',
      '.BwBBBBBwB.',
      '.BwBBdBBwB.',
      '.BBBBdBBBB.',
      'kkkkkkkkkkk',
    ],
  },
  // South Station: grand stone hall with a clock
  south: {
    rows: [
      '........g........',
      '.......SSS.......',
      '......SScSS......',
      '.....SSSSSSS.....',
      '.sssssssssssssss.',
      'sssssssssssssssss',
      'SwSSwSSwSwSSwSSwS',
      'SwSSwSSwSwSSwSSwS',
      'SSSSSSSdddSSSSSSS',
      'SwSSwSSdddSSwSSwS',
      'kkkkkkkkkkkkkkkkk',
    ],
    pal: { S: '#D9C8A8', s: '#9C8467', c: '#2B2B33', w: '#6FA8D6' },
  },
  // East Cambridge: brick factory with a smokestack
  lechmere: {
    rows: [
      '...........kk..',
      '...........BB..',
      '...........BB..',
      '...........BB..',
      '..rr..rr..rBBr.',
      '.rrrrrrrrrrrrr.',
      '.BBBBBBBBBBBBB.',
      '.BbbBbbBbbBbbB.',
      '.BbbBbbBbbBbbB.',
      '.BBBBBBBBBBBBB.',
      '.BBBBBdddBBBBB.',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { r: '#5B4A42', b: '#FFD27A' },
  },
  // Museum of Science: glass block and planetarium dome
  science: {
    rows: [
      '...kkk...........',
      '.kkDDDkk.........',
      '.kDDDDDk.........',
      'kDDDDDDDkccccccc.',
      'cccccccccccccccc.',
      'cbbbbbbbbbbbbbbc.',
      'cbbbbbbbbbbbbbbc.',
      'cccccccccccccccc.',
      'cbbbcbbbcbbbcbbc.',
      'cccccccdddcccccc.',
      'kkkkkkkkkkkkkkkk.',
    ],
    pal: { D: '#E9EEF2', c: '#C7CDD3', b: '#7FB3DE' },
  },
  // North Station: a big arena
  north: {
    rows: [
      'kkkkkkkkkkkkkkkkkkk',
      'aaaaaaaaaaaaaaaaaaa',
      'ayayayayayayayayaya',
      'aaaaaaaaaaaaaaaaaaa',
      'abbbbbbbbbbbbbbbbba',
      'abbbbbbbbbbbbbbbbba',
      'aaaaaaaaaaaaaaaaaaa',
      'aaaaaaaadddaaaaaaaa',
      'kkkkkkkkkkkkkkkkkkk',
    ],
    pal: { a: '#7D8794', b: '#5E8FBF' },
  },
  // Haymarket: open-air market stalls
  haymarket: {
    rows: [
      'RwRwR.wRwRw.RwRwR',
      'wRwRw.RwRwR.wRwRw',
      'k...k.k...k.k...k',
      'kOGOk.kgOgk.kOrOk',
      'kdddk.kdddk.kdddk',
      'kkkkkkkkkkkkkkkkk',
    ],
    pal: { R: '#DA291C', O: '#F97316', r: '#C0392B' },
  },
  // Boston City Hall: concrete, wider at the top
  gov: {
    rows: [
      'ccccccccccccccccccc',
      'cncncncncncncncncnc',
      'ccccccccccccccccccc',
      '.cncncncncncncncnc.',
      '.ccccccccccccccccc.',
      '..cbbbbbbbbbbbbbc..',
      '..cbbbbbbbbbbbbbc..',
      '...ccccccccccccc...',
      '...c.c.c.c.c.c.c...',
      '...c.c.c.c.c.c.c...',
      'kkkkkkkkkkkkkkkkkkk',
    ],
    pal: { c: '#B9B2A5', n: '#7E776B', b: '#5B6B7C' },
  },
  // Boylston: the old granite subway kiosk with a green roof
  boylston: {
    rows: [
      '......k......',
      '.....GGG.....',
      '...GGGGGGG...',
      '.GGGGGGGGGGG.',
      'kkkkkkkkkkkkk',
      '.sssssssssss.',
      '.sbbsssssbbs.',
      '.sbbssdssbbs.',
      '.sssssdsssss.',
      'kkkkkkkkkkkkk',
    ],
    pal: { G: '#3E8E6E', s: '#B8AE9C' },
  },
  // Public Garden: a swan boat on the pond
  arlington: {
    rows: [
      '...........ww..',
      '...........wwo.',
      '...........w...',
      '..R.R.R.R.ww...',
      '.RRRRRRRRRwww..',
      '.wwwwwwwwwwwww.',
      '..wwwwwwwwwww..',
      'LLLLLLLLLLLLLLL',
      'LlLLLLlLLLLLlLL',
    ],
    pal: { R: '#2F6FD1', o: '#F97316', L: '#4D99D7', l: '#BFE3FF' },
  },
  // Trinity Church: sandstone with a central tower and red roofs
  copley: {
    rows: [
      '........k........',
      '.......kRk.......',
      '......kRRRk......',
      '.....kRRRRRk.....',
      '.....sssssss.....',
      '.....sbsssbs.....',
      '.....sssssss.....',
      '.kRRRsssssssRRRk.',
      'kRRRRsssssssRRRRk',
      '.sssssssssssssss.',
      '.sbsbssbbbssbsbs.',
      '.sssssssdsssssss.',
      '.ssssssdddssssss.',
      'kkkkkkkkkkkkkkkkk',
    ],
    pal: { R: '#B04A2E', s: '#C9A27A' },
  },
  // Prudential Tower: tall and slim with an antenna
  prudential: {
    rows: [
      '.....k.....',
      '.....k.....',
      '.....k.....',
      '....kkk....',
      '..ggggggg..',
      '..gbgbgbg..',
      '..ggggggg..',
      '..gbgbgbg..',
      '..ggggggg..',
      '..gbgbgbg..',
      '..ggggggg..',
      '..gbgbgbg..',
      '..ggggggg..',
      '..gbgbgbg..',
      '..ggggggg..',
      '..gbgbgbg..',
      '..ggggggg..',
      '..gbgbgbg..',
      '..ggggggg..',
      '..gbgbgbg..',
      '.ggggggggg.',
      '.gbbgdgbbg.',
      'kkkkkkkkkkk',
    ],
    pal: { g: '#8D97A3', b: '#B8D4EA' },
  },
  // Fenway: the ballpark's tall green wall and light towers
  fenway: {
    rows: [
      'kyk.............kyk',
      'kyk.............kyk',
      '.k...............k.',
      '.k...............k.',
      'GGGGGGGGGGGGGGGGGGG',
      'GGwwwwGGGGGGGGGGGGG',
      'GGwkwkGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGddGGGGGGGG',
      'kkkkkkkkkkkkkkkkkkk',
    ],
    pal: { G: '#2E6B3A', y: '#FFF3B0' },
  },
  // Kenmore Square: a big glowing rooftop sign
  kenmore: {
    rows: [
      'kkkkkkkkkkkkkkk',
      'kRRRRRRRRRRRRRk',
      'kRyyyyyyyyyyyRk',
      'kRyRRRRRRRRRyRk',
      'kRyyyyyyyyyyyRk',
      'kRRRRRRRRRRRRRk',
      'kkkkkkkkkkkkkkk',
      '..k....k....k..',
      'BBBBBBBBBBBBBBB',
      'BbBbBbBbBbBbBbB',
      'BBBBBBBdBBBBBBB',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { R: '#2F6FD1', y: '#FF5A5A', B: '#9C6B4E', b: '#FFD27A' },
  },
  // Hynes: Berklee, a music school with a gold note on the roof
  hynes: {
    rows: [
      '.......gggg....',
      '.......g..g....',
      '.......g..g....',
      '.....ggg.ggg...',
      '.....ggg.ggg...',
      '..BBBBBBBBBBB..',
      '..BbbBbbBbbBB..',
      '..BBBBBBBBBBB..',
      '..BbbBBdBBbbB..',
      '..BBBBBdBBBBB..',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { B: '#7A4A6A', b: '#FFD27A' },
  },
  // Blandford Street: the stone tunnel portal where the B line comes up
  blandford: {
    rows: [
      '..sssssssssss..',
      '.sssssssssssss.',
      'ssssskkkkksssss',
      'sssskkkkkkkssss',
      'ssskkkkkkkkksss',
      'ssskkkkkkkkksss',
      'ssskkkkkkkkksss',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { s: '#9C9384' },
  },
  // BU East: an old Automobile Row showroom with a car in the window
  bueast: {
    rows: [
      'kkkkkkkkkkkkkkkkk',
      'BBBBBBBBBBBBBBBBB',
      'BwwwwwwwwwwwwwwwB',
      'BbbbbbbbbbbbbbbbB',
      'BbbbRRRRRbbbbbbbB',
      'BbbRRRRRRRbbbbbbB',
      'BbbbkbbbkbbbbbbbB',
      'BBBBBBBBBBBBBdBBB',
      'kkkkkkkkkkkkkkkkk',
    ],
    pal: { R: '#C0392B', b: '#9CC6E6' },
  },
  // BU Central: Marsh Chapel
  bucentral: {
    rows: [
      '.......w.......',
      '......sss......',
      '......sbs......',
      '......sss......',
      '.....sssss.....',
      '.....sbsbs.....',
      '.....sssss.....',
      '..rrrrrrrrrrr..',
      '.rsssssssssssr.',
      '.ssbssbsbssbss.',
      '.ssbssbsbssbss.',
      '.ssssssdssssss.',
      '.sssssdddsssss.',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { s: '#B7AA92', r: '#5B5550' },
  },
  // Amory Street: BU's glass dorm towers
  amory: {
    rows: [
      '.ggggg...ggggg.',
      '.gbgbg...gbgbg.',
      '.ggggg...ggggg.',
      '.gbgbg...gbgbg.',
      '.ggggg...ggggg.',
      '.gbgbg...gbgbg.',
      '.gggggcccggggg.',
      '.gbgbgcbcgbgbg.',
      '.gggggcccggggg.',
      '.gbgbgcdcgbgbg.',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { g: '#9FB2C2', b: '#E2F0FA', c: '#C9BFAF' },
  },
  // Babcock Street: the old ballpark gate, with pennants
  babcock: {
    rows: [
      '.k.....k.....k.',
      '.kR....kR....kR',
      '.k.....k.....k.',
      'sssssssssssssss',
      'swwwwwwwwwwwwws',
      'swkkwkkwkkwkkws',
      'swwwwwwwwwwwwws',
      'sssskkkkkkkssss',
      'ssskkkkkkkkksss',
      'ssskkkkkkkkksss',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { s: '#C9A27A', R: '#2F6FD1' },
  },
  // Packard's Corner: an ice cream shop with a striped awning
  packards: {
    rows: [
      '......p........',
      '.....ppp.......',
      '......o........',
      '......o........',
      '.BBBBBBBBBBBBB.',
      'PwPwPwPwPwPwPwP',
      'wPwPwPwPwPwPwPw',
      '.BbbbbBBBbbbbB.',
      '.BbbbbBdBbbbbB.',
      '.BBBBBBdBBBBBB.',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { p: '#F7A8C4', o: '#D9A35A', P: '#E85A8A', b: '#9CC6E6', B: '#E8DCC4' },
  },
  // Harvard Ave: an Allston triple-decker with a couch on the curb
  harvardave: {
    rows: [
      '..kkkkkkkkk....',
      '..ccccccccc....',
      '..cbcbcbcbc....',
      '..ccccccccc....',
      '..cbcbcbcbc....',
      '..ccccccccc....',
      '..cbcbcdcbc.S..',
      '..cccccdcccSSSS',
      'kkkkkkkkkkkSkkS',
    ],
    pal: { c: '#C9D3D6', S: '#B04A2E' },
  },
  // St. Mary's Street: an old yellow electric streetcar
  stmarys: {
    rows: [
      '........k......',
      '.......k.......',
      '......k........',
      '..kkkkkkkkkkk..',
      '.yyyyyyyyyyyyy.',
      '.ybbybbybbybby.',
      '.ybbybbybbybby.',
      '.yyyyyyyyyyyyy.',
      '.RRRRRRRRRRRRR.',
      '..kk.......kk..',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { y: '#F2C03A', R: '#8B2E1F' },
  },
  // Hawes Street: a quiet mossy shelter (with something napping in it)
  hawes: {
    rows: [
      '.kkkkkkkkkkk.',
      '.GlGlGlGlGlG.',
      '..k.......k..',
      '..k.......k..',
      '..k..mmm..k..',
      '..k.mmmmm.k..',
      '..wwwwwwwww..',
      'kkkkkkkkkkkkk',
    ],
    pal: { m: '#6E8B4E', w: '#8B5E45' },
  },
  // Kent Street: Beacon Street brownstones
  kent: {
    rows: [
      'kkkkkkkkkkkkkkk',
      'BBBBBBBkNNNNNNN',
      'BbBbBbBkNbNbNbN',
      'BBBBBBBkNNNNNNN',
      'BbBbBbBkNbNbNbN',
      'BBBBBBBkNNNNNNN',
      'BbBdBbBkNbNdNbN',
      'BBBdBBBkNNNdNNN',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { B: '#8B5E45', N: '#C9A27A' },
  },
  // St. Paul Street: twin shelters on opposite sides of the street
  stpaul: {
    rows: [
      'kkkkk.....kkkkk',
      'GGGGG.....GGGGG',
      'k...k.....k...k',
      'k...k.....k...k',
      'kwwwk.....kwwwk',
      'kkkkkwkwkwkkkkk',
    ],
    pal: { G: '#00843D' },
  },
  // Coolidge Corner: an 1857 general store
  coolidge: {
    rows: [
      '.....kkkkk.....',
      '....kwwwwwk....',
      '....kwkkkwk....',
      '....kwwwwwk....',
      '.ttttttttttttt.',
      '.TTTTTTTTTTTTT.',
      '.TbbTTTdTTTbbT.',
      '.TbbTTTdTTTbbT.',
      '.TTTTTTdTTTTTT.',
      '.ooooooooooooo.',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { t: '#5A3A22', T: '#B07B57', o: '#8B5E45' },
  },
  // Northeastern: a campus hall and the old pitcher's mound with a statue
  northeastern: {
    rows: [
      '.....kkkkk.....',
      '.....BBBBB.....',
      '.....BbBbB.....',
      '..BBBBBBBBBBB..',
      '..BbBbBBBbBbB..',
      '..BBBBBdBBBBB..',
      'GGGGGGGGGGGGGGG',
      'GGGGGGgkgGGGGGG',
      'GGGGGgSSSgGGGGG',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { G: '#5E9E45', g: '#D9B57A', S: '#D9B57A' },
  },
  // MFA: a granite temple front with columns
  mfa: {
    rows: [
      '.........k.........',
      '........sss........',
      '......sssssss......',
      '....sssssssssss....',
      '..sssssssssssssss..',
      'kkkkkkkkkkkkkkkkkkk',
      '.swswswswswswswsws.',
      '.swswswswswswswsws.',
      '.swswswswswswswsws.',
      '.sssssssdddsssssss.',
      'ttttttttttttttttttt',
      'kkkkkkkkkkkkkkkkkkk',
    ],
    pal: { s: '#D6D0C4', w: '#8C8576', t: '#BDB5A3' },
  },
  // ---- Orange Line ----
  // Schrafft's: the brick candy-factory tower with its red sign
  sullivan: {
    rows: [
      '....kkkkk....',
      '....RyRyR....',
      '....kkkkk....',
      '....BBBBB....',
      '....BbBbB....',
      '....BBBBB....',
      '....BbBbB....',
      '.BBBBBBBBBBB.',
      '.BbBbBbBbBbB.',
      '.BBBBBBBBBBB.',
      '.BbBbBdBbBbB.',
      '.BBBBBdBBBBB.',
      'kkkkkkkkkkkkk',
    ],
    pal: { R: '#DA291C' },
  },
  // Bunker Hill Monument: a granite obelisk on the hill
  ccollege: {
    rows: [
      '....k....',
      '...sss...',
      '...sSs...',
      '...sSs...',
      '...sSs...',
      '...sSs...',
      '..ssSss..',
      '..ssSss..',
      '..ssSss..',
      '..ssSss..',
      '..ssdss..',
      '.sssssss.',
      'GGGGGGGGG',
      'kkkkkkkkk',
    ],
    pal: { s: '#D6D0C4', S: '#A8A193' },
  },
  // Old State House: brick with a white tiered tower, lion and unicorn on the gable
  state: {
    rows: [
      '.......g.......',
      '......kwk......',
      '......www......',
      '.....wwbww.....',
      '.....wwwww.....',
      '....BBwwwBB....',
      '.g.BBBBBBBBB.g.',
      '.BBBBBBBBBBBBB.',
      '.BwBBwBBBwBBwB.',
      '.BBBBBBwBBBBBB.',
      '.BwBBwBwBwBBwB.',
      '.BBBBBBdBBBBBB.',
      'kkkkkkkkkkkkkkk',
    ],
  },
  // Chinatown Gate: green tiled roof, red pillars, gold sign
  chinatown: {
    rows: [
      'G...........G',
      'GGGGGGGGGGGGG',
      '.GgGgGgGgGgG.',
      '..RRRRRRRRR..',
      '..R..ggg..R..',
      '..RRRRRRRRR..',
      '..R.......R..',
      '..R.......R..',
      '..R.......R..',
      '.kkk.....kkk.',
    ],
    pal: { G: '#2F8A4A', R: '#C0392B' },
  },
  // Hancock Tower: a tall slab of blue mirror glass
  backbay: {
    rows: [
      '.kkkkkkk.',
      '.HhHHHHH.',
      '.HHhHHHH.',
      '.HHHhHHH.',
      '.HHHHhHH.',
      '.HHHHHhH.',
      '.HhHHHHH.',
      '.HHhHHHH.',
      '.HHHhHHH.',
      '.HHHHhHH.',
      '.HHHHHhH.',
      '.HhHHHHH.',
      '.HHhHHHH.',
      '.HHHhHHH.',
      '.HHHHhHH.',
      '.HHHdHHH.',
      'kkkkkkkkk',
    ],
    pal: { H: '#5E8FBF', h: '#BFE3FF' },
  },
  // Southwest Corridor Park: trees, a lamp post and a bench along the path
  ruggles: {
    rows: [
      '..GGG.....k......',
      '.GGlGG...kyk.GGG.',
      '.GlGGG....k.GGlGG',
      '..GGG.....k.GlGGG',
      '...t......k..GGG.',
      '...t..ddd.k...t..',
      'LLLLLLLLLLLLLLLLL',
      'ppppppppppppppppp',
      'kkkkkkkkkkkkkkkkk',
    ],
    pal: { L: '#7CB652', p: '#C9A27A' },
  },
  // Arnold Arboretum: trees of every color on a hill
  foresthills: {
    rows: [
      '.....OOO.........',
      '....OOoOO..GGG...',
      '....OoOOO.GGlGG..',
      '.GGG.OOO..GlGGG..',
      'GGlGG.t....GGG.rr',
      'GlGGG.t.....t.rrr',
      '.GGG..t.....t..t.',
      'LLLLLLLLLLLLLLLLL',
      'kkkkkkkkkkkkkkkkk',
    ],
    pal: { O: '#E07B22', o: '#F2B233', r: '#C0392B', L: '#7CB652' },
  },
  // ---- Red Line south ----
  // Fort Independence: low granite walls with a flag
  broadway: {
    rows: [
      '.......k.......',
      '.......Rk......',
      '.......RR......',
      '.......k.......',
      'ss.s.s.k.s.s.ss',
      'sssssssssssssss',
      'sSssSssssSssSss',
      'sssssssddssssss',
      'GGGGGGGGGGGGGGG',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { s: '#B8AE9C', S: '#8C8576', R: '#DA291C', G: '#7CB652' },
  },
  // 54th Regiment Memorial: a bronze relief in a granite frame
  andrew: {
    rows: [
      'sssssssssssss',
      'sooooooooooos',
      'soOoOOoOoOoos',
      'soOOOoOOOoOos',
      'sooOoOoOOoOos',
      'soOOOOOOOOOos',
      'sooooooooooos',
      'sssssssssssss',
      '.sSSSSSSSSSs.',
      'kkkkkkkkkkkkk',
    ],
    pal: { s: '#C9C3B6', S: '#A8A193', o: '#6E5A3A', O: '#A07A3E' },
  },
  // JFK Library: a white concrete tower and a black glass pavilion
  jfk: {
    rows: [
      '.wwwww.........',
      '.wwwwwKKKKKK...',
      '.wwwwwKbKKbK...',
      '.wwwwwKKKKKK...',
      '.wwwwwKKbKKK...',
      '.wwwwwKKKKKK...',
      'wwwwwwwwwwwwww.',
      'wwwwwwwwwwwwww.',
      'wwwwwwdwwwwwww.',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { w: '#F2EFE8', K: '#2B2F36', b: '#5E8FBF' },
  },
  // Savin Hill: a wooded hill above the bay
  savin: {
    rows: [
      '.....GGG.......',
      '....GGlGG.GGG..',
      '...GGlGGGGGlGG.',
      '..LLLGGGLLGGG..',
      '.LLLLLtLLLLtLL.',
      'LLLLLLLLLLLLLLL',
      'WWWWWWWWWWWWWWW',
      'WwWWWWwWWWWWwWW',
    ],
    pal: { L: '#7CB652', W: '#4D99D7', w: '#BFE3FF' },
  },
  // Fields Corner: a shop wall covered in a bright mural
  fields: {
    rows: [
      'kkkkkkkkkkkkk',
      'BBBBBBBBBBBBB',
      'BpppyyyGGGtpB',
      'BppyyyGGGttpB',
      'BpyyRRGGttppB',
      'BpyRRRRtttppB',
      'BBBBBBBBBBBBB',
      'BbbBBdBBBbbBB',
      'BbbBBdBBBbbBB',
      'kkkkkkkkkkkkk',
    ],
    pal: { p: '#7B3FC4', R: '#DA291C', G: '#2F8A4A', t: '#2F6FD1' },
  },
  // A Dorchester triple-decker with stacked porches
  shawmut: {
    rows: [
      '.kkkkkkkk.',
      '.cccccccc.',
      '.cbcwwwwk.',
      '.cccwkkwk.',
      '.cbcwwwwk.',
      '.cccwkkwk.',
      '.cbcwwwwk.',
      '.cccwkkwk.',
      '.cbcwddwk.',
      'kkkkkkkkkk',
    ],
    pal: { c: '#A9C8D8' },
  },
  // The Mattapan trolley: an orange PCC streetcar
  ashmont: {
    rows: [
      '.......k.......',
      '......kkk......',
      '.kkkkkkkkkkkkk.',
      'kOOOOOOOOOOOOOk',
      'kObbObbObbObbOk',
      'kObbObbObbObbOk',
      'kccccccccccccck',
      'kOOOOOOOOOOOOOk',
      '.kkk.......kkk.',
      'ttttttttttttttt',
    ],
    pal: { O: '#E07B22', c: '#F6EEDC', t: '#7A6E62' },
  },
  // Marina Bay: sailboats along the boardwalk
  nquincy: {
    rows: [
      '...k......k....',
      '...kw.....kw...',
      '...kww....kww..',
      '...kwww...kwww.',
      '..kkkkk..kkkkk.',
      '.RRRRRRRtttttt.',
      'pppppppppppppp.',
      'WWWWWWWWWWWWWWW',
      'WwWWWWwWWWWwWWW',
    ],
    pal: { R: '#C0392B', t: '#2F6FD1', p: '#9A6A3A', W: '#4D99D7', w: '#F6EEDC' },
  },
  // Wollaston Beach: an umbrella on the sand by the water
  wollaston: {
    rows: [
      '.....RwRwR.....',
      '....RwRwRwR....',
      '.......k.......',
      '.......k.......',
      '.......k..cc...',
      'yyyyyyyyyyyyyyy',
      'yyyyyyyyyyyyyyy',
      'WWWWWWWWWWWWWWW',
      'WwWWWWWwWWWWwWW',
    ],
    pal: { R: '#DA291C', y: '#E5D29A', c: '#2F6FD1', W: '#4D99D7', w: '#F6EEDC' },
  },
  // Church of the Presidents: a granite temple front under a cupola
  quincy: {
    rows: [
      '......g......',
      '.....kgk.....',
      '.....sss.....',
      '....sbsbs....',
      '....sssss....',
      '...sssssss...',
      '..sssssssss..',
      '.sssssssssss.',
      '.swswswswsws.',
      '.swswswswsws.',
      '.sssssdsssss.',
      'kkkkkkkkkkkkk',
    ],
    pal: { s: '#B8B2A8', w: '#7E776B' },
  },
  // The Adams birthplaces: two saltbox farmhouses
  qadams: {
    rows: [
      '...kk...........',
      '..kRRk.....kk...',
      '.kRRRRk...kRRk..',
      'kRRRRRRk.kRRRRk.',
      'cccccccckRRRRRRk',
      'cbccbccccccccccc',
      'ccccccccbccbcccc',
      'ccdcccccccccdccc',
      'kkkkkkkkkkkkkkkk',
    ],
    pal: { R: '#5E5650', c: '#8C6A4E' },
  },
  // Braintree Town Hall: brick with a white clock tower
  braintree: {
    rows: [
      '.......k.......',
      '......www......',
      '......wcw......',
      '......www......',
      '.....wwwww.....',
      '.BBBBBBBBBBBBB.',
      '.BwBBwBBBwBBwB.',
      '.BwBBwBBBwBBwB.',
      '.BBBBBBBBBBBBB.',
      '.BBBBBwdwBBBBB.',
      'kkkkkkkkkkkkkkk',
    ],
    pal: { c: '#2B2B33' },
  },
}

/** Fallback for any station without a landmark yet. */
export const STATION: Sprite = {
  rows: [
    '...rrrrr...',
    '..rRRRRRr..',
    '.rRRRRRRRr.',
    'rrrrrrrrrrr',
    '.wwwwwwwww.',
    '.wbbwdwbbw.',
    '.wbbwdwbbw.',
    '.wwwwdwwww.',
    'kkkkkkkkkkk',
  ],
}

export const FLAG: Sprite = { rows: ['kgg..', 'kggg.', 'kgg..', 'k....', 'k....', 'k....'] }

export const RIDER: Sprite = {
  rows: ['.rrr.', 'rrrrr', '.fff.', '.fff.', '.ppp.', 'ppppp', '.p.p.', '.k.k.'],
  pal: { r: '#DA291C', f: '#F2C9A0', p: '#2F6FD1' },
}

export const ARROW: Sprite = {
  rows: ['..kkk..', '..kgk..', 'kkkgkkk', 'kgggggk', '.kgggk.', '..kgk..', '...k...'],
}

export const TREE: Sprite = { rows: ['.GGG.', 'GGlGG', 'GlGGG', '.GGG.', '..t..'] }
