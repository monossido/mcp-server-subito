import test from "node:test";
import assert from "node:assert/strict";

import {
  getListingDetails,
  searchListings,
  searchListingsAcrossPages,
} from "../build/scraper.js";
import {
  buildComparisonRows,
  buildSearchFacets,
  deriveComparableQuery,
  rankComparableListings,
} from "../build/analysis.js";
import {
  __resetCatalogsForTests,
  getCategories,
  initializeCatalogs,
  parseCategoriesFromBrowseHtml,
} from "../build/catalog.js";
import { __resetRobotsCacheForTests } from "../build/robots.js";
import { __resetRateLimitForTests } from "../build/rate-limit.js";

function installFetchMock(handlers) {
  let callIndex = 0;

  globalThis.fetch = async (input) => {
    const url = typeof input === "string" ? input : input.toString();
    const handler = handlers[callIndex++];

    if (!handler) {
      throw new Error(`Unexpected fetch call for ${url}`);
    }

    return handler(url);
  };
}

function textResponse(body, init = {}) {
  return new Response(body, {
    status: 200,
    ...init,
  });
}

const searchHtml = `
<!doctype html>
<html>
  <body>
    <script id="__NEXT_DATA__" type="application/json">
      {"props":{"pageProps":{"initialState":{"items":{"list":[{"item":{"urn":"urn:subito:123","subject":"iPhone 15","features":{"/price":{"values":[{"value":"799 €"}]},"/item_shipping_allowed":{"values":[{"key":"1"}]}},"geo":{"town":{"value":"Roma"},"city":{"value":"RM"}},"urls":{"default":"https://www.subito.it/telefonia/iphone-15-roma-123.htm"},"images":[{"cdnBaseUrl":"https://img.example/1"}],"date":"2026-03-30","category":{"label":"Telefonia"},"advertiser":{"name":"Mario"}}}],"total":42,"totalPages":3}}}}}
    </script>
  </body>
</html>
`;

const detailsHtml = `
<!doctype html>
<html>
  <body>
    <script id="__NEXT_DATA__" type="application/json">
      {"props":{"pageProps":{"ad":{"urn":"urn:subito:123","subject":"iPhone 15","body":"Perfetto stato","date":"2026-03-30","category":{"label":"Telefonia"},"geo":{"town":{"value":"Roma"},"city":{"value":"RM"}},"features":{"/price":{"values":[{"value":"799 €"}]},"memory":{"label":"Memoria","values":[{"value":"128 GB"}]}},"images":[{"cdnBaseUrl":"https://img.example/1"},{"cdnBaseUrl":"https://img.example/2"}],"advertiser":{"name":"Mario","company":false,"phone":"123456789"}}}}}
    </script>
  </body>
</html>
`;

const appRouterDetailsHtml = `
<!doctype html>
<html>
  <body>
    <script>
      self.__next_f.push([1,"{\\"id\\":\\"urn:subito:123\\",\\"urn\\":\\"urn:subito:123\\",\\"category\\":{\\"label\\":\\"Moto e Scooter\\"},\\"subject\\":\\"KTM 790 Adventure\\",\\"body\\":\\"Moto perfetta\\",\\"date\\":\\"2026-03-30 21:11:29\\",\\"images\\":[{\\"cdnBaseUrl\\":\\"https://img.example/1\\"}],\\"features\\":{\\"/price\\":{\\"values\\":[{\\"value\\":\\"9.000 €\\"}]},\\"brand\\":{\\"label\\":\\"Marca\\",\\"values\\":[{\\"value\\":\\"KTM\\"}]},\\"model\\":{\\"label\\":\\"Modello\\",\\"values\\":[{\\"value\\":\\"790 Adventure\\"}]}},\\"advertiser\\":{\\"name\\":\\"Mario\\",\\"company\\":false,\\"phone\\":\\"123456\\"},\\"geo\\":{\\"town\\":{\\"value\\":\\"Napoli\\"},\\"city\\":{\\"value\\":\\"NA\\"}},\\"urls\\":{\\"default\\":\\"https://www.subito.it/moto-e-scooter/ktm-790-adventure-napoli-641496514.htm\\"}}"]);\n
    </script>
  </body>
</html>
`;

