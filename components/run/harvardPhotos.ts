
export type Photo = { src: string; alt: string; credit: string; position: string }

// Real photos from Wikimedia Commons; credits are shown wherever a photo is displayed.
export const HARVARD_PHOTOS = {
  statue: {
    src: '/art/harvard/statue.jpg',
    alt: 'The bronze John Harvard statue in Harvard Yard',
    credit: 'Photo: Crisco 1492 / Wikimedia Commons, CC BY-SA 4.0',
    position: '50% 0%',
  },
  widener: {
    src: '/art/harvard/widener.jpg',
    alt: 'The columned front of Widener Library at Harvard',
    credit: 'Photo: Kenneth C. Zirkel / Wikimedia Commons, CC BY 4.0',
    position: '50% 35%',
  },
  memorialHall: {
    src: '/art/harvard/memorial-hall.jpg',
    alt: 'The rose window and patterned roofs of Memorial Hall',
    credit: 'Photo: Ingfbruno / Wikimedia Commons, CC BY-SA 3.0',
    position: '50% 55%',
  },
  johnstonGate: {
    src: '/art/harvard/johnston-gate.jpg',
    alt: 'Johnston Gate, the brick and iron entrance to Harvard Yard',
    credit: 'Photo: John Phelan / Wikimedia Commons, CC BY 3.0',
    position: '50% 40%',
  },
} satisfies Record<string, Photo>

export const HARVARD_GALLERY: Photo[] = [
  HARVARD_PHOTOS.statue,
  HARVARD_PHOTOS.johnstonGate,
  HARVARD_PHOTOS.widener,
  HARVARD_PHOTOS.memorialHall,
]
