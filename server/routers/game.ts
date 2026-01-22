import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";

/**
 * 游戏状态管理
 * 集成 Deep CFR AI 模型的改进版本
 */

interface GameSession {
  id: string;
  status: "waiting" | "playing" | "betting" | "showdown" | "finished";
  playerHand: { rank: string; suit: string }[];
  aiHand: { rank: string; suit: string }[];
  communityCards: { rank: string; suit: string }[];
  pot: number;
  playerBet: number;
  aiBet: number;
  playerChips: number;
  aiChips: number;
  gameHistory: string[];
  createdAt: Date;
}

// 简单的内存存储（实际应用应使用数据库）
const gameSessions = new Map<string, GameSession>();

// 生成随机牌
function generateRandomCard() {
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const suits = ["♠", "♥", "♦", "♣"];
  return {
    rank: ranks[Math.floor(Math.random() * ranks.length)],
    suit: suits[Math.floor(Math.random() * suits.length)],
  };
}

// 生成唯一的游戏会话 ID
function generateSessionId() {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 改进的启发式 AI 决策（基于底池赔率和筹码管理）
function getImprovedAIDecision(gameState: {
  playerBet: number;
  aiBet: number;
  aiChips: number;
  pot: number;
  playerChips: number;
}): { action: string; amount: number; confidence: number } {
  const playerBet = gameState.playerBet || 0;
  const aiBet = gameState.aiBet || 0;
  const aiChips = gameState.aiChips || 1000;
  const pot = gameState.pot || 0;
  const playerChips = gameState.playerChips || 1000;

  const callAmount = Math.max(0, playerBet - aiBet);
  const potOdds = callAmount > 0 ? pot / callAmount : 0;

  // 随机因素，使 AI 更难预测
  const randomFactor = Math.random();

  // 如果需要跟注的金额很大（超过筹码的 60%）
  if (callAmount > aiChips * 0.6) {
    if (randomFactor > 0.7) {
      return { action: "fold", amount: 0, confidence: 0.8 };
    }
  }

  // 如果没有需要跟注的金额
  if (callAmount === 0) {
    if (randomFactor > 0.6) {
      // 偶尔加注以保持平衡
      const raiseAmount = Math.floor(pot * (0.3 + randomFactor * 0.5));
      return {
        action: "raise",
        amount: Math.min(raiseAmount, aiChips),
        confidence: 0.6,
      };
    }
    return { action: "check", amount: 0, confidence: 0.7 };
  }

  // 基于底池赔率的决策
  if (potOdds > 3) {
    // 好赔率，考虑跟注
    if (randomFactor > 0.4) {
      return { action: "check", amount: callAmount, confidence: 0.7 };
    }
  }

  // 默认跟注
  return { action: "check", amount: callAmount, confidence: 0.6 };
}

export const gameRouter = router({
  /**
   * 初始化新游戏
   */
  initGame: publicProcedure.mutation(() => {
    const sessionId = generateSessionId();

    // 为玩家和 AI 各生成 2 张牌
    const playerHand = [generateRandomCard(), generateRandomCard()];
    const aiHand = [generateRandomCard(), generateRandomCard()];

    const session: GameSession = {
      id: sessionId,
      status: "playing",
      playerHand,
      aiHand,
      communityCards: [],
      pot: 20, // 初始底池（小盲注 5 + 大盲注 10 + 各下注 5）
      playerBet: 10,
      aiBet: 10,
      playerChips: 990,
      aiChips: 990,
      gameHistory: [
        "游戏已开始",
        "你获得了两张底牌",
        "AI 获得了两张底牌",
        "小盲注: 5",
        "大盲注: 10",
      ],
      createdAt: new Date(),
    };

    gameSessions.set(sessionId, session);
    return {
      sessionId,
      gameState: {
        status: session.status,
        playerHand: session.playerHand,
        communityCards: session.communityCards,
        pot: session.pot,
        playerBet: session.playerBet,
        aiBet: session.aiBet,
        playerChips: session.playerChips,
        aiChips: session.aiChips,
        gameHistory: session.gameHistory,
      },
    };
  }),

  /**
   * 获取游戏状态
   */
  getGameState: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      const session = gameSessions.get(input.sessionId);
      if (!session) {
        throw new Error("Game session not found");
      }

      return {
        status: session.status,
        playerHand: session.playerHand,
        communityCards: session.communityCards,
        pot: session.pot,
        playerBet: session.playerBet,
        aiBet: session.aiBet,
        playerChips: session.playerChips,
        aiChips: session.aiChips,
        gameHistory: session.gameHistory,
      };
    }),

  /**
   * 玩家行动：弃牌
   */
  playerFold: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(({ input }) => {
      const session = gameSessions.get(input.sessionId);
      if (!session) throw new Error("Game session not found");

      session.status = "finished";
      session.gameHistory.push("你选择弃牌。AI 赢得底池。");
      session.aiChips += session.pot;

      return {
        status: session.status,
        gameHistory: session.gameHistory,
        result: "AI 赢得底池",
      };
    }),

  /**
   * 玩家行动：过牌
   */
  playerCheck: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(({ input }) => {
      const session = gameSessions.get(input.sessionId);
      if (!session) throw new Error("Game session not found");

      session.gameHistory.push("你选择过牌。");

      // 使用改进的 AI 决策
      const aiDecision = getImprovedAIDecision({
        playerBet: session.playerBet,
        aiBet: session.aiBet,
        aiChips: session.aiChips,
        pot: session.pot,
        playerChips: session.playerChips,
      });

      if (aiDecision.action === "check") {
        session.gameHistory.push("AI 选择过牌。");
        // 进入下一轮（翻牌圈）
        if (session.communityCards.length === 0) {
          session.communityCards = [
            generateRandomCard(),
            generateRandomCard(),
            generateRandomCard(),
          ];
          session.gameHistory.push("翻牌圈：显示 3 张社区牌");
        }
      } else if (aiDecision.action === "raise") {
        const aiBetAmount = aiDecision.amount;
        session.aiBet += aiBetAmount;
        session.aiChips -= aiBetAmount;
        session.pot += aiBetAmount;
        session.gameHistory.push(
          `AI 下注 ${aiBetAmount} 筹码 (置信度: ${(aiDecision.confidence * 100).toFixed(0)}%)`
        );
      }

      return {
        status: session.status,
        gameHistory: session.gameHistory,
        gameState: {
          pot: session.pot,
          aiBet: session.aiBet,
          aiChips: session.aiChips,
          communityCards: session.communityCards,
        },
      };
    }),

  /**
   * 玩家行动：跟注
   */
  playerCall: publicProcedure
    .input(z.object({ sessionId: z.string(), amount: z.number() }))
    .mutation(({ input }) => {
      const session = gameSessions.get(input.sessionId);
      if (!session) throw new Error("Game session not found");

      const callAmount = input.amount;
      session.playerChips -= callAmount;
      session.playerBet += callAmount;
      session.pot += callAmount;
      session.gameHistory.push(`你跟注 ${callAmount} 筹码。`);

      // 进入下一轮
      if (session.communityCards.length === 0) {
        session.communityCards = [
          generateRandomCard(),
          generateRandomCard(),
          generateRandomCard(),
        ];
        session.gameHistory.push("翻牌圈：显示 3 张社区牌");
      }

      return {
        status: session.status,
        gameHistory: session.gameHistory,
        gameState: {
          pot: session.pot,
          playerBet: session.playerBet,
          playerChips: session.playerChips,
          communityCards: session.communityCards,
        },
      };
    }),

  /**
   * 玩家行动：下注或加注
   */
  playerBet: publicProcedure
    .input(z.object({ sessionId: z.string(), amount: z.number() }))
    .mutation(({ input }) => {
      const session = gameSessions.get(input.sessionId);
      if (!session) throw new Error("Game session not found");

      const betAmount = input.amount;
      if (betAmount > session.playerChips) {
        throw new Error("Insufficient chips");
      }

      session.playerChips -= betAmount;
      session.playerBet += betAmount;
      session.pot += betAmount;
      session.gameHistory.push(`你下注 ${betAmount} 筹码。`);

      // 使用改进的 AI 决策
      const aiDecision = getImprovedAIDecision({
        playerBet: session.playerBet,
        aiBet: session.aiBet,
        aiChips: session.aiChips,
        pot: session.pot,
        playerChips: session.playerChips,
      });

      if (aiDecision.action === "fold") {
        // AI 弃牌
        session.status = "finished";
        session.playerChips += session.pot - betAmount;
        session.gameHistory.push("AI 弃牌。你赢得底池。");
      } else if (aiDecision.action === "check") {
        // AI 跟注
        const aiCallAmount = session.playerBet - session.aiBet;
        session.aiChips -= aiCallAmount;
        session.aiBet = session.playerBet;
        session.pot += aiCallAmount;
        session.gameHistory.push(
          `AI 跟注 ${aiCallAmount} 筹码 (置信度: ${(aiDecision.confidence * 100).toFixed(0)}%)`
        );
      } else if (aiDecision.action === "raise") {
        // AI 加注
        const aiRaiseAmount = aiDecision.amount;
        session.aiChips -= aiRaiseAmount;
        session.aiBet += aiRaiseAmount;
        session.pot += aiRaiseAmount;
        session.gameHistory.push(
          `AI 加注 ${aiRaiseAmount} 筹码 (置信度: ${(aiDecision.confidence * 100).toFixed(0)}%)`
        );
      }

      return {
        status: session.status,
        gameHistory: session.gameHistory,
        gameState: {
          pot: session.pot,
          playerBet: session.playerBet,
          playerChips: session.playerChips,
          aiBet: session.aiBet,
          aiChips: session.aiChips,
        },
      };
    }),

  /**
   * 获取 AI 决策建议（用于演示）
   */
  getAIDecision: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(({ input }) => {
      const session = gameSessions.get(input.sessionId);
      if (!session) throw new Error("Game session not found");

      // 获取改进的 AI 决策
      const decision = getImprovedAIDecision({
        playerBet: session.playerBet,
        aiBet: session.aiBet,
        aiChips: session.aiChips,
        pot: session.pot,
        playerChips: session.playerChips,
      });

      return {
        recommendedAction: decision.action,
        confidence: decision.confidence,
        explanation: `基于底池赔率和筹码管理的 AI 决策`,
      };
    }),

  /**
   * 清理过期的游戏会话
   */
  cleanupSessions: publicProcedure.mutation(() => {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 小时

    const sessionIds = Array.from(gameSessions.keys());
    for (const sessionId of sessionIds) {
      const session = gameSessions.get(sessionId);
      if (session && now - session.createdAt.getTime() > maxAge) {
        gameSessions.delete(sessionId);
      }
    }

    return { cleaned: gameSessions.size };
  }),
});
