/**
 * Test utilities to intercept and mock requests made with {@linkcode fetch}
 * using the {@linkcode URLPattern} web api.
 *
 @example Mock {@linkcode fetch} in a single test.
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { mockFetch, resetFetch } from "@c4spar/mock-fetch";
 *
 * Deno.test({
 *   name: "should mock a request made with fetch",
 *   async fn() {
 *     mockFetch("https://example.com/user/:id", {
 *       body: JSON.stringify({ name: "foo" }),
 *     });
 *
 *     const resp = await fetch("https://example.com/user/123");
 *     const body = await resp.json();
 *
 *     assertEquals(resp.status, 200);
 *     assertEquals(body, { name: "foo" });
 *
 *     resetFetch();
 *   },
 * });
 * ```
 *
 * @example Mock {@linkcode fetch} for all tests in a test file.
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   mockFetch,
 *   mockGlobalFetch,
 *   resetFetch,
 *   resetGlobalFetch,
 * } from "@c4spar/mock-fetch";
 *
 * Deno.test("MyLib", async (ctx) => {
 *   mockGlobalFetch();
 *
 *   await ctx.step({
 *     name: "should mock a request made with fetch",
 *     async fn() {
 *       mockFetch("https://example.com/user/:id", {
 *         body: JSON.stringify({ name: "foo" }),
 *       });
 *
 *       const resp = await fetch("https://example.com/user/123");
 *       const body = await resp.json();
 *
 *       assertEquals(resp.status, 200);
 *       assertEquals(body, { name: "foo" });
 *
 *       resetFetch();
 *     },
 *   });
 *
 *   // More test steps...
 *
 *   resetGlobalFetch();
 * });
 * ```
 *
 * @module
 */
import { equal } from "@std/assert/equal";

const mocks: Array<FetchMock> = [];

const originalFetch: typeof globalThis.fetch = globalThis.fetch;

let isGlobalMock = false;

/**
 * Overrides the global {@linkcode fetch} function to intercept all requests
 * from all test steps.
 *
 * This function can be called additionally during the test setup to ensure that
 * no real requests are made in any tests.
 *
 * > [!IMPORTANT]
 * > If used, you should call additionally the {@linkcode resetGlobalFetch}
 * > function in the teardown phase from your test to restore the original
 * > {@linkcode fetch} function.
 *
 * > [!IMPORTANT]
 * > If this function is called, the {@linkcode resetFetch} function is not
 * > restoring the original {@linkcode fetch} function unless
 * > {@linkcode resetGlobalFetch} is called.
 *
 * @example Ensure all requests are intercepted
 *
 * This ensures that the {@linkcode fetch} function throws an error if you run a
 * test that doesn't call {@linkcode mockFetch} within the test itself.
 *
 * ```ts
 * import { assertRejects } from "@std/assert";
 * import { mockGlobalFetch, resetGlobalFetch } from "@c4spar/mock-fetch";
 *
 * Deno.test("MyLib", async (ctx) => {
 *   mockGlobalFetch();
 *
 *   await ctx.step({
 *     name: "should ...",
 *     async fn() {
 *       await assertRejects(
 *         () => fetch("https://example.com/"),
 *         Error,
 *         'Unhandled fetch call: "https://example.com/"',
 *       );
 *     },
 *   });
 *
 *   // More test steps...
 *
 *   resetGlobalFetch();
 * });
 * ```
 */
export function mockGlobalFetch(): void {
  isGlobalMock = true;
  mockFetchApi();
}

/** Options to match a request made with {@linkcode fetch}. */
export interface MatchRequestOptions
  extends Pick<RequestInit, "body" | "method" | "headers" | "signal"> {
  /**
   * Match a request by an url or an url pattern.
   *
   * @example Use the URLPattern web api
   *
   * ```ts
   * import { assertEquals } from "@std/assert";
   * import { mockFetch, resetFetch } from "@c4spar/mock-fetch";
   *
   * Deno.test({
   *   name: "should mock a request made with fetch",
   *   async fn() {
   *     mockFetch("https://example.com/user/:id", {
   *       body: JSON.stringify({ name: "foo" }),
   *     });
   *
   *     const resp = await fetch("https://example.com/user/123");
   *     const body = await resp.json();
   *
   *     assertEquals(resp.status, 200);
   *     assertEquals(body, { name: "foo" });
   *
   *     resetFetch();
   *   },
   * });
   * ```
   */
  url?: string | URL | URLPattern;
  /**
   * An {@linkcode AbortSignal} which can be used to abort a mocked request.
   *
   * @example Abort a request
   *
   * ```ts
   * import { assertRejects } from "@std/assert";
   * import { mockFetch, resetFetch } from "@c4spar/mock-fetch";
   *
   * Deno.test({
   *   name: "should abort a request made with fetch",
   *   fn() {
   *     const controller = new AbortController();
   *     controller.abort(new Error("aborted"));
   *
   *     mockFetch({
   *       url: "https://example.com/",
   *       signal: controller.signal,
   *     });
   *
   *     assertRejects(
   *       () => fetch("https://example.com/"),
   *       Error,
   *       "aborted",
   *     );
   *     resetFetch();
   *   },
   * });
   * ```
   */
  signal?: AbortSignal | null;
}

