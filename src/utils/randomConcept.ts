const CONCEPTS = [
  "Forgotten Cathedrals Beneath Ocean",
  "Solar Nomads Crossing Crystal Dunes",
  "Mechanical Forests of Neon Rain",
  "Clockwork Cities in the Clouds",
  "Subterranean Libraries of Whispering Stones",
  "Glacial Deserts Lit by Bioluminescent Fungi",
  "Astral Marketplaces on Floating Islands",
  "Quantum Gardens of Fractal Flowers",
  "Haunted Observatories on the Moon",
  "Chromatic Rivers Flowing Upward",
  "Desolate Highways Through Electric Storms",
  "Mirrored Jungles of Infinite Reflections",
  "Volcanic Archives of Living Scrolls",
  "Ruined Starships Buried in Sand",
  "Crystal Caverns Echoing with Time",
  "Eternal Carnivals in Orbit",
  "Ancient Robots Tending Solar Fields",
  "Frozen Thunderstorms Above Black Seas",
  "Starlit Temples Carved into Comets",
  "Singing Mountains of Hollow Glass"
];

export function getRandomConcept(): string {
  return CONCEPTS[Math.floor(Math.random() * CONCEPTS.length)];
}

export default getRandomConcept;
