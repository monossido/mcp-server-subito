import type { Category } from "../types.js";

export const CATEGORIES: Category[] = [
  {
    id: 1,
    name: "Motori",
    slug: "motori",
    subcategories: [
      { id: 2, name: "Auto", slug: "auto" },
      { id: 3, name: "Moto e Scooter", slug: "moto-e-scooter" },
      { id: 4, name: "Veicoli commerciali", slug: "veicoli-commerciali" },
      { id: 5, name: "Accessori Auto", slug: "accessori-auto" },
      { id: 46, name: "Accessori Moto", slug: "accessori-moto" },
      { id: 34, name: "Caravan e Camper", slug: "caravan-e-camper" },
      { id: 50, name: "Nautica", slug: "nautica" },
      { id: 57, name: "Biciclette", slug: "biciclette" },
      { id: 58, name: "Monopattini elettrici", slug: "monopattini-elettrici" },
      { id: 36, name: "Altri Veicoli", slug: "altri-veicoli" },
    ],
  },
  {
    id: 6,
    name: "Immobili",
    slug: "immobili",
    subcategories: [
      { id: 7, name: "Appartamenti", slug: "appartamenti" },
      { id: 37, name: "Case indipendenti", slug: "case-indipendenti" },
      { id: 38, name: "Stanze e Posti letto", slug: "stanze-e-posti-letto" },
      { id: 8, name: "Uffici e Locali commerciali", slug: "uffici-e-locali-commerciali" },
      { id: 35, name: "Terreni e Rustici", slug: "terreni-e-rustici" },
      { id: 40, name: "Garage e Box", slug: "garage-e-box" },
      { id: 33, name: "Case vacanza", slug: "case-vacanza" },
    ],
  },
  {
    id: 9,
    name: "Elettronica",
    slug: "elettronica",
    subcategories: [
      { id: 10, name: "Informatica", slug: "informatica" },
      { id: 11, name: "Audio/Video", slug: "audio-video" },
      { id: 12, name: "Telefonia", slug: "telefonia" },
      { id: 44, name: "Console e Videogiochi", slug: "console-e-videogiochi" },
      { id: 45, name: "Fotografia", slug: "fotografia" },
    ],
  },
  {
    id: 13,
    name: "Per la Casa e la Persona",
    slug: "per-la-casa-e-la-persona",
    subcategories: [
      { id: 14, name: "Arredamento e Casalinghi", slug: "arredamento-e-casalinghi" },
      { id: 15, name: "Giardino e Fai da te", slug: "giardino-e-fai-da-te" },
      { id: 16, name: "Abbigliamento e Accessori", slug: "abbigliamento-e-accessori" },
      { id: 47, name: "Tutto per i bambini", slug: "tutto-per-i-bambini" },
    ],
  },
  {
    id: 18,
    name: "Sports e Hobby",
    slug: "sports-e-hobby",
    subcategories: [
      { id: 39, name: "Strumenti Musicali", slug: "strumenti-musicali" },
      { id: 41, name: "Sport", slug: "sport" },
      { id: 42, name: "Libri e Riviste", slug: "libri-e-riviste" },
      { id: 43, name: "Film, Musica e Giochi", slug: "film-musica-e-giochi" },
      { id: 48, name: "Collezionismo", slug: "collezionismo" },
      { id: 56, name: "Animali", slug: "animali" },
    ],
  },
  {
    id: 23,
    name: "Lavoro",
    slug: "lavoro",
    subcategories: [
      { id: 24, name: "Offerte di lavoro", slug: "offerte-di-lavoro" },
      { id: 25, name: "Candidati in cerca di lavoro", slug: "candidati-in-cerca-di-lavoro" },
      { id: 49, name: "Attrezzature di lavoro", slug: "attrezzature-di-lavoro" },
    ],
  },
  {
    id: 28,
    name: "Corsi e Lezioni",
    slug: "corsi-e-lezioni",
  },
  {
    id: 29,
    name: "Servizi",
    slug: "servizi",
    subcategories: [
      { id: 30, name: "Servizi vari", slug: "servizi-vari" },
      { id: 31, name: "Viaggi", slug: "viaggi" },
    ],
  },
  {
    id: 32,
    name: "Altre categorie",
    slug: "altre-categorie",
  },
];

export function getCategoryById(id: number): Category | undefined {
  for (const cat of CATEGORIES) {
    if (cat.id === id) return cat;
    if (cat.subcategories) {
      const sub = cat.subcategories.find((s) => s.id === id);
      if (sub) return sub;
    }
  }
  return undefined;
}

export function findCategoryByName(name: string): Category[] {
  const lower = name.toLowerCase();
  const results: Category[] = [];
  for (const cat of CATEGORIES) {
    if (cat.name.toLowerCase().includes(lower)) {
      results.push(cat);
    }
    if (cat.subcategories) {
      for (const sub of cat.subcategories) {
        if (sub.name.toLowerCase().includes(lower)) {
          results.push(sub);
        }
      }
    }
  }
  return results;
}
