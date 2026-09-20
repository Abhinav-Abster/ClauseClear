import "@testing-library/jest-dom";
import "jest-axe/extend-expect";

// TextEncoder / TextDecoder polyfill if missing in JSDOM
if (typeof global.TextEncoder === "undefined") {
  const { TextEncoder, TextDecoder } = require("util");
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Polyfill Web APIs (Request, Response, Headers, FormData) from Node 20 globalThis into JSDOM environment
if (typeof global.Request === "undefined" && typeof globalThis.Request !== "undefined") {
  global.Request = globalThis.Request;
  global.Response = globalThis.Response;
  global.Headers = globalThis.Headers;
  global.FormData = globalThis.FormData;
  global.fetch = globalThis.fetch;
}
