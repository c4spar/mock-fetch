# mock-fetch

### Example

```ts
import { assertEquals } from "@std/assert";
import { mockFetch, resetFetch } from "@c4spar/mock-fetch";

Deno.test({
  name: "should mock a request made with fetch",
  async fn() {
    mockFetch("https://example.com/", {
      body: JSON.stringify({ foo: "bar" }),
    });

    const resp = await fetch("https://example.com/");
    const body = await resp.json();

    assertEquals(resp.status, 200);
    assertEquals(body, { foo: "bar" });

    resetFetch();
  },
});
```
