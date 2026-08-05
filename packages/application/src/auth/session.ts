export type AuthSession = Readonly<{
  sessionId: string;
  userId: string;
  organizationId: string;
  expiresAt: string;
}>;

export interface SessionStore {
  read(rawToken: string): Promise<AuthSession | null>;
  rotate(
    rawToken: string,
    nextToken: string,
  ): Promise<Readonly<{ session: AuthSession; token: string }>>;
  revoke(rawToken: string): Promise<void>;
}

export interface SessionClock {
  now(): string;
}

export interface SessionTokenGenerator {
  create(): string;
}

export class SessionDeniedError extends Error {
  readonly code = "SESSION_DENIED" as const;

  constructor(message = "Session denied") {
    super(message);
    this.name = "SessionDeniedError";
  }
}

export class SessionService {
  constructor(
    private readonly store: SessionStore,
    private readonly clock: SessionClock,
    private readonly tokens: SessionTokenGenerator,
  ) {}

  async require(rawToken: string): Promise<AuthSession> {
    if (!rawToken) throw new SessionDeniedError();
    const session = await this.store.read(rawToken);
    if (
      !session ||
      Date.parse(session.expiresAt) <= Date.parse(this.clock.now())
    ) {
      throw new SessionDeniedError();
    }
    return session;
  }

  async rotate(
    rawToken: string,
  ): Promise<Readonly<{ session: AuthSession; token: string }>> {
    await this.require(rawToken);
    return this.store.rotate(rawToken, this.tokens.create());
  }

  revoke(rawToken: string): Promise<void> {
    return this.store.revoke(rawToken);
  }
}
