const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export type CsrfRequest = Readonly<{
  method: string;
  origin: string;
  expectedOrigin: string;
  headerToken?: string;
  cookieToken?: string;
}>;

export class CsrfDeniedError extends Error {
  readonly code = "CSRF_DENIED" as const;

  constructor(message = "CSRF validation failed") {
    super(message);
    this.name = "CsrfDeniedError";
  }
}

function sameSecret(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function assertCsrf(request: CsrfRequest): void {
  if (safeMethods.has(request.method.toUpperCase())) return;
  if (request.origin !== request.expectedOrigin)
    throw new CsrfDeniedError("Origin validation failed");
  if (
    !request.headerToken ||
    !request.cookieToken ||
    !sameSecret(request.headerToken, request.cookieToken)
  ) {
    throw new CsrfDeniedError();
  }
}
