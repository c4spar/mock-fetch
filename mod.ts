import { equal } from "@std/assert/equal";

const mocks: Array<FetchMock> = [];

let originalFetch: typeof globalThis.fetch | null;

/**
 * Overrides the global fetch method to intercept all requests.
 *
 * This function is called automatically as soon as `mockFetch` is called.
 * You can call this method during the test setup to ensure that no real
 * requests are made together with the `resetMock` function in the test teardown
 * phase to restore the original `fetch` function.
 *
 * ```ts
 * import { mockGlobalFetch, resetFetch } from "./mod.ts";
 *
 * Deno.test("Some tests", async (ctx) => {
 *   mockGlobalFetch();
 *
 *   await ctx.step({
 *     name: "should ...",
 *     fn() {
 *       // some test...
 *     },
 *   });
 *
 *   resetFetch();
 * });
 * ```
 */
export function mockGlobalFetch(): void {
  if (originalFetch) {
    return;
  }
  originalFetch = globalThis.fetch;

  // deno-lint-ignore require-await
  globalThis.fetch = async function (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> {
    const url = getUrl(input);
    const match = matchRequest(url, init);

    if (!match) {
      const error = new Error(
        `Unhandled fetch call(s): ${Deno.inspect(url)}${
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

/**
 * Possible options that can be used to match a request made with fetch.
 */
export interface MatchRequestOptions
  extends Pick<RequestInit, "body" | "method" | "headers" | "signal"> {
  url?: string | URL | URLPattern;
}

/**
 * Possible options that can be used to mock a response from a request made with
 * fetch.
 */
export interface MockResponseOptions extends ResponseInit {
  body?: BodyInit | null;
}

/**
 * Mocks a request made with `fetch`.
 *
 * @param matchOptions  Request matcher options.
 * @param mockOptions   Response mock options.
 */
export function mockFetch(
  matchOptions: string | URL | URLPattern | MatchRequestOptions,
  mockOptions: MockResponseOptions = {},
): void {
  mockGlobalFetch();
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
 * Restores the original global `fetch` function.
 *
 * Throws an error if expected requests are still pending.
 */
export function resetFetch(): void {
  if (!originalFetch) {
    return;
  }
  globalThis.fetch = originalFetch;
  originalFetch = null;

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