/** Options to mock a response from a request made with {@linkcode fetch}. */
export interface MockResponseOptions extends ResponseInit {
  /** Mock response body.*/
  body?: BodyInit | null;
}

/**
 * Mocks a request made with {@linkcode fetch}.
 *
 * The {@linkcode mockFetch} function can be used to mock a request made with
 * {@linkcode fetch}. {@linkcode mockFetch} can be called multiple times to mock
 * multiple request.
 *
 * > [!IMPORTANT]
 * > Make sure to call {@linkcode resetFetch} once at the end of each test step
 * > to restore the original {@linkcode fetch} function.
 *
 * @example Mock {@linkcode fetch} call(s)
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { mockFetch, resetFetch } from "@c4spar/mock-fetch";
 *
 * Deno.test({
 *   name: "should mock a request made with fetch",
 *   async fn() {
 *     mockFetch("https://example.com/", {
 *       body: JSON.stringify({ foo: "bar" }),
 *     });
 *
 *     const resp = await fetch("https://example.com/");
 *     const body = await resp.json();
 *
 *     assertEquals(resp.status, 200);
 *     assertEquals(body, { foo: "bar" });
 *
 *     resetFetch();
 *   },
 * });
 * ```
 *
 * @param matchOptions  Request match options.
 * @param mockOptions   Response mock options.
 */
export function mockFetch(
  matchOptions: string | URL | URLPattern | MatchRequestOptions,
  mockOptions: MockResponseOptions = {},
): void {
  mockFetchApi();

  if (
    typeof matchOptions === "string" ||
    matchOptions instanceof URL ||
    matchOptions instanceof URLPattern
  ) {
    matchOptions = { url: matchOptions };
  }
  const pattern = matchOptions.url ? new URLPattern(matchOptions.url) : null;

  mocks.push({ pattern, matchOptions, mockOptions });
}

/**
 * Restores the original global {@linkcode fetch} function.
 *
 * Throws additionally an error if expected requests are still pending.
 *
 * > [!IMPORTANT]
 * > If {@linkcode mockGlobalFetch} is called, this function will not restore
 * > the original global {@linkcode fetch} function unless
 * > {@linkcode resetGlobalFetch} is called.
 */
export function resetFetch(): void {
  if (!isGlobalMock) {
    if (globalThis.fetch === originalFetch) {
      return;
    }
    globalThis.fetch = originalFetch;
  }

  if (mocks.length) {
    const error = new Error(
      `Expected ${mocks.length} more request(s) to match: ` +
        Deno.inspect(mocks.map((m) => m.matchOptions), {
          compact: false,
          colors: false,
          trailingComma: true,
        }),
    );
    Error.captureStackTrace(error, resetFetch);
    mocks.splice(0, mocks.length);
    throw error;
  }
}

/**
 * Disables global {@linkcode fetch} mock and restores the original global
 * {@linkcode fetch} function.
 *
 * Throws additionally an error if expected requests are still pending.
 */
export function resetGlobalFetch() {
  if (!isGlobalMock) {
    return;
  }
  isGlobalMock = false;
  resetFetch();
}

function mockFetchApi() {
  if (globalThis.fetch !== originalFetch) {
    return;
  }

  // deno-lint-ignore require-await
  globalThis.fetch = async function (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> {
    const url = getUrl(input);
    const match = matchRequest(url, init);

    if (!match) {
      const error = new Error(
        `Unhandled fetch call: ${Deno.inspect(url)}${
          init ? ` ${Deno.inspect(init)}` : ""
        }`,
      );
      Error.captureStackTrace(error, globalThis.fetch);
      throw error;
    }

    match.matchOptions.signal?.throwIfAborted();

    return mockResponse(match.mockOptions);
  };
}

function matchRequest(
  url: string,
  { method = "GET", body, headers }: RequestInit = {},
): FetchMock | undefined {
  for (const mock of mocks) {
    if (
      mock.matchOptions.method &&
      mock.matchOptions.method !== method?.toLowerCase()
    ) {
      continue;
    }
    if (mock.pattern && !mock.pattern.test(url)) {
      continue;
    }
    if (mock.matchOptions.body && !equal(body, mock.matchOptions.body)) {
      continue;
    }
    if (
      mock.matchOptions.headers &&
      !equal(
        new Headers(headers).entries(),
        new Headers(mock.matchOptions.headers).entries(),
      )
    ) {
      continue;
    }
    const index = mocks.findIndex((m) => m === mock);
    mocks.splice(index, 1);

    return mock;
  }
}

function getUrl(input: string | URL | Request) {
  return typeof input === "string"
    ? input
    : input instanceof URL
    ? input.href
    : input.url;
}

function mockResponse(
  { body, ...responseInit }: MockResponseOptions,
): Response {
  return new Response(body, responseInit);
}

interface FetchMock {
  pattern: URLPattern | null;
  matchOptions: MatchRequestOptions;
  mockOptions: MockResponseOptions;
}
