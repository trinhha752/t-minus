// The real building behind each station's pixel landmark (see pixelSprites.ts), with one short
// fact. Shown when you match a pair in Landmark Match. Keep facts under ~120 characters so they
// fit the panel on a phone.

export const LANDMARK_INFO: Record<string, { name: string; fact: string }> = {
  alewife: {
    name: 'Alewife Station',
    fact: 'Named for the alewife, a herring that still swims up Alewife Brook every spring.',
  },
  davis: {
    name: 'Somerville Theatre',
    fact: 'Opened in 1914 and still showing movies and concerts in Davis Square.',
  },
  porter: {
    name: 'Porter Exchange',
    fact: 'This Art Deco building opened in 1928 as a Sears store. Today it holds Lesley classes and a Japanese food hall.',
  },
  harvard: {
    name: 'Harvard Yard',
    fact: 'Massachusetts Hall, built in 1720, is the oldest building still standing at Harvard.',
  },
  central: {
    name: 'Cambridge City Hall',
    fact: 'Finished in 1889 and paid for by Frederick Rindge, who gave the land and the building to the city.',
  },
  kendall: {
    name: "MIT's Great Dome",
    fact: 'Built in 1916. Students once put a police car on top of it as a prank.',
  },
  charles: {
    name: 'Longfellow Bridge',
    fact: 'Opened in 1906. Locals call its four stone towers the "salt and pepper shakers."',
  },
  park: {
    name: 'Massachusetts State House',
    fact: "Finished in 1798. Paul Revere's company covered the dome in copper; the gold came later.",
  },
  downtown: {
    name: 'Old South Meeting House',
    fact: 'Built in 1729. The meeting that kicked off the Boston Tea Party started here in 1773.',
  },
  south: {
    name: 'South Station',
    fact: "Opened in 1899 and still New England's busiest train station.",
  },
  lechmere: {
    name: 'East Cambridge factories',
    fact: 'In the 1800s East Cambridge was a glassmaking center, with brick factories along the river.',
  },
  science: {
    name: 'Museum of Science',
    fact: "Built right on top of the old Charles River Dam. Its planetarium opened in 1958.",
  },
  north: {
    name: 'TD Garden',
    fact: 'Home of the Celtics and Bruins since 1995, sitting right on top of North Station.',
  },
  haymarket: {
    name: 'Haymarket',
    fact: "An open-air fruit and vegetable market every Friday and Saturday, running since the 1800s.",
  },
  gov: {
    name: 'Boston City Hall',
    fact: 'Opened in 1968. Its concrete style is called Brutalism, and people either love it or hate it.',
  },
  boylston: {
    name: 'Boylston Station',
    fact: "Part of America's first subway, opened in 1897. The granite entrances are still there.",
  },
  arlington: {
    name: 'Swan Boats',
    fact: 'Pedal-powered Swan Boats have floated in the Public Garden since 1877, run by the same family.',
  },
  copley: {
    name: 'Trinity Church',
    fact: 'Finished in 1877. You can see it reflected in the glass of the Hancock Tower next door.',
  },
  prudential: {
    name: 'Prudential Tower',
    fact: 'Opened in 1964 with 52 floors. The Skywalk near the top has views across the whole city.',
  },
  fenway: {
    name: 'Fenway Park',
    fact: 'Opened in 1912, the oldest ballpark in the majors. The Green Monster wall is 37 feet tall.',
  },
  kenmore: {
    name: 'The Citgo Sign',
    fact: 'Lit up over Kenmore Square since 1965. Fans watch for it from inside Fenway Park.',
  },
  hynes: {
    name: 'Berklee College of Music',
    fact: 'Founded in 1945. Tons of famous musicians studied here, just around the corner from the station.',
  },
  blandford: {
    name: 'Blandford Street portal',
    fact: 'Where B trains climb out of the tunnel and run up the middle of Commonwealth Avenue.',
  },
  bueast: {
    name: 'Automobile Row',
    fact: 'In the early 1900s Comm Ave was lined with car showrooms. Boston University uses many of them now.',
  },
  bucentral: {
    name: 'Marsh Chapel',
    fact: 'Martin Luther King Jr. earned his PhD at BU in 1955. A sculpture in front of the chapel honors him.',
  },
  amory: {
    name: 'Student Village',
    fact: "BU's tall glass dorm towers, with views over the Charles River and Fenway Park.",
  },
  babcock: {
    name: 'Braves Field',
    fact: "The Boston Braves played here from 1915 to 1952. It's now BU's Nickerson Field.",
  },
  packards: {
    name: "Packard's Corner",
    fact: 'Named after a horse stable that stood here in the 1800s, before cars ever came along.',
  },
  harvardave: {
    name: 'Allston triple-deckers',
    fact: 'On September 1st, moving day, so much furniture lands on the curb that locals call it "Allston Christmas."',
  },
  stmarys: {
    name: 'Electric streetcar',
    fact: "Boston's first electric streetcars ran along Beacon Street in 1889.",
  },
  hawes: {
    name: 'Hawes Street stop',
    fact: 'One of the quietest stops on the C line. The stations on Beacon Street are only a few blocks apart.',
  },
  kent: {
    name: 'Beacon Street brownstones',
    fact: "Beacon Street was widened into a grand boulevard in the 1880s, with Frederick Law Olmsted's help.",
  },
  stpaul: {
    name: 'St. Paul Street (twice!)',
    fact: 'There are two stops named St. Paul Street, one on the B line and one on the C line.',
  },
  coolidge: {
    name: 'Coolidge & Brother store',
    fact: 'Coolidge Corner is named after a general store that opened here in 1857.',
  },
  northeastern: {
    name: 'Huntington Avenue Grounds',
    fact: 'The first World Series game was played here in 1903. A Cy Young statue marks the old mound.',
  },
  mfa: {
    name: 'Museum of Fine Arts',
    fact: 'Moved into its Huntington Avenue building in 1909. It holds nearly 500,000 works of art.',
  },
}