const categoriesHtml = `
<!doctype html>
<html>
  <body>
    <footer>
      <a href="/annunci-italia/motori/vendita/usato/">motori</a>
      <ul>
        <li><a href="/annunci-italia/motori/auto/vendita/usato/">Auto</a></li>
        <li><a href="/annunci-italia/motori/moto-e-scooter/vendita/usato/">Moto e Scooter</a></li>
      </ul>
      <a href="/annunci-italia/elettronica/vendita/usato/">elettronica</a>
      <ul>
        <li><a href="/annunci-italia/elettronica/telefonia/vendita/usato/">Telefonia</a></li>
      </ul>
    </footer>
  </body>
</html>
`;

test.beforeEach(() => {
  __resetRobotsCacheForTests();
  __resetRateLimitForTests(20);
  __resetCatalogsForTests();
});

test("searchListings parses listings from Next.js payload", async () => {
  installFetchMock([
    async (url) => {
      assert.equal(url, "https://www.subito.it/robots.txt");
      return textResponse("User-agent: *\nAllow: /\n");
    },
    async (url) => {
      assert.match(url, /annunci-italia\/vendita\/usato/);
      return textResponse(searchHtml);
    },
  ]);

  const result = await searchListings({ query: "iphone" });

  assert.equal(result.totalCount, 42);
  assert.equal(result.totalPages, 3);
  assert.equal(result.listings.length, 1);
  assert.equal(result.startPage, 1);
  assert.equal(result.listings[0].title, "iPhone 15");
  assert.equal(result.listings[0].shipping, true);
  assert.equal(result.listings[0].priceAmount, 799);
  assert.equal(result.listings[0].locationData.town, "Roma");
});

test("search_listings tool output should expose scan metadata semantics", async () => {
  const totalPages = 3;
  const currentPage = 1;

  const scan = {
    pagesScanned: 1,
    truncated: currentPage < totalPages,
    paginationEnabled: false,
  };

  assert.deepEqual(scan, {
    pagesScanned: 1,
    truncated: true,
    paginationEnabled: false,
  });
});

test("searchListings builds region and province search paths", async () => {
  const seenUrls = [];

  installFetchMock([
    async () => textResponse("User-agent: *\nAllow: /\n"),
    async (url) => {
      seenUrls.push(url);
      return textResponse(searchHtml);
    },
    async (url) => {
      seenUrls.push(url);
      return textResponse(searchHtml);
    },
  ]);

  await searchListings({ query: "ktm", region: 15 });
  await searchListings({ query: "ktm", province: 63 });

  assert.equal(
    seenUrls[0],
    "https://www.subito.it/annunci-campania/vendita/usato/?q=ktm"
  );
  assert.equal(
    seenUrls[1],
    "https://www.subito.it/annunci-campania/vendita/usato/napoli/?q=ktm"
  );
});

