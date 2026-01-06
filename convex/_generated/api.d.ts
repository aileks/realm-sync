/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as __tests___entities_helpers from "../__tests__/entities/helpers.js";
import type * as alerts from "../alerts.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as chatHistory from "../chatHistory.js";
import type * as checks from "../checks.js";
import type * as cleanup from "../cleanup.js";
import type * as crons from "../crons.js";
import type * as documents from "../documents.js";
import type * as entities from "../entities.js";
import type * as export_ from "../export.js";
import type * as facts from "../facts.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_projectAccess from "../lib/projectAccess.js";
import type * as lib_result from "../lib/result.js";
import type * as llm_cache from "../llm/cache.js";
import type * as llm_chunk from "../llm/chunk.js";
import type * as llm_extract from "../llm/extract.js";
import type * as llm_utils from "../llm/utils.js";
import type * as projectShares from "../projectShares.js";
import type * as projects from "../projects.js";
import type * as seed from "../seed.js";
import type * as storage from "../storage.js";
import type * as tutorial from "../tutorial.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "__tests__/entities/helpers": typeof __tests___entities_helpers;
  alerts: typeof alerts;
  auth: typeof auth;
  chat: typeof chat;
  chatHistory: typeof chatHistory;
  checks: typeof checks;
  cleanup: typeof cleanup;
  crons: typeof crons;
  documents: typeof documents;
  entities: typeof entities;
  export: typeof export_;
  facts: typeof facts;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/errors": typeof lib_errors;
  "lib/projectAccess": typeof lib_projectAccess;
  "lib/result": typeof lib_result;
  "llm/cache": typeof llm_cache;
  "llm/chunk": typeof llm_chunk;
  "llm/extract": typeof llm_extract;
  "llm/utils": typeof llm_utils;
  projectShares: typeof projectShares;
  projects: typeof projects;
  seed: typeof seed;
  storage: typeof storage;
  tutorial: typeof tutorial;
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

export declare const components: {
  persistentTextStreaming: {
    lib: {
      addChunk: FunctionReference<
        "mutation",
        "internal",
        { final: boolean; streamId: string; text: string },
        any
      >;
      createStream: FunctionReference<"mutation", "internal", {}, any>;
      getStreamStatus: FunctionReference<
        "query",
        "internal",
        { streamId: string },
        "pending" | "streaming" | "done" | "error" | "timeout"
      >;
      getStreamText: FunctionReference<
        "query",
        "internal",
        { streamId: string },
        {
          status: "pending" | "streaming" | "done" | "error" | "timeout";
          text: string;
        }
      >;
      setStreamStatus: FunctionReference<
        "mutation",
        "internal",
        {
          status: "pending" | "streaming" | "done" | "error" | "timeout";
          streamId: string;
        },
        any
      >;
    };
  };
};
