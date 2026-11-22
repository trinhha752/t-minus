// The real building behind each station's pixel landmark (see pixelSprites.ts), with one short
// fact and a real photo. Used by Landmark Match. Keep facts under ~120 characters so they fit
// the panel on a phone.
//
// Photos are from Wikimedia Commons (free licenses), saved in public/art/landmarks; show the
// credit wherever a photo is displayed.

export type LandmarkInfo = { name: string; fact: string; photo: { src: string; credit: string } }

export const LANDMARK_INFO: Record<string, LandmarkInfo> = {
  alewife: {
    name: 'Alewife Station',
    fact: 'Named for the alewife, a herring that still swims up Alewife Brook every spring.',
    photo: { src: '/art/landmarks/alewife.jpg', credit: "Photo: IliketrainsR211T / Wikimedia Commons, CC BY 4.0" },
  },
  davis: {
    name: 'Somerville Theatre',
    fact: 'Opened in 1914 and still showing movies and concerts in Davis Square.',
    photo: { src: '/art/landmarks/davis.jpg', credit: "Photo: Tim Pierce / Wikimedia Commons, CC BY-SA 3.0" },
  },
  porter: {
    name: 'Porter Exchange',
    fact: 'This Art Deco building opened in 1928 as a Sears store. Today it holds Lesley classes and a Japanese food hall.',
    photo: { src: '/art/landmarks/porter.jpg', credit: "Photo: Rhododendrites / Wikimedia Commons, CC BY-SA 4.0" },
  },
  harvard: {
    name: 'Harvard Yard',
    fact: 'Massachusetts Hall, built in 1720, is the oldest building still standing at Harvard.',
    photo: { src: '/art/harvard/johnston-gate.jpg', credit: "Photo: John Phelan / Wikimedia Commons, CC BY 3.0" },
  },
  central: {
    name: "Cambridge City Hall",
    fact: 'Finished in 1889 and paid for by Frederick Rindge, who gave the land and the building to the city.',
    photo: { src: '/art/landmarks/central.jpg', credit: "Photo: Beyond My Ken / Wikimedia Commons, CC BY-SA 4.0" },
  },
  kendall: {
    name: "MIT's Great Dome",
    fact: 'Built in 1916. Students once put a police car on top of it as a prank.',
    photo: { src: '/art/landmarks/kendall.jpg', credit: "Photo: Peacearth / Wikimedia Commons, CC BY-SA 4.0" },
  },
  charles: {
    name: 'Longfellow Bridge',
    fact: 'Opened in 1906. Locals call its four stone towers the "salt and pepper shakers."',
    photo: { src: '/art/landmarks/charles.jpg', credit: "Photo: Another Believer / Wikimedia Commons, CC BY-SA 4.0" },
  },
  park: {
    name: 'Massachusetts State House',
    fact: "Finished in 1798. Paul Revere's company covered the dome in copper; the gold came later.",
    photo: { src: '/art/landmarks/park.jpg', credit: "Photo: King of Hearts / Wikimedia Commons, CC BY-SA 4.0" },
  },
  downtown: {
    name: 'Old South Meeting House',
    fact: 'Built in 1729. The meeting that kicked off the Boston Tea Party started here in 1773.',
    photo: { src: '/art/landmarks/downtown.jpg', credit: "Photo: Crisco 1492 / Wikimedia Commons, CC BY-SA 4.0" },
  },
  south: {
    name: 'South Station',
    fact: "Opened in 1899 and still New England's busiest train station.",
    photo: { src: '/art/landmarks/south.jpg', credit: "Photo: ajay_suresh / Wikimedia Commons, CC BY 4.0" },
  },
  lechmere: {
    name: 'East Cambridge factories',
    fact: 'In the 1800s East Cambridge was a glassmaking center, with brick factories along the river.',
    photo: { src: '/art/landmarks/lechmere.jpg', credit: "Photo: Tim Pierce / Wikimedia Commons, CC BY-SA 3.0" },
  },
  science: {
    name: 'Museum of Science',
    fact: "Built right on top of the old Charles River Dam. Its planetarium opened in 1958.",
    photo: { src: '/art/landmarks/science.jpg', credit: "Photo: Daderot / Wikimedia Commons, Public domain" },
  },
  north: {
    name: 'TD Garden',
    fact: 'Home of the Celtics and Bruins since 1995, sitting right on top of North Station.',
    photo: { src: '/art/landmarks/north.jpg', credit: "Photo: ajay_suresh / Wikimedia Commons, CC BY 4.0" },
  },
  haymarket: {
    name: 'Haymarket',
    fact: "An open-air fruit and vegetable market every Friday and Saturday, running since the 1800s.",
    photo: { src: '/art/landmarks/haymarket.jpg', credit: "Photo: Daniel Brody / Wikimedia Commons, CC BY-SA 4.0" },
  },
  gov: {
    name: 'Boston City Hall',
    fact: 'Opened in 1968. Its concrete style is called Brutalism, and people either love it or hate it.',
    photo: { src: '/art/landmarks/gov.jpg', credit: "Photo: ajay_suresh / Wikimedia Commons, CC BY 4.0" },
  },
  boylston: {
    name: "Boston Common",
    fact: "America's oldest public park, set aside in 1634. Cows grazed here until 1830.",
    photo: { src: '/art/landmarks/boylston.jpg', credit: "Photo: Dariusz Jemielniak (\"Pundit\") / Wikimedia Commons, CC BY-SA 4.0" },
  },
  arlington: {
    name: 'Swan Boats',
    fact: 'Pedal-powered Swan Boats have floated in the Public Garden since 1877, run by the same family.',
    photo: { src: '/art/landmarks/arlington.jpg', credit: "Photo: King of Hearts / Wikimedia Commons, CC BY-SA 4.0" },
  },
  copley: {
    name: 'Trinity Church',
    fact: 'Finished in 1877. You can see it reflected in the glass of the Hancock Tower next door.',
    photo: { src: '/art/landmarks/copley.jpg', credit: "Photo: Carol M. Highsmith / Wikimedia Commons, Public domain" },
  },
  prudential: {
    name: 'Prudential Tower',
    fact: 'Opened in 1964 with 52 floors. The Skywalk near the top has views across the whole city.',
    photo: { src: '/art/landmarks/prudential.jpg', credit: "Photo: King of Hearts / Wikimedia Commons, CC BY-SA 4.0" },
  },
  fenway: {
    name: 'Fenway Park',
    fact: 'Opened in 1912, the oldest ballpark in the majors. The Green Monster wall is 37 feet tall.',
    photo: { src: '/art/landmarks/fenway.jpg', credit: "Photo: Zoke / Wikimedia Commons, CC BY-SA 4.0" },
  },
  kenmore: {
    name: 'The Citgo Sign',
    fact: 'Lit up over Kenmore Square since 1965. Fans watch for it from inside Fenway Park.',
    photo: { src: '/art/landmarks/kenmore.jpg', credit: "Photo: Beyond My Ken / Wikimedia Commons, CC BY-SA 4.0" },
  },
  hynes: {
    name: 'Berklee College of Music',
    fact: 'Founded in 1945. Tons of famous musicians studied here, just around the corner from the station.',
    photo: { src: '/art/landmarks/hynes.jpg', credit: "Photo: John Phelan / Wikimedia Commons, CC BY 3.0" },
  },
  blandford: {
    name: 'Blandford Street portal',
    fact: 'Where B trains climb out of the tunnel and run up the middle of Commonwealth Avenue.',
    photo: { src: '/art/landmarks/blandford.jpg', credit: "Photo: Pi.1415926535 / Wikimedia Commons, CC BY-SA 3.0" },
  },
  bueast: {
    name: 'Automobile Row',
    fact: 'In the early 1900s Comm Ave was lined with car showrooms. Boston University uses many of them now.',
    photo: { src: '/art/landmarks/bueast.jpg', credit: "Photo: Pi.1415926535 / Wikimedia Commons, CC BY-SA 3.0" },
  },
  bucentral: {
    name: 'Marsh Chapel',
    fact: 'Martin Luther King Jr. earned his PhD at BU in 1955. A sculpture in front of the chapel honors him.',
    photo: { src: '/art/landmarks/bucentral.jpg', credit: "Photo: John Phelan / Wikimedia Commons, CC BY 3.0" },
  },
  amory: {
    name: 'Student Village',
    fact: "BU's tall glass dorm towers, with views over the Charles River and Fenway Park.",
    photo: { src: '/art/landmarks/amory.jpg', credit: "Photo: WLP / Wikimedia Commons, CC BY-SA 3.0" },
  },
  babcock: {
    name: 'Braves Field',
    fact: "The Boston Braves played here from 1915 to 1952. It's now BU's Nickerson Field.",
    photo: { src: '/art/landmarks/babcock.jpg', credit: "Photo: Unknown author / Wikimedia Commons, CC BY 2.0" },
  },
  packards: {
    name: "Packard's Corner",
    fact: 'Named after a horse stable that stood here in the 1800s, before cars ever came along.',
    photo: { src: '/art/landmarks/packards.jpg', credit: "Photo: Pi.1415926535 / Wikimedia Commons, CC BY-SA 3.0" },
  },
  harvardave: {
    name: 'Allston triple-deckers',
    fact: 'On September 1st, moving day, so much furniture lands on the curb that locals call it "Allston Christmas."',
    photo: { src: '/art/landmarks/harvardave.jpg', credit: "Photo: Ethan Long / Wikimedia Commons, CC BY-SA 2.0" },
  },
  stmarys: {
    name: "Beacon Street rowhouses",
    fact: "Boston's first electric streetcars ran past these blocks on Beacon Street in 1889.",
    photo: { src: '/art/landmarks/stmarys.jpg', credit: "Photo: Pi.1415926535 / Wikimedia Commons, CC BY-SA 3.0" },
  },
  hawes: {
    name: "Temple Ohabei Shalom",
    fact: "Home of Boston's oldest Jewish congregation, founded in 1842. Its domed temple opened in 1928.",
    photo: { src: '/art/landmarks/hawes.jpg', credit: "Photo: Whoisjohngalt / Wikimedia Commons, CC BY-SA 4.0" },
  },
  kent: {
    name: "Richmond Court",
    fact: "A brick apartment courtyard from about 1900, built to look like an English manor behind iron gates.",
    photo: { src: '/art/landmarks/kent.jpg', credit: "Photo: Thomas Kelley from Boston, MA / Wikimedia Commons, CC BY-SA 2.0" },
  },
  stpaul: {
    name: "St. Paul's Church",
    fact: "A stone church from the 1850s by Richard Upjohn, the architect of Trinity Church in New York.",
    photo: { src: '/art/landmarks/stpaul.jpg', credit: "Photo: John Phelan / Wikimedia Commons, CC BY 3.0" },
  },
  coolidge: {
    name: 'Coolidge & Brother store',
    fact: 'Coolidge Corner is named after a general store that opened here in 1857.',
    photo: { src: '/art/landmarks/coolidge.jpg', credit: "Photo: Ddogas / Wikimedia Commons, CC BY-SA 3.0" },
  },
  northeastern: {
    name: "Northeastern University",
    fact: "Founded in 1898 at the Boston YMCA. Its co-op program has students work real jobs between semesters.",
    photo: { src: '/art/landmarks/northeastern.jpg', credit: "Photo: ajay_suresh / Wikimedia Commons, CC BY 4.0" },
  },
  mfa: {
    name: 'Museum of Fine Arts',
    fact: 'Moved into its Huntington Avenue building in 1909. It holds nearly 500,000 works of art.',
    photo: { src: '/art/landmarks/mfa.jpg', credit: "Photo: ajay_suresh / Wikimedia Commons, CC BY 4.0" },
  },
}