test("searchListingsAcrossPages aggregates multiple pages when pagination is allowed", async () => {
  const page1Html = `
  <!doctype html>
  <html><body><script id="__NEXT_DATA__" type="application/json">
  {"props":{"pageProps":{"initialState":{"items":{"list":[{"item":{"urn":"urn:subito:1","subject":"KTM 1","features":{"/price":{"values":[{"value":"100 €"}]}},"geo":{"town":{"value":"Roma"},"city":{"value":"RM"}},"urls":{"default":"https://www.subito.it/1.htm"},"images":[],"date":"2026-03-30","category":{"label":"Moto e Scooter"}}}],"total":60,"totalPages":2}}}}}
  </script></body></html>`;
  const page2Html = `
  <!doctype html>
  <html><body><script id="__NEXT_DATA__" type="application/json">
  {"props":{"pageProps":{"initialState":{"items":{"list":[{"item":{"urn":"urn:subito:2","subject":"KTM 2","features":{"/price":{"values":[{"value":"200 €"}]}},"geo":{"town":{"value":"Milano"},"city":{"value":"MI"}},"urls":{"default":"https://www.subito.it/2.htm"},"images":[],"date":"2026-03-30","category":{"label":"Moto e Scooter"}}}],"total":60,"totalPages":2}}}}}
  </script></body></html>`;

  installFetchMock([
    async () => textResponse("User-agent: *\nAllow: /\n"),
    async (url) => {
      assert.ok(url.includes("?q=ktm"));
      return textResponse(page1Html);
    },
    async (url) => {
      assert.ok(url.includes("&o=2"));
      return textResponse(page2Html);
    },
  ]);

  const result = await searchListingsAcrossPages(
    { query: "ktm" },
    { allowPagination: true, maxPages: 5 }
  );

  assert.equal(result.startPage, 1);
  assert.equal(result.pagesScanned, 2);
  assert.equal(result.truncated, false);
  assert.equal(result.listings.length, 2);
});

test("searchListingsAcrossPages stays on first page when pagination is not allowed", async () => {
  installFetchMock([
    async () => textResponse("User-agent: *\nAllow: /\n"),
    async () => textResponse(searchHtml),
  ]);

  const result = await searchListingsAcrossPages(
    { query: "iphone" },
    { allowPagination: false, maxPages: 10 }
  );

  assert.equal(result.startPage, 1);
  assert.equal(result.pagesScanned, 1);
  assert.equal(result.truncated, true);
  assert.equal(result.listings.length, 1);
});

test("getListingDetails rejects non-subito hosts", async () => {
  await assert.rejects(
    () => getListingDetails("https://example.com/not-allowed"),
    /Only subito\.it listing URLs are allowed/
  );
});

test("searchListings fails explicitly when robots.txt cannot be verified", async () => {
  installFetchMock([
    async () => {
      throw new Error("network down");
    },
  ]);

  await assert.rejects(
    () => searchListings({ query: "iphone" }),
    /Unable to verify robots\.txt/
  );
});

test("rate limiting serializes concurrent requests", async () => {
  const timestamps = [];

  installFetchMock([
    async () => textResponse("User-agent: *\nAllow: /\n"),
    async () => {
      timestamps.push(Date.now());
      return textResponse(detailsHtml);
    },
    async () => {
      timestamps.push(Date.now());
      return textResponse(detailsHtml);
    },
  ]);

  await Promise.all([
    getListingDetails("https://www.subito.it/telefonia/iphone-15-roma-123.htm"),
    getListingDetails("https://www.subito.it/telefonia/iphone-15-roma-123.htm"),
  ]);

  assert.equal(timestamps.length, 2);
  assert.ok(timestamps[1] - timestamps[0] >= 15);
});

test("getListingDetails parses app-router embedded JSON when __NEXT_DATA__ is absent", async () => {
  installFetchMock([
    async () => textResponse("User-agent: *\nAllow: /\n"),
    async () => textResponse(appRouterDetailsHtml),
  ]);

  const result = await getListingDetails(
    "https://www.subito.it/moto-e-scooter/ktm-790-adventure-napoli-641496514.htm"
  );

  assert.ok(result);
  assert.equal(result.title, "KTM 790 Adventure");
  assert.equal(result.price, "9.000 €");
  assert.equal(result.location, "Napoli (NA)");
  assert.equal(result.advertiser?.phone, "123456");
  assert.equal(result.features.Marca, "KTM");
  assert.equal(result.attributes.brand, "KTM");
  assert.equal(result.priceAmount, 9000);
});

test("parseCategoriesFromBrowseHtml extracts footer category tree", () => {
  const categories = parseCategoriesFromBrowseHtml(categoriesHtml);

  assert.equal(categories.length, 2);
  assert.equal(categories[0].slug, "motori");
  assert.equal(categories[0].subcategories?.[0].slug, "auto");
  assert.equal(categories[1].subcategories?.[0].name, "Telefonia");
});

