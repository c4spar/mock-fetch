# mock-fetch

[![JSR](https://jsr.io/badges/@c4spar/mock-fetch)](https://jsr.io/@c4spar/mock-fetch)
[![JSR Score](https://jsr.io/badges/@c4spar/mock-fetch/score)](https://jsr.io/@c4spar/mock-fetch)

Test utilities to intercept and mock requests made with `fetch` using the
[URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern) web
api.

> [!NOTE] The full documentation can be found on
> [jsr.io](https://jsr.io/@c4spar/mock-fetch).

### Examples

#### Mock fetch in a single test

```ts
import { assertEquals } from "@std/assert";
import { mockFetch, resetFetch } from "@c4spar/mock-fetch";

Deno.test({
  name: "should mock a request made with fetch",
  async fn() {
    mockFetch("https://example.com/user/:id", {
      body: JSON.stringify({ name: "foo" }),
    });

    const resp = await fetch("https://example.com/user/123");
    const body = await resp.json();

    assertEquals(resp.status, 200);
    assertEquals(body, { name: "foo" });

    resetFetch();
  },
});
```

#### Mock fetch for all tests in a test file

```ts
import { assertEquals } from "@std/assert";
import {
  mockFetch,
  mockGlobalFetch,
  resetFetch,
  resetGlobalFetch,
} from "@c4spar/mock-fetch";

Deno.test("MyLib", async (ctx) => {
  mockGlobalFetch();

  await ctx.step({
    name: "should mock a request made with fetch",
    async fn() {
      mockFetch("https://example.com/user/:id", {
        body: JSON.stringify({ name: "foo" }),
      });

      const resp = await fetch("https://example.com/user/123");
      const body = await resp.json();

      assertEquals(resp.status, 200);
      assertEquals(body, { name: "foo" });

      resetFetch();
    },
  });

  // More test steps...

  resetGlobalFetch();
});
```
