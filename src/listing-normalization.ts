import type {
  AdvertiserInfo,
  ListingAttributes,
  NormalizedLocation,
} from "./types.js";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function parsePriceAmount(price: string | null): number | null {
  if (!price) return null;

  const normalized = price.replace(/[^\d,.-]/g, "").replace(/\./g, "");
  if (!normalized) return null;

  const value = Number(normalized.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function inferProvinceCode(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return /^[A-Z]{2,3}$/.test(normalized) ? normalized : null;
}

export function normalizeLocation(
  geo: Record<string, unknown> | undefined
): NormalizedLocation {
  if (!geo) {
    return {
      display: "",
      town: null,
      provinceName: null,
      provinceCode: null,
      regionName: null,
    };
  }

  const town = (geo.town as { value?: string } | undefined)?.value ?? null;
  const city = geo.city as
    | { value?: string; shortName?: string; label?: string }
    | undefined;
  const region = (geo.region as { value?: string } | undefined)?.value ?? null;

  const provinceCode =
    (typeof city?.shortName === "string" && city.shortName) ||
    inferProvinceCode(city?.value ?? null);
  const provinceName =
    city?.value && !inferProvinceCode(city.value) ? city.value : null;

  const displayParts = [town];
  const provinceDisplay = provinceName ?? provinceCode;
  if (provinceDisplay) displayParts.push(`(${provinceDisplay})`);
  if (!displayParts[0] && region) displayParts.push(region);

  return {
    display: displayParts.filter(Boolean).join(" "),
    town,
    provinceName,
    provinceCode,
    regionName: region,
  };
}

export function normalizeAdvertiser(
  advertiserData: Record<string, unknown> | undefined
): {
  advertiser: AdvertiserInfo | null;
  sellerType: "private" | "professional" | null;
} {
  if (!advertiserData) {
    return {
      advertiser: null,
      sellerType: null,
    };
  }

  const isCompany =
    advertiserData.company === true || advertiserData.type === 1;
  const sellerType = isCompany ? "professional" : "private";
  const name =
    typeof advertiserData.name === "string"
      ? normalizeWhitespace(advertiserData.name)
      : "";

  return {
    advertiser: {
      name,
      type: sellerType,
      phone:
        typeof advertiserData.phone === "string" ? advertiserData.phone : null,
    },
    sellerType,
  };
}

function getFeatureValue(features: Record<string, string>, label: string): string | null {
  return features[label] ?? null;
}

function parseMileageKm(mileageText: string | null): number | null {
  if (!mileageText) return null;
  const normalized = mileageText.replace(/[^\d]/g, "");
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function inferAttributes(
  features: Record<string, string>
): ListingAttributes {
  return {
    brand: getFeatureValue(features, "Marca") ?? getFeatureValue(features, "Moto"),
    model: getFeatureValue(features, "Modello"),
    variant:
      getFeatureValue(features, "Versione") ??
      getFeatureValue(features, "Allestimento"),
    condition:
      getFeatureValue(features, "Condizioni del veicolo") ??
      getFeatureValue(features, "Condizione"),
    year:
      getFeatureValue(features, "Anno di immatricolazione") ??
      getFeatureValue(features, "Anno"),
    registration: getFeatureValue(features, "Immatricolazione"),
    mileageText: getFeatureValue(features, "Km"),
    mileageKm: parseMileageKm(getFeatureValue(features, "Km")),
    fuel: getFeatureValue(features, "Carburante"),
    transmission: getFeatureValue(features, "Cambio"),
    bodyType:
      getFeatureValue(features, "Tipologia") ??
      getFeatureValue(features, "Tipo"),
  };
}

export function splitDescriptionLines(description: string): string[] {
  return description
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
}

export function buildCategoryPath(category: string | null): string[] {
  return category ? [category] : [];
}
