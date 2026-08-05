import "server-only";

import type {
  AuthorizationService,
  AuthorizationRequest,
} from "@ai-estimate-studio/application";

/** Server route handlers must call this guard before any organization-owned read or mutation. */
export function requirePermission(
  authorization: AuthorizationService,
  request: AuthorizationRequest,
) {
  return authorization.require(request);
}
