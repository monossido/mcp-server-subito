# mcp-server-subito

An MCP (Model Context Protocol) server for searching and browsing listings on [subito.it](https://www.subito.it), Italy's largest classified ads marketplace.

> **For testing and educational purposes only.** See [Legal and Ethical Considerations](#legal-and-ethical-considerations) before use.

## Features

- Search listings with filters (keywords, category, region, price, seller type)
- Retrieve full listing details (description, images, advertiser info, structured features)
- Compare multiple listings side by side
- Find comparable listings from a reference ad
- Market analysis via facets (price distribution, top categories, regions)
- robots.txt compliance by default
- Built-in rate limiting

## Installation

### Local AI Agents

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "subito": {
      "command": "npx",
      "args": ["-y", "mcp-server-subito"]
    }
  }
}
```

With `--ignore-robots-txt` enabled (required for multi-page scans):

```json
{
  "mcpServers": {
    "subito": {
      "command": "npx",
      "args": ["-y", "mcp-server-subito", "--ignore-robots-txt"]
    }
  }
}
```

### Cursor

Go to **Cursor Settings → Tools & Integrations → New MCP Server** and use the same configuration as above.

### Via Smithery

Install directly from [Smithery](https://smithery.ai/server/mcp-server-subito) with one click — no manual configuration needed.

## Tools

### `search_listings`

Search listings on subito.it with optional filters.

| Parameter       | Type    | Description                                                  |
| --------------- | ------- | ------------------------------------------------------------ |
| `query`         | string  | Search keywords (e.g. `iphone`, `bicicletta`)                |
| `category`      | number  | Category ID — use `list_categories` to browse                |
| `region`        | number  | Region ID — use `list_regions` to browse                     |
| `province`      | number  | Province ID for more specific location filtering             |
| `minPrice`      | number  | Minimum price in euros                                       |
| `maxPrice`      | number  | Maximum price in euros                                       |
| `sort`          | enum    | `relevance`, `date_desc`, `price_asc`, `price_desc`          |
| `startPage`     | number  | Start page (default: 1)                                      |
| `maxPages`      | number  | Pages to scan, 1–50 (requires `--ignore-robots-txt` for > 1) |
| `sellerType`    | enum    | `private` or `professional`                                  |
| `includeFacets` | boolean | Add price/category/region aggregations to the response       |

### `get_listing_details`

Retrieve full details of a single listing by URL.

| Parameter | Type   | Description                |
| --------- | ------ | -------------------------- |
| `url`     | string | Full subito.it listing URL |

Returns title, description, price, location, images, advertiser info, and structured features.

### `compare_listings`

Fetch 2–10 listings and return a normalized comparison table across price, location, seller type, brand, model, year, condition, and image count.

| Parameter | Type     | Description                    |
| --------- | -------- | ------------------------------ |
| `urls`    | string[] | 2 to 10 subito.it listing URLs |

### `find_comparable_listings`

Given a reference listing URL, automatically derives a search query and returns the most structurally similar active listings with explicit matching signals.

| Parameter    | Type   | Description                                            |
| ------------ | ------ | ------------------------------------------------------ |
| `listingUrl` | string | Reference listing URL                                  |
| `limit`      | number | Max results to return (default: 10, max: 20)           |
| `maxPages`   | number | Pages to scan (requires `--ignore-robots-txt` for > 1) |

### `list_categories`

Returns the full list of subito.it categories with their IDs.

### `list_regions`

Returns all Italian regions and provinces with their IDs for use in search filters.

## Configuration

| Flag                     | Default | Description                                                                        |
| ------------------------ | ------- | ---------------------------------------------------------------------------------- |
| `--ignore-robots-txt`    | off     | Disables robots.txt enforcement. Required to scan multiple pages per search.       |
| `--allow-unknown-robots` | off     | If robots.txt is unreachable, proceed instead of blocking the request (fail-open). |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
node build/index.js

# Watch mode
npm run dev

# Tests
npm test
```

## Legal and Ethical Considerations

This tool is intended **for personal, testing, and educational use only**.

By using this server you agree to:

- **Respect subito.it's Terms of Service.** Automated access may violate their ToS. You are solely responsible for your use.
- **Respect robots.txt.** By default, this server enforces `robots.txt` directives. The `--ignore-robots-txt` flag bypasses this check — use it only if you have a legitimate reason and understand the implications.
- **Do not use for commercial scraping or bulk data harvesting.** This server is not designed or intended for large-scale data collection.
- **Do not use to spam or harass advertisers** beyond normal platform interactions.
- **Rate limit your requests.** The server includes built-in rate limiting, but avoid running aggressive scans that could impact subito.it's infrastructure.
- **Do not redistribute scraped data** in ways that violate subito.it's intellectual property rights.

The author assumes no liability for misuse of this tool.

## License

AGPL v3 © [Lorenzo Braghetto](https://github.com/monossido)
