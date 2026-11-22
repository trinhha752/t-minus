// Rounds for "Two Lies and a Truth": every round shows one true statement and two lies, and
// the rider has to find the truth. The true statements come from the station's landmark fact
// (landmarks.ts) and its local story (stations.ts), plus well-known facts about the place.
//
// Stations listed here play this game; every other station plays Landmark Match.

export type TruthRound = { topic: string; truth: string; lies: [string, string] }

export const TRUTH_ROUNDS: Record<string, TruthRound[]> = {
  // ---- Red Line ----
  davis: [
    {
      topic: 'Somerville Theatre',
      truth: 'The Somerville Theatre opened in 1914 and still shows movies.',
      lies: ['The Somerville Theatre opened in 1994.', 'The Somerville Theatre only shows silent films.'],
    },
    {
      topic: 'Davis Square',
      truth: 'Davis Square was a busy rail crossing before it was a music hub.',
      lies: ['Davis Square is named after Jefferson Davis.', 'Davis Square was built on an old airport runway.'],
    },
    {
      topic: 'The station',
      truth: 'Davis station opened in 1984, when the Red Line was extended past Harvard.',
      lies: ['Davis station opened in 1897 as the first subway stop.', 'Davis is the last stop at the end of the Red Line.'],
    },
  ],
  harvard: [
    {
      topic: 'The statue',
      truth: 'The John Harvard statue was made in 1884.',
      lies: ['Harvard was founded in 1638.', 'The statue was copied from a portrait painted in John Harvard\'s lifetime.'],
    },
    {
      topic: 'John Harvard',
      truth: 'John Harvard left the college his library and half his estate.',
      lies: ['John Harvard was the college\'s first president.', 'John Harvard lived to see the college named after him.'],
    },
    {
      topic: 'Harvard Yard',
      truth: 'Massachusetts Hall, built in 1720, is the oldest building still standing at Harvard.',
      lies: ['The statue has always stood in front of University Hall.', 'Visitors rub the statue\'s right ear for luck.'],
    },
  ],
  kendall: [
    {
      topic: "MIT's Great Dome",
      truth: "MIT's Great Dome was built in 1916.",
      lies: ['The Great Dome is covered in real gold leaf.', 'The Great Dome was built in 1816.'],
    },
    {
      topic: 'The big move',
      truth: 'MIT moved across the river from Boston to Cambridge in 1916.',
      lies: ['MIT started out in New York City.', 'MIT has always been in Cambridge.'],
    },
    {
      topic: 'Pranks',
      truth: 'MIT students once put a police car on top of the Great Dome.',
      lies: ['The Great Dome is taller than the Prudential Tower.', "The Great Dome is MIT's football stadium."],
    },
  ],
  park: [
    {
      topic: 'The State House dome',
      truth: "Paul Revere's company covered the State House dome in copper.",
      lies: ['The State House dome is made of solid gold.', 'The State House was finished in 1898.'],
    },
    {
      topic: "America's first subway",
      truth: "Park Street opened in 1897 as part of America's first subway tunnel.",
      lies: ["America's first subway opened in New York, and Boston copied it.", 'Park Street opened in 1950.'],
    },
    {
      topic: 'Park Street',
      truth: 'Park Street is where the Red and Green lines meet.',
      lies: ['Park Street is where the Orange and Blue lines meet.', 'Park Street is under Boston Harbor.'],
    },
  ],
  south: [
    {
      topic: 'Opening day',
      truth: 'South Station opened in 1899.',
      lies: ['South Station opened in 1999.', 'South Station only has buses, not trains.'],
    },
    {
      topic: 'Busy station',
      truth: "South Station is New England's busiest train station.",
      lies: ['South Station is the smallest stop on the Red Line.', 'South Station is named after a man named John South.'],
    },
    {
      topic: 'North and South',
      truth: 'A stone eagle sits on top of the clock on South Station\'s front.',
      lies: ['A train tunnel connects North Station and South Station.', 'South Station is built completely underground.'],
    },
  ],
  andrew: [
    {
      topic: 'The name',
      truth: 'Andrew Square is named for John Andrew, the Civil War governor of Massachusetts.',
      lies: ['Andrew Square is named for President Andrew Jackson.', 'Andrew Square is named for a sailor who found the harbor.'],
    },
    {
      topic: 'The 54th',
      truth: 'The 54th Massachusetts was one of the first Black regiments in the Civil War.',
      lies: ['The 54th Massachusetts fought in the American Revolution.', 'The 54th Massachusetts was a navy unit on warships.'],
    },
    {
      topic: 'The memorial',
      truth: 'The 54th Regiment Memorial was sculpted by Augustus Saint-Gaudens.',
      lies: ['The memorial was sculpted by Paul Revere.', 'The memorial was put up in 2010.'],
    },
  ],
  savin: [
    {
      topic: 'The name',
      truth: 'Savin Hill is named after the savin, a kind of red cedar.',
      lies: ['Savin Hill is named after a family called the Savins.', 'Savin Hill is named after a ship that sank in the bay.'],
    },
    {
      topic: 'The hill',
      truth: 'From the top of Savin Hill you can see across Dorchester Bay to downtown.',
      lies: ['Savin Hill is the tallest mountain in Massachusetts.', 'Savin Hill is an island you can only reach by ferry.'],
    },
    {
      topic: 'Dorchester',
      truth: 'Dorchester was founded in 1630, the same year as Boston.',
      lies: ['Dorchester was founded in 1930.', 'Dorchester is its own city, separate from Boston.'],
    },
  ],
  shawmut: [
    {
      topic: 'The name',
      truth: 'Shawmut was the Native name for the peninsula that became Boston.',
      lies: ['Shawmut is a Dutch word for "harbor".', "Shawmut was the name of Boston's first mayor."],
    },
    {
      topic: 'Triple-deckers',
      truth: 'A triple-decker is a house with three apartments stacked on top of each other.',
      lies: ['A triple-decker is a church with three steeples.', 'Triple-deckers were all built after the year 2000.'],
    },
    {
      topic: 'Building boom',
      truth: 'Many triple-deckers went up around 1900, as streetcar lines reached Dorchester.',
      lies: ['Triple-deckers were built as hotels for sailors.', 'Triple-deckers are made of solid granite blocks.'],
    },
  ],
  nquincy: [
    {
      topic: 'The station',
      truth: 'The Red Line reached Quincy in 1971, when North Quincy opened.',
      lies: ['North Quincy opened in 1871.', 'North Quincy is a stop on the Orange Line.'],
    },
    {
      topic: 'Marina Bay',
      truth: 'Marina Bay was built where a Navy air station once stood.',
      lies: ['Marina Bay was once a coal mine.', 'Marina Bay was built on top of an old ballpark.'],
    },
    {
      topic: 'Quincy',
      truth: 'Quincy is called the City of Presidents.',
      lies: ['Quincy is an island in Boston Harbor.', 'Quincy is named after Quincy Market in Boston.'],
    },
  ],
  quincy: [
    {
      topic: 'The church',
      truth: 'John Adams and John Quincy Adams are buried in the church in Quincy Center.',
      lies: ['George Washington is buried in Quincy Center.', 'The Church of the Presidents is made of red brick.'],
    },
    {
      topic: 'Built to last',
      truth: 'The Church of the Presidents was built in 1828 from Quincy granite.',
      lies: ['The church was built in 1928 from steel.', 'The church was built in 1628 by the Pilgrims.'],
    },
    {
      topic: 'Quincy granite',
      truth: 'Granite from Quincy was used to build the Bunker Hill Monument.',
      lies: ["Quincy's quarries mostly dug up gold and silver.", 'Quincy granite was carried to Boston by airplane.'],
    },
  ],
  braintree: [
    {
      topic: 'End of the line',
      truth: 'Braintree became the end of the Red Line in 1980.',
      lies: ['Braintree has been the end of the line since 1897.', 'The Red Line keeps going past Braintree to Cape Cod.'],
    },
    {
      topic: 'John Adams',
      truth: 'John Adams was born in 1735 in a part of Braintree that later became Quincy.',
      lies: ['John Adams was born in New York City.', 'John Adams was born in 1835.'],
    },
    {
      topic: 'The town',
      truth: 'Quincy split off from Braintree in 1792.',
      lies: ['Braintree is named after a famous oak tree in town.', 'Braintree is the capital of Massachusetts.'],
    },
  ],

  // ---- Green Line ----
  science: [
    {
      topic: 'Museum of Science',
      truth: 'The Museum of Science sits on top of the old Charles River Dam.',
      lies: ['The Museum of Science floats on a giant barge.', 'The Museum of Science is under Boston Common.'],
    },
    {
      topic: 'The planetarium',
      truth: "The museum's planetarium opened in 1958.",
      lies: ['The planetarium opened in 1858.', 'The planetarium is named after an astronaut.'],
    },
    {
      topic: 'Science Park',
      truth: 'Science Park station is on the Green Line.',
      lies: ['Science Park is the oldest station in Boston.', 'Science Park station is in a tunnel under the river.'],
    },
  ],
  haymarket: [
    {
      topic: 'Market days',
      truth: "Haymarket's fruit and vegetable stalls are open on Fridays and Saturdays.",
      lies: ['Haymarket is only open on Mondays.', 'Haymarket only sells hay.'],
    },
    {
      topic: 'Old market',
      truth: "Haymarket's vendors have sold produce in the open air for about 200 years.",
      lies: ['Haymarket started in 1990.', 'Haymarket moved here from New York in 1950.'],
    },
    {
      topic: 'The station',
      truth: 'Haymarket station is on both the Orange and Green lines.',
      lies: ['Haymarket is a stop on the Red Line.', 'Haymarket is a stop on the Mattapan trolley.'],
    },
  ],
  arlington: [
    {
      topic: 'Swan Boats',
      truth: 'The Swan Boats have floated in the Public Garden since 1877.',
      lies: ['The Swan Boats started in 1977.', 'The Swan Boats are pulled by real swans.'],
    },
    {
      topic: 'Pedal power',
      truth: 'A driver sitting in the back pedals each Swan Boat.',
      lies: ['The Swan Boats have run on motors since 1900.', 'The Swan Boats sail out into Boston Harbor.'],
    },
    {
      topic: 'Family business',
      truth: 'The same family has run the Swan Boats since they started.',
      lies: ['The city picks a new company to run them every year.', 'The Swan Boats only run in the winter.'],
    },
  ],
  hynes: [
    {
      topic: 'The name',
      truth: "Hynes is named for John B. Hynes, Boston's mayor in the 1950s.",
      lies: ['Hynes is named after a famous Red Sox pitcher.', 'Hynes is named after a river in Ireland.'],
    },
    {
      topic: 'Berklee',
      truth: 'Berklee College of Music was founded in 1945.',
      lies: ['Berklee was founded in 1745.', 'Berklee only teaches painting.'],
    },
    {
      topic: 'The station',
      truth: 'Hynes Convention Center is a Green Line stop near Newbury Street.',
      lies: ['Hynes is the last stop on the B branch.', 'Hynes is a stop on the Red Line.'],
    },
  ],
  blandford: [
    {
      topic: 'The portal',
      truth: 'B trains come out of the tunnel near here and run along Commonwealth Avenue.',
      lies: ['B trains stay underground all the way to Boston College.', 'B trains run on rubber tires.'],
    },
    {
      topic: 'The B branch',
      truth: 'The B branch ends at Boston College.',
      lies: ['The B branch ends at Alewife.', 'The B branch ends at the airport.'],
    },
    {
      topic: 'Neighbors',
      truth: 'Blandford Street is right next to Boston University.',
      lies: ['Blandford Street is in downtown Quincy.', 'Blandford is named after a Red Sox pitcher.'],
    },
  ],
  bucentral: [
    {
      topic: 'Dr. King',
      truth: 'Martin Luther King Jr. earned his PhD at Boston University in 1955.',
      lies: ['Martin Luther King Jr. earned his PhD at BU in 1985.', 'Martin Luther King Jr. studied engineering at BU.'],
    },
    {
      topic: 'Marsh Plaza',
      truth: 'A sculpture of flying doves in Marsh Plaza honors Martin Luther King Jr.',
      lies: ['Marsh Chapel was built in 1655.', 'Marsh Chapel sits on an island in a lake.'],
    },
    {
      topic: 'The legend',
      truth: "BU legend says if you step on the seal in Marsh Plaza, you won't graduate in four years.",
      lies: ['Legend says stepping on the seal makes you rich.', 'Legend says the seal glows on the first day of class.'],
    },
  ],
  babcock: [
    {
      topic: 'Braves Field',
      truth: 'The Boston Braves played at Braves Field from 1915 to 1952.',
      lies: ['The Red Sox still play at Braves Field.', 'Braves Field was built in 1990.'],
    },
    {
      topic: 'The longest game',
      truth: 'In 1920 the Braves and Brooklyn played 26 innings before darkness ended it in a tie.',
      lies: ['In 1920 a game here lasted only one inning.', 'In 1920 a game here was stopped by snow in July.'],
    },
    {
      topic: 'What happened next',
      truth: "Braves Field is now Boston University's Nickerson Field.",
      lies: ['Braves Field is now a parking lot at Fenway.', 'The Braves moved from Boston to Chicago.'],
    },
  ],
  harvardave: [
    {
      topic: 'Allston Christmas',
      truth: 'On September 1, so much furniture is left on the curbs that locals call it "Allston Christmas."',
      lies: ['"Allston Christmas" is a parade on December 1.', '"Allston Christmas" is a day of free T rides.'],
    },
    {
      topic: 'Moving day',
      truth: "September 1 is Boston's biggest moving day, because so many leases start then.",
      lies: ["Boston's biggest moving day is New Year's Day.", 'In Boston, moving is only allowed on Sundays.'],
    },
    {
      topic: 'The station',
      truth: 'Harvard Avenue is on the B branch of the Green Line.',
      lies: ['Harvard Avenue station is inside Harvard Yard.', 'Harvard Avenue is the last stop on the Red Line.'],
    },
  ],
  hawes: [
    {
      topic: 'Ohabei Shalom',
      truth: 'Ohabei Shalom is the oldest Jewish congregation in the Boston area, started in the 1840s.',
      lies: ['Ohabei Shalom was started in the 1940s.', 'Ohabei Shalom started in Chicago.'],
    },
    {
      topic: 'The temple',
      truth: 'Temple Ohabei Shalom is topped by a big copper dome.',
      lies: ['The temple building opened in 2018.', 'The temple is a glass skyscraper.'],
    },
    {
      topic: 'The station',
      truth: 'Hawes Street is a stop on the C branch of the Green Line.',
      lies: ['Hawes Street is on the Red Line.', 'Hawes Street is an underground station.'],
    },
  ],
  stpaul: [
    {
      topic: 'Two stops',
      truth: 'Until 2021 the Green Line had two different St. Paul Street stops.',
      lies: ['St. Paul Street opened in 2021.', 'St. Paul Street is the only stop named after a saint.'],
    },
    {
      topic: "St. Paul's Church",
      truth: "St. Paul's Church was designed by Richard Upjohn.",
      lies: ["St. Paul's Church was designed by the architect of the Eiffel Tower.", "St. Paul's Church is made of glass and steel."],
    },
    {
      topic: 'The architect',
      truth: 'Richard Upjohn also designed Trinity Church in New York.',
      lies: ['Richard Upjohn designed Trinity Church in Boston.', 'Richard Upjohn designed the State House.'],
    },
  ],
  fenway: [
    {
      topic: 'Fenway Park',
      truth: 'Fenway Park opened in 1912, the oldest ballpark in the major leagues.',
      lies: ['Fenway Park opened in 1992.', 'Fenway Park is younger than Yankee Stadium.'],
    },
    {
      topic: 'The Green Monster',
      truth: 'The Green Monster wall in left field is 37 feet tall.',
      lies: ['The Green Monster is in right field.', 'The Green Monster is 137 feet tall.'],
    },
    {
      topic: 'The red seat',
      truth: "One red seat marks where Ted Williams's 502-foot home run landed in 1946.",
      lies: ['The red seat marks where Babe Ruth always sat.', 'The red seat is saved for the team mascot.'],
    },
  ],
  northeastern: [
    {
      topic: 'World Series',
      truth: 'The first modern World Series was played near here in 1903, at the Huntington Avenue Grounds.',
      lies: ['The first World Series was played at Fenway Park.', 'The first World Series was played in 1953.'],
    },
    {
      topic: 'Northeastern',
      truth: 'Northeastern University was founded in 1898 at the Boston YMCA.',
      lies: ['Northeastern was founded in 1998.', 'Northeastern was founded on a ship.'],
    },
    {
      topic: 'Co-op',
      truth: "Northeastern's co-op program has students work real jobs between semesters.",
      lies: ['Northeastern students must live on a farm.', 'Northeastern is in New York.'],
    },
  ],

  // ---- Orange Line ----
  ccollege: [
    {
      topic: 'The battle',
      truth: "The Battle of Bunker Hill was mostly fought on Breed's Hill.",
      lies: ['The Americans won the Battle of Bunker Hill.', 'Bunker Hill is in New Hampshire.'],
    },
    {
      topic: 'The monument',
      truth: 'You can climb 294 steps to the top of the Bunker Hill Monument.',
      lies: ['The Bunker Hill Monument is made of wood.', 'The Bunker Hill Monument is 22 feet tall.'],
    },
    {
      topic: 'When',
      truth: 'The Battle of Bunker Hill was fought in 1775.',
      lies: ['The Battle of Bunker Hill was fought in 1812.', 'The monument was finished in 1975.'],
    },
  ],
  backbay: [
    {
      topic: 'Back Bay',
      truth: 'Back Bay was once a real bay, filled in during the 1800s.',
      lies: ['Back Bay was built on an old airport.', 'Back Bay is the oldest part of Boston.'],
    },
    {
      topic: 'Hancock Tower',
      truth: "The Hancock Tower is Boston's tallest building, at 790 feet.",
      lies: ['The Hancock Tower is 7,900 feet tall.', 'The Hancock Tower is made of red brick.'],
    },
    {
      topic: 'Falling windows',
      truth: 'Soon after the Hancock Tower opened, its windows started falling out.',
      lies: ['The Hancock Tower has no windows at all.', 'The Hancock Tower was built in 1876.'],
    },
  ],
  foresthills: [
    {
      topic: 'Arnold Arboretum',
      truth: 'Harvard founded the Arnold Arboretum in 1872.',
      lies: ['MIT founded the Arnold Arboretum in 1972.', 'The Arnold Arboretum is a zoo for wild animals.'],
    },
    {
      topic: 'Visiting',
      truth: 'The Arnold Arboretum is free and open every day.',
      lies: ['Tickets to the Arboretum cost $100.', 'The Arboretum is only open one day a year.'],
    },
    {
      topic: 'The station',
      truth: 'Forest Hills is the last stop at the south end of the Orange Line.',
      lies: ['Forest Hills is a stop on the Red Line.', 'Forest Hills is in the middle of the Orange Line.'],
    },
  ],
}