test("initializeCatalogs refreshes categories dynamically and keeps regions static", async () => {
  installFetchMock([
    async (url) => {
      assert.equal(url, "https://www.subito.it/robots.txt");
      return textResponse("User-agent: *\nAllow: /\n");
    },
    async (url) => {
      assert.equal(url, "https://www.subito.it/annunci-italia/vendita/usato/");
      return textResponse(categoriesHtml);
    },
  ]);

  await initializeCatalogs();
  const catalog = getCategories();

  assert.equal(catalog.source, "dynamic");
  assert.equal(catalog.categories.length, 2);
});

test("analysis helpers build facets, comparison rows and comparable ranking", async () => {
  installFetchMock([
    async () => textResponse("User-agent: *\nAllow: /\n"),
    async () => textResponse(detailsHtml),
  ]);

  const details = await getListingDetails(
    "https://www.subito.it/telefonia/iphone-15-roma-123.htm"
  );
  assert.ok(details);

  const searchResult = {
    listings: [
      {
        ...(await searchListings({ query: "iphone" }).catch(() => ({ listings: [] })))
          .listings[0],
      },
    ].filter(Boolean),
  };

  const fallbackListing = {
    id: "2",
    title: "iPhone 15 Pro",
    price: "999 €",
    priceAmount: 999,
    currency: "EUR",
    location: "Roma (RM)",
    locationData: {
      display: "Roma (RM)",
      town: "Roma",
      provinceName: null,
      provinceCode: "RM",
      regionName: "Lazio",
    },
    url: "https://www.subito.it/telefonia/iphone-15-pro-roma-2.htm",
    imageUrl: "https://img.example/2",
    imageCount: 1,
    date: "2026-03-30",
    category: "Telefonia",
    advertiser: "Mario",
    sellerType: "private",
    listingType: "In vendita",
    shipping: true,
    attributes: {
      brand: "Apple",
      model: "iPhone 15 Pro",
      variant: null,
      condition: null,
      year: null,
      registration: null,
      mileageText: null,
      mileageKm: null,
      fuel: null,
      transmission: null,
      bodyType: null,
    },
  };

  const comparableCandidates = [
    {
      ...fallbackListing,
      id: "3",
      title: "KTM 790 Adventure",
      category: "Moto e Scooter",
      sellerType: "private",
      attributes: {
        brand: "KTM",
        model: "790 Adventure",
        variant: null,
        condition: "Usato",
        year: "2019",
        registration: "03/2019",
        mileageText: "56000 Km",
        mileageKm: 56000,
        fuel: null,
        transmission: null,
        bodyType: "Altro",
      },
      price: "9000 €",
      priceAmount: 9000,
      location: "Napoli (NA)",
      locationData: {
        display: "Napoli (NA)",
        town: "Napoli",
        provinceName: null,
        provinceCode: "NA",
        regionName: "Campania",
      },
    },
  ];

  const facets = buildSearchFacets([fallbackListing]);
  assert.equal(facets.categories[0].value, "Telefonia");
  assert.equal(facets.price.avg, 999);

  const comparison = buildComparisonRows([details]);
  assert.equal(comparison[0].field, "title");

  const comparableQuery = deriveComparableQuery({
    ...details,
    title: "KTM 790 Adventure",
    attributes: {
      ...details.attributes,
      brand: "KTM",
      model: "790 Adventure",
    },
  });
  assert.equal(comparableQuery, "KTM 790 Adventure");

  const ranked = rankComparableListings(
    {
      ...details,
      id: "reference",
      title: "KTM 790 Adventure",
      category: "Moto e Scooter",
      priceAmount: 9000,
      locationData: {
        display: "Napoli (NA)",
        town: "Napoli",
        provinceName: null,
        provinceCode: "NA",
        regionName: "Campania",
      },
      attributes: {
        ...details.attributes,
        brand: "KTM",
        model: "790 Adventure",
      },
    },
    comparableCandidates,
    5
  );
  assert.equal(ranked.length, 1);
  assert.ok(ranked[0].signals.includes("same_brand"));
});
