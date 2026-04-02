import * as cheerio from "cheerio";
import { CATEGORIES as STATIC_CATEGORIES } from "./data/categories.js";
import { REGIONS as STATIC_REGIONS } from "./data/regions.js";
import { fetchSubitoPage, BASE_URL } from "./subito-http.js";
import type { Category, Region } from "./types.js";

const BROWSE_PATH = "/annunci-italia/vendita/usato/";

type CatalogSource = "static" | "dynamic";

interface CatalogState {
  categories: Category[];
  categoriesSource: CatalogSource;
  regions: Region[];
  regionsSource: CatalogSource;
  initialized: boolean;
  lastRefreshAt: string | null;
}

const state: CatalogState = {
  categories: STATIC_CATEGORIES,
  categoriesSource: "static",
  regions: STATIC_REGIONS,
  regionsSource: "static",
  initialized: false,
  lastRefreshAt: null,
};

let pendingInitialization: Promise<void> | null = null;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCategoryName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

function hasDuplicateIds(categories: Category[]): boolean {
  const seen = new Set<number>();

  const visit = (items: Category[]): boolean => {
    for (const item of items) {
      if (seen.has(item.id)) return true;
      seen.add(item.id);
      if (item.subcategories && visit(item.subcategories)) return true;
    }
    return false;
  };

  return visit(categories);
}

export function parseCategoriesFromBrowseHtml(html: string): Category[] {
  const $ = cheerio.load(html);
  const allLinks = $("a[href]");

  const topLevelBySlug = new Map<string, ReturnType<typeof $>>();
  allLinks.each((_, element) => {
    const link = $(element);
    const href = link.attr("href") ?? "";
    const text = normalizeCategoryName(link.text());
    const match = href.match(/^\/annunci-italia\/([^/]+)\/vendita\/usato\/?$/);

    if (!match || !text) return;
    topLevelBySlug.set(match[1], link);
  });

  if (topLevelBySlug.size === 0) {
    return [];
  }

  const categories: Category[] = [];
  let nextCategoryId = 1;
  let nextSubcategoryId = 1000;

  for (const [slug, link] of topLevelBySlug.entries()) {
    const categoryName = normalizeCategoryName(link.text());
    if (!categoryName) continue;

    const subcategories: Category[] = [];
    const container = link.parent();
    const siblingLinks = container.find("a[href]");

    siblingLinks.each((_, sibling) => {
      const siblingLink = $(sibling);
      if (siblingLink.get(0) === link.get(0)) return;

      const siblingHref = siblingLink.attr("href") ?? "";
      const siblingText = normalizeCategoryName(siblingLink.text());
      const subMatch = siblingHref.match(
        /^\/annunci-italia\/([^/]+)\/([^/]+)\/vendita\/usato\/?$/
      );

      if (!subMatch || subMatch[1] !== slug || !siblingText) return;

      subcategories.push({
        id: nextSubcategoryId++,
        name: siblingText,
        slug: subMatch[2] || slugify(siblingText),
      });
    });

    categories.push({
      id: nextCategoryId++,
      name: categoryName,
      slug,
      subcategories: subcategories.length > 0 ? subcategories : undefined,
    });
  }

  return categories;
}

async function refreshCategoriesFromSubito(): Promise<boolean> {
  const html = await fetchSubitoPage(new URL(BROWSE_PATH, BASE_URL).toString());
  const categories = parseCategoriesFromBrowseHtml(html);

  if (categories.length === 0 || hasDuplicateIds(categories)) {
    throw new Error("Dynamic categories parser returned invalid data");
  }

  state.categories = categories;
  state.categoriesSource = "dynamic";
  state.lastRefreshAt = new Date().toISOString();
  return true;
}

export async function initializeCatalogs(): Promise<void> {
  if (state.initialized) return;
  if (pendingInitialization) return pendingInitialization;

  pendingInitialization = (async () => {
    try {
      await refreshCategoriesFromSubito();
    } catch {
      state.categories = STATIC_CATEGORIES;
      state.categoriesSource = "static";
      state.regions = STATIC_REGIONS;
      state.regionsSource = "static";
    } finally {
      state.initialized = true;
      pendingInitialization = null;
    }
  })();

  return pendingInitialization;
}

export function getCategories(): {
  categories: Category[];
  source: CatalogSource;
  lastRefreshAt: string | null;
} {
  return {
    categories: state.categories,
    source: state.categoriesSource,
    lastRefreshAt: state.lastRefreshAt,
  };
}

export function getRegions(): {
  regions: Region[];
  source: CatalogSource;
  lastRefreshAt: string | null;
} {
  return {
    regions: state.regions,
    source: state.regionsSource,
    lastRefreshAt: state.lastRefreshAt,
  };
}

export function __resetCatalogsForTests(): void {
  state.categories = STATIC_CATEGORIES;
  state.categoriesSource = "static";
  state.regions = STATIC_REGIONS;
  state.regionsSource = "static";
  state.initialized = false;
  state.lastRefreshAt = null;
  pendingInitialization = null;
}
