import {
  assertEquals,
  assertInstanceOf,
  assertNotEquals,
  assertRejects,
  assertThrows,
} from "@std/assert";
import {
  mockFetch,
  mockGlobalFetch,
  resetFetch,
  resetGlobalFetch,
} from "./mod.ts";

Deno.test("@c4spar/mock-fetch", async (ctx) => {
  await ctx.step({
    name: "should init and reset mockFetch",
    async fn() {
      const originalFetch = globalThis.fetch;
      mockFetch("https://example.com/");
      assertNotEquals(originalFetch, globalThis.fetch);

      await fetch("https://example.com/");

      resetFetch();
      assertEquals(originalFetch, globalThis.fetch);
    },
  });

  await ctx.step({
    name: "should init and reset mockFetch globally",
    async fn() {
      const originalFetch = globalThis.fetch;
      mockGlobalFetch();
      assertNotEquals(originalFetch, globalThis.fetch);

      mockFetch("https://example.com/");
      assertNotEquals(originalFetch, globalThis.fetch);
      await fetch("https://example.com/");
      resetFetch();
      assertNotEquals(originalFetch, globalThis.fetch);

      resetGlobalFetch();
      assertEquals(originalFetch, globalThis.fetch);
    },
  });

  await ctx.step({
    name: "should throw an error for unhandled fetch call",
    async fn() {
      mockGlobalFetch();
      await assertRejects(
        () => fetch("https://example.com/"),
        Error,
        'Unhandled fetch call: "https://example.com/"',
      );
      resetGlobalFetch();
    },
  });

  await ctx.step({
    name: "should throw an error for unmatched fetch call",
    fn() {
      mockFetch("https://example.com/");
      assertThrows(
        () => resetFetch(),
        Error,
        'Expected 1 more request(s) to match: [\n  {\n    url: "https://example.com/",\n  },\n]',
      );
    },
  });

  await ctx.step({
    name: "should match by url string",
    async fn() {
      mockFetch("https://example.com/");
      const resp = await fetch("https://example.com/");
      assertInstanceOf(resp, Response);
      resetFetch();
    },
  });

  await ctx.step({
    name: "should match by URL",
    async fn() {
      mockFetch(new URL("https://example.com/"));
      const resp = await fetch("https://example.com/");
      assertInstanceOf(resp, Response);
      resetFetch();
    },
  });

  await ctx.step({
    name: "should match by URLPattern",
    async fn() {
      mockFetch(new URLPattern("https://example.com/"));
      const resp = await fetch("https://example.com/");
      assertInstanceOf(resp, Response);
      resetFetch();
    },
  });

  await ctx.step({
    name: "should match by url option",
    async fn() {
      mockFetch({ url: "https://example.com/" });
      const resp = await fetch("https://example.com/");
      assertInstanceOf(resp, Response);
      resetFetch();
    },
  });

  await ctx.step({
    name: "should match by method",
    async fn() {
      mockFetch({ method: "get" });
      const resp = await fetch("https://example.com/");
      assertInstanceOf(resp, Response);
      resetFetch();
    },
  });

  await ctx.step({
    name: "should match by body",
    async fn() {
      mockFetch({ body: "test-body" });
      const resp = await fetch("https://example.com/", {
        body: "test-body",
      });
      assertInstanceOf(resp, Response);
      resetFetch();
    },
  });

  await ctx.step({
    name: "should match by header",
    async fn() {
      mockFetch({ headers: { "foo": "bar" } });
      const resp = await fetch("https://example.com/", {
        body: JSON.stringify({}),
        headers: { "foo": "bar", "beep": "boop" },
      });
      assertInstanceOf(resp, Response);
      resetFetch();
    },
  });

  await ctx.step({
    name: "should throw if signal is aborted",
    fn() {
      const controller = new AbortController();
      mockFetch({ signal: controller.signal });
      controller.abort(new Error("aborted"));
      assertRejects(
        () => fetch("https://example.com/"),
        Error,
        "aborted",
      );
      resetFetch();
    },
  });

  await ctx.step({
    name: "should mock response body",
    async fn() {
      const testData = { data: "test-data" };
      mockFetch("https://example.com/", {
        body: JSON.stringify(testData),
      });
      const resp = await fetch("https://example.com/");
      const body = await resp.json();
      assertInstanceOf(resp, Response);
      assertEquals(body, testData);
      resetFetch();
    },
  });

  await ctx.step({
    name: "should mock response header",
    async fn() {
      const headers = new Headers({ foo: "bar", beep: "boop" });
      mockFetch("https://example.com/", { headers });
      const resp = await fetch("https://example.com/");
      assertInstanceOf(resp, Response);
      assertEquals(new Headers(resp.headers), new Headers(headers));
      resetFetch();
    },
  });

  await ctx.step({
    name: "should mock response status and statusText",
    async fn() {
      mockFetch("https://example.com/", {
        status: 400,
        statusText: "Bad Request",
      });
      const resp = await fetch("https://example.com/");
      assertInstanceOf(resp, Response);
      assertEquals(resp.status, 400);
      assertEquals(resp.statusText, "Bad Request");
      resetFetch();
    },
  });
});
