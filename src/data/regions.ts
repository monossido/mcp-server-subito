import type { Region } from "../types.js";

export const REGIONS: Region[] = [
  {
    id: 1,
    name: "Valle d'Aosta",
    provinces: [{ id: 100, name: "Aosta", shortCode: "AO" }],
  },
  {
    id: 2,
    name: "Piemonte",
    provinces: [
      { id: 1, name: "Torino", shortCode: "TO" },
      { id: 2, name: "Vercelli", shortCode: "VC" },
      { id: 3, name: "Novara", shortCode: "NO" },
      { id: 4, name: "Cuneo", shortCode: "CN" },
      { id: 5, name: "Asti", shortCode: "AT" },
      { id: 6, name: "Alessandria", shortCode: "AL" },
      { id: 96, name: "Biella", shortCode: "BI" },
      { id: 103, name: "Verbano-Cusio-Ossola", shortCode: "VB" },
    ],
  },
  {
    id: 3,
    name: "Liguria",
    provinces: [
      { id: 7, name: "Imperia", shortCode: "IM" },
      { id: 8, name: "Savona", shortCode: "SV" },
      { id: 9, name: "Genova", shortCode: "GE" },
      { id: 10, name: "La Spezia", shortCode: "SP" },
    ],
  },
  {
    id: 4,
    name: "Lombardia",
    provinces: [
      { id: 11, name: "Varese", shortCode: "VA" },
      { id: 12, name: "Como", shortCode: "CO" },
      { id: 13, name: "Sondrio", shortCode: "SO" },
      { id: 14, name: "Milano", shortCode: "MI" },
      { id: 15, name: "Bergamo", shortCode: "BG" },
      { id: 16, name: "Brescia", shortCode: "BS" },
      { id: 17, name: "Pavia", shortCode: "PV" },
      { id: 18, name: "Cremona", shortCode: "CR" },
      { id: 19, name: "Mantova", shortCode: "MN" },
      { id: 97, name: "Lecco", shortCode: "LC" },
      { id: 98, name: "Lodi", shortCode: "LO" },
      { id: 108, name: "Monza e della Brianza", shortCode: "MB" },
    ],
  },
  {
    id: 5,
    name: "Trentino-Alto Adige",
    provinces: [
      { id: 20, name: "Bolzano", shortCode: "BZ" },
      { id: 21, name: "Trento", shortCode: "TN" },
    ],
  },
  {
    id: 6,
    name: "Veneto",
    provinces: [
      { id: 22, name: "Verona", shortCode: "VR" },
      { id: 23, name: "Vicenza", shortCode: "VI" },
      { id: 24, name: "Belluno", shortCode: "BL" },
      { id: 25, name: "Treviso", shortCode: "TV" },
      { id: 26, name: "Venezia", shortCode: "VE" },
      { id: 27, name: "Padova", shortCode: "PD" },
      { id: 28, name: "Rovigo", shortCode: "RO" },
    ],
  },
  {
    id: 7,
    name: "Friuli-Venezia Giulia",
    provinces: [
      { id: 29, name: "Udine", shortCode: "UD" },
      { id: 30, name: "Gorizia", shortCode: "GO" },
      { id: 31, name: "Trieste", shortCode: "TS" },
      { id: 93, name: "Pordenone", shortCode: "PN" },
    ],
  },
  {
    id: 8,
    name: "Emilia-Romagna",
    provinces: [
      { id: 32, name: "Piacenza", shortCode: "PC" },
      { id: 33, name: "Parma", shortCode: "PR" },
      { id: 34, name: "Reggio nell'Emilia", shortCode: "RE" },
      { id: 35, name: "Modena", shortCode: "MO" },
      { id: 36, name: "Bologna", shortCode: "BO" },
      { id: 37, name: "Ferrara", shortCode: "FE" },
      { id: 38, name: "Ravenna", shortCode: "RA" },
      { id: 39, name: "Forlì-Cesena", shortCode: "FC" },
      { id: 99, name: "Rimini", shortCode: "RN" },
    ],
  },
  {
    id: 9,
    name: "Toscana",
    provinces: [
      { id: 45, name: "Massa-Carrara", shortCode: "MS" },
      { id: 46, name: "Lucca", shortCode: "LU" },
      { id: 47, name: "Pistoia", shortCode: "PT" },
      { id: 48, name: "Firenze", shortCode: "FI" },
      { id: 49, name: "Livorno", shortCode: "LI" },
      { id: 50, name: "Pisa", shortCode: "PI" },
      { id: 51, name: "Arezzo", shortCode: "AR" },
      { id: 52, name: "Siena", shortCode: "SI" },
      { id: 53, name: "Grosseto", shortCode: "GR" },
      { id: 100, name: "Prato", shortCode: "PO" },
    ],
  },
  {
    id: 10,
    name: "Umbria",
    provinces: [
      { id: 54, name: "Perugia", shortCode: "PG" },
      { id: 55, name: "Terni", shortCode: "TR" },
    ],
  },
  {
    id: 11,
    name: "Lazio",
    provinces: [
      { id: 56, name: "Viterbo", shortCode: "VT" },
      { id: 57, name: "Rieti", shortCode: "RI" },
      { id: 58, name: "Roma", shortCode: "RM" },
      { id: 59, name: "Latina", shortCode: "LT" },
      { id: 60, name: "Frosinone", shortCode: "FR" },
    ],
  },
  {
    id: 12,
    name: "Marche",
    provinces: [
      { id: 41, name: "Pesaro e Urbino", shortCode: "PU" },
      { id: 42, name: "Ancona", shortCode: "AN" },
      { id: 43, name: "Macerata", shortCode: "MC" },
      { id: 44, name: "Ascoli Piceno", shortCode: "AP" },
      { id: 109, name: "Fermo", shortCode: "FM" },
    ],
  },
  {
    id: 13,
    name: "Abruzzo",
    provinces: [
      { id: 66, name: "L'Aquila", shortCode: "AQ" },
      { id: 67, name: "Teramo", shortCode: "TE" },
      { id: 68, name: "Pescara", shortCode: "PE" },
      { id: 69, name: "Chieti", shortCode: "CH" },
    ],
  },
  {
    id: 14,
    name: "Molise",
    provinces: [
      { id: 70, name: "Campobasso", shortCode: "CB" },
      { id: 94, name: "Isernia", shortCode: "IS" },
    ],
  },
  {
    id: 15,
    name: "Campania",
    provinces: [
      { id: 61, name: "Caserta", shortCode: "CE" },
      { id: 62, name: "Benevento", shortCode: "BN" },
      { id: 63, name: "Napoli", shortCode: "NA" },
      { id: 64, name: "Avellino", shortCode: "AV" },
      { id: 65, name: "Salerno", shortCode: "SA" },
    ],
  },
  {
    id: 16,
    name: "Puglia",
    provinces: [
      { id: 71, name: "Foggia", shortCode: "FG" },
      { id: 72, name: "Bari", shortCode: "BA" },
      { id: 73, name: "Taranto", shortCode: "TA" },
      { id: 74, name: "Brindisi", shortCode: "BR" },
      { id: 75, name: "Lecce", shortCode: "LE" },
      { id: 110, name: "Barletta-Andria-Trani", shortCode: "BT" },
    ],
  },
  {
    id: 17,
    name: "Basilicata",
    provinces: [
      { id: 76, name: "Potenza", shortCode: "PZ" },
      { id: 77, name: "Matera", shortCode: "MT" },
    ],
  },
  {
    id: 18,
    name: "Calabria",
    provinces: [
      { id: 78, name: "Cosenza", shortCode: "CS" },
      { id: 79, name: "Catanzaro", shortCode: "CZ" },
      { id: 80, name: "Reggio di Calabria", shortCode: "RC" },
      { id: 101, name: "Crotone", shortCode: "KR" },
      { id: 102, name: "Vibo Valentia", shortCode: "VV" },
    ],
  },
  {
    id: 19,
    name: "Sardegna",
    provinces: [
      { id: 90, name: "Sassari", shortCode: "SS" },
      { id: 91, name: "Nuoro", shortCode: "NU" },
      { id: 92, name: "Cagliari", shortCode: "CA" },
      { id: 95, name: "Oristano", shortCode: "OR" },
      { id: 111, name: "Sud Sardegna", shortCode: "SU" },
    ],
  },
  {
    id: 20,
    name: "Sicilia",
    provinces: [
      { id: 81, name: "Trapani", shortCode: "TP" },
      { id: 82, name: "Palermo", shortCode: "PA" },
      { id: 83, name: "Messina", shortCode: "ME" },
      { id: 84, name: "Agrigento", shortCode: "AG" },
      { id: 85, name: "Caltanissetta", shortCode: "CL" },
      { id: 86, name: "Enna", shortCode: "EN" },
      { id: 87, name: "Catania", shortCode: "CT" },
      { id: 88, name: "Ragusa", shortCode: "RG" },
      { id: 89, name: "Siracusa", shortCode: "SR" },
    ],
  },
];

export function getRegionById(id: number): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

export function findRegionByName(name: string): Region[] {
  const lower = name.toLowerCase();
  return REGIONS.filter((r) => r.name.toLowerCase().includes(lower));
}

export function getProvinceById(
  id: number
): { region: Region; province: NonNullable<Region["provinces"]>[number] } | undefined {
  for (const region of REGIONS) {
    if (region.provinces) {
      const province = region.provinces.find((p) => p.id === id);
      if (province) return { region, province };
    }
  }
  return undefined;
}
