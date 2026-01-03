/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as documents from "../documents.js";
import type * as entities from "../entities.js";
import type * as facts from "../facts.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as llm_cache from "../llm/cache.js";
import type * as llm_chunk from "../llm/chunk.js";
import type * as llm_extract from "../llm/extract.js";
import type * as llm_utils from "../llm/utils.js";
import type * as projects from "../projects.js";
import type * as seed from "../seed.js";
import type * as storage from "../storage.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  documents: typeof documents;
  entities: typeof entities;
  facts: typeof facts;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "llm/cache": typeof llm_cache;
  "llm/chunk": typeof llm_chunk;
  "llm/extract": typeof llm_extract;
  "llm/utils": typeof llm_utils;
  projects: typeof projects;
  seed: typeof seed;
  storage: typeof storage;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
