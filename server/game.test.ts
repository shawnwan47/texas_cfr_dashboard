import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("game router", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  describe("initGame", () => {
    it("should initialize a new game session", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.game.initGame();

      expect(result).toHaveProperty("sessionId");
      expect(result).toHaveProperty("gameState");
      expect(result.gameState.status).toBe("playing");
      expect(result.gameState.playerHand).toHaveLength(2);
      expect(result.gameState.playerChips).toBe(990);
      expect(result.gameState.aiChips).toBe(990);
      expect(result.gameState.pot).toBe(20);
    });

    it("should generate unique session IDs", async () => {
      const caller = appRouter.createCaller(ctx);
      const result1 = await caller.game.initGame();
      const result2 = await caller.game.initGame();

      expect(result1.sessionId).not.toBe(result2.sessionId);
    });

    it("should initialize game history", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.game.initGame();

      expect(result.gameState.gameHistory).toContain("游戏已开始");
      expect(result.gameState.gameHistory.length).toBeGreaterThan(0);
    });
  });

  describe("playerFold", () => {
    it("should handle player fold action", async () => {
      const caller = appRouter.createCaller(ctx);
      const initResult = await caller.game.initGame();
      const sessionId = initResult.sessionId;

      const result = await caller.game.playerFold({ sessionId });

      expect(result.status).toBe("finished");
      expect(result.result).toBe("AI 赢得底池");
      expect(result.gameHistory).toContain("你选择弃牌。AI 赢得底池。");
    });

    it("should throw error for invalid session", async () => {
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.game.playerFold({ sessionId: "invalid_session" })
      ).rejects.toThrow("Game session not found");
    });
  });

  describe("playerCheck", () => {
    it("should handle player check action", async () => {
      const caller = appRouter.createCaller(ctx);
      const initResult = await caller.game.initGame();
      const sessionId = initResult.sessionId;

      const result = await caller.game.playerCheck({ sessionId });

      expect(result.gameHistory).toContain("你选择过牌。");
      expect(result.gameState).toHaveProperty("pot");
    });
  });

  describe("playerCall", () => {
    it("should handle player call action", async () => {
      const caller = appRouter.createCaller(ctx);
      const initResult = await caller.game.initGame();
      const sessionId = initResult.sessionId;
      const callAmount = 10;

      const result = await caller.game.playerCall({ sessionId, amount: callAmount });

      expect(result.gameHistory).toContain(`你跟注 ${callAmount} 筹码。`);
      expect(result.gameState.playerChips).toBe(990 - callAmount);
      expect(result.gameState.pot).toBeGreaterThan(20);
    });
  });

  describe("playerBet", () => {
    it("should handle player bet action", async () => {
      const caller = appRouter.createCaller(ctx);
      const initResult = await caller.game.initGame();
      const sessionId = initResult.sessionId;
      const betAmount = 50;

      const result = await caller.game.playerBet({ sessionId, amount: betAmount });

      expect(result.gameHistory).toContain(`你下注 ${betAmount} 筹码。`);
      expect(result.gameState.playerChips).toBe(990 - betAmount);
    });

    it("should throw error for insufficient chips", async () => {
      const caller = appRouter.createCaller(ctx);
      const initResult = await caller.game.initGame();
      const sessionId = initResult.sessionId;
      const betAmount = 2000; // More than available chips

      await expect(
        caller.game.playerBet({ sessionId, amount: betAmount })
      ).rejects.toThrow("Insufficient chips");
    });
  });

  describe("getGameState", () => {
    it("should retrieve current game state", async () => {
      const caller = appRouter.createCaller(ctx);
      const initResult = await caller.game.initGame();
      const sessionId = initResult.sessionId;

      const state = await caller.game.getGameState({ sessionId });

      expect(state).toHaveProperty("status");
      expect(state).toHaveProperty("playerHand");
      expect(state).toHaveProperty("communityCards");
      expect(state).toHaveProperty("pot");
      expect(state).toHaveProperty("playerChips");
      expect(state).toHaveProperty("aiChips");
    });

    it("should throw error for invalid session", async () => {
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.game.getGameState({ sessionId: "invalid_session" })
      ).rejects.toThrow("Game session not found");
    });
  });

  describe("getAIDecision", () => {
    it("should return AI decision recommendations", async () => {
      const caller = appRouter.createCaller(ctx);
      const initResult = await caller.game.initGame();
      const sessionId = initResult.sessionId;

      const decision = await caller.game.getAIDecision({ sessionId });

      expect(decision).toHaveProperty("recommendedAction");
      expect(decision).toHaveProperty("allDecisions");
      expect(decision.allDecisions).toHaveLength(4);
      expect(["fold", "check", "call", "bet"]).toContain(decision.recommendedAction);
    });
  });

  describe("cleanupSessions", () => {
    it("should execute cleanup without errors", async () => {
      const caller = appRouter.createCaller(ctx);

      const result = await caller.game.cleanupSessions();

      expect(result).toHaveProperty("cleaned");
      expect(typeof result.cleaned).toBe("number");
    });
  });
});
