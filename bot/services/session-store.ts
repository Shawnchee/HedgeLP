/**
 * In-memory session store for multi-step interactive flows.
 *
 * Tracks per-user state for deposit, withdraw, and rebalance flows.
 * Sessions auto-expire after a configurable TTL.
 */

export type FlowType = "deposit" | "withdraw" | "rebalance";

export interface UserSession {
  flow: FlowType;
  chatId: number;
  userId: number;
  step: string;
  data: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

class SessionStore {
  private sessions = new Map<number, UserSession>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  /** Start or replace a session for a user. */
  start(userId: number, chatId: number, flow: FlowType, step: string): UserSession {
    const session: UserSession = {
      flow,
      chatId,
      userId,
      step,
      data: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.sessions.set(userId, session);
    return session;
  }

  /** Get the active session for a user (null if expired/none). */
  get(userId: number): UserSession | null {
    const session = this.sessions.get(userId);
    if (!session) return null;
    if (Date.now() - session.updatedAt > SESSION_TTL_MS) {
      this.sessions.delete(userId);
      return null;
    }
    return session;
  }

  /** Update session step and/or data. */
  update(userId: number, step: string, data?: Record<string, unknown>): UserSession | null {
    const session = this.sessions.get(userId);
    if (!session) return null;
    session.step = step;
    session.updatedAt = Date.now();
    if (data) Object.assign(session.data, data);
    return session;
  }

  /** Clear a user's session. */
  clear(userId: number): void {
    this.sessions.delete(userId);
  }

  /** Remove expired sessions. */
  private cleanup(): void {
    const cutoff = Date.now() - SESSION_TTL_MS;
    for (const [userId, session] of this.sessions.entries()) {
      if (session.updatedAt < cutoff) {
        this.sessions.delete(userId);
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.sessions.clear();
  }
}

export const sessionStore = new SessionStore();
