import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getCategories, initializeCatalogs } from "../catalog.js";
import type { Category } from "../types.js";

const categorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    subcategories: z.array(categorySchema).optional(),
  })
);

function formatCategory(cat: Category, indent = 0): string {
  const prefix = "  ".repeat(indent);
  let result = `${prefix}[${cat.id}] ${cat.name}`;
  if (cat.subcategories) {
    for (const sub of cat.subcategories) {
      result += "\n" + formatCategory(sub, indent + 1);
    }
  }
  return result;
}

function findCategoryByName(categories: Category[], name: string): Category[] {
  const lower = name.toLowerCase();
  const results: Category[] = [];

  for (const cat of categories) {
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

export function registerCategoriesTools(server: McpServer): void {
  server.registerTool("list_categories", {
    description:
      "List all available categories on subito.it. Returns category names and their numeric IDs which can be used as filters in search_listings.",
    inputSchema: {
      filter: z
        .string()
        .optional()
        .describe(
          "Optional text to filter categories by name (case-insensitive partial match)"
        ),
    },
    outputSchema: {
      categories: z.array(categorySchema),
      source: z.enum(["static", "dynamic"]),
      lastRefreshAt: z.string().nullable(),
    },
  },
    async ({ filter }) => {
      await initializeCatalogs();
      const catalog = getCategories();
      let categories: Category[];

      if (filter) {
        categories = findCategoryByName(catalog.categories, filter);
        if (categories.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No categories found matching "${filter}". Use list_categories without a filter to see all available categories.`,
              },
            ],
          };
        }
      } else {
        categories = catalog.categories;
      }

      const formatted = categories.map((c) => formatCategory(c)).join("\n\n");
      const sourceNote =
        catalog.source === "dynamic"
          ? "Source: live site snapshot."
          : "Source: bundled static fallback.";

      return {
        content: [
          {
            type: "text" as const,
            text: `Available categories on subito.it:\n\n${formatted}\n\n${sourceNote}\nUse the numeric ID in the "category" parameter of search_listings.`,
          },
        ],
        structuredContent: {
          categories,
          source: catalog.source,
          lastRefreshAt: catalog.lastRefreshAt,
        },
      };
    }
  );
}
