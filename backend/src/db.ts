// Database client using Prisma
// Connects to PostgreSQL when USE_REAL_DB=true, otherwise uses in-memory store

import { PrismaClient, Prisma } from '@prisma/client';

const useRealDB = process.env.USE_REAL_DB === 'true';

// Prisma client singleton
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Type exports for convenience
export type User = {
  id: number;
  email: string;
  hashedPassword: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
};

export type UserBalance = {
  id: number;
  userId: number;
  currency: string;
  balance: number;
  locked: number;
  avgBuyPrice: number;
};

export type KrwTransaction = {
  id: number;
  userId: number;
  type: 'deposit' | 'withdraw';
  amount: number;
  createdAt: Date;
};

export type Order = {
  id: number;
  userId: number;
  market: string;
  side: 'bid' | 'ask';
  ordType: 'limit' | 'market';
  price: number | null;
  volume: number;
  remainingVolume: number;
  state: 'wait' | 'done' | 'cancel';
  createdAt: Date;
};

export type Trade = {
  id: number;
  orderId: number;
  userId: number;
  market: string;
  side: 'bid' | 'ask';
  price: number;
  volume: number;
  funds: number;
  fee: number;
  createdAt: Date;
};

export type Favorite = {
  id: number;
  userId: number;
  market: string;
  createdAt: Date;
};

export type Post = {
  id: number;
  userId: number;
  category: string;
  title: string;
  content: string | null;
  views: number;
  likes: number;
  createdAt: Date;
};

export type Comment = {
  id: number;
  postId: number;
  userId: number;
  content: string;
  createdAt: Date;
};

// Helper to convert Prisma Decimal to number
const toNumber = (val: Prisma.Decimal | null): number => {
  return val ? parseFloat(val.toString()) : 0;
};

// Database abstraction layer
class DatabaseStore {
  // ============ User Methods ============
  
  async createUser(data: { email: string; hashedPassword: string; name: string }): Promise<User> {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        hashedPassword: data.hashedPassword,
        name: data.name,
      },
    });
    
    // Auto-create KRW balance
    await prisma.userBalance.create({
      data: { userId: user.id, currency: 'KRW', balance: 0, locked: 0, avgBuyPrice: 0 },
    });
    
    return {
      id: user.id,
      email: user.email,
      hashedPassword: user.hashedPassword,
      name: user.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      hashedPassword: user.hashedPassword,
      name: user.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async findUserById(id: number): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      hashedPassword: user.hashedPassword,
      name: user.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async updateUser(id: number, data: Partial<Pick<User, 'name' | 'isActive' | 'hashedPassword'>>): Promise<User | null> {
    const user = await prisma.user.update({
      where: { id },
      data,
    });
    return {
      id: user.id,
      email: user.email,
      hashedPassword: user.hashedPassword,
      name: user.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  // ============ Balance Methods ============
  
  async findBalancesByUserId(userId: number): Promise<UserBalance[]> {
    const balances = await prisma.userBalance.findMany({ where: { userId } });
    return balances.map(b => ({
      id: b.id,
      userId: b.userId,
      currency: b.currency,
      balance: toNumber(b.balance),
      locked: toNumber(b.locked),
      avgBuyPrice: toNumber(b.avgBuyPrice),
    }));
  }

  async findBalance(userId: number, currency: string): Promise<UserBalance | null> {
    const balance = await prisma.userBalance.findUnique({
      where: { userId_currency: { userId, currency } },
    });
    if (!balance) return null;
    return {
      id: balance.id,
      userId: balance.userId,
      currency: balance.currency,
      balance: toNumber(balance.balance),
      locked: toNumber(balance.locked),
      avgBuyPrice: toNumber(balance.avgBuyPrice),
    };
  }

  async getOrCreateBalance(userId: number, currency: string): Promise<UserBalance> {
    let balance = await this.findBalance(userId, currency);
    if (!balance) {
      const created = await prisma.userBalance.create({
        data: { userId, currency, balance: 0, locked: 0, avgBuyPrice: 0 },
      });
      balance = {
        id: created.id,
        userId: created.userId,
        currency: created.currency,
        balance: 0,
        locked: 0,
        avgBuyPrice: 0,
      };
    }
    return balance;
  }

  async updateBalance(
    userId: number,
    currency: string,
    updates: Partial<Pick<UserBalance, 'balance' | 'locked' | 'avgBuyPrice'>>
  ): Promise<UserBalance | null> {
    const balance = await prisma.userBalance.update({
      where: { userId_currency: { userId, currency } },
      data: updates,
    });
    return {
      id: balance.id,
      userId: balance.userId,
      currency: balance.currency,
      balance: toNumber(balance.balance),
      locked: toNumber(balance.locked),
      avgBuyPrice: toNumber(balance.avgBuyPrice),
    };
  }

  // ============ KRW Transaction Methods ============
  
  async createKrwTransaction(data: { userId: number; type: 'deposit' | 'withdraw'; amount: number }): Promise<KrwTransaction> {
    const tx = await prisma.krwTransaction.create({ data });
    return {
      id: tx.id,
      userId: tx.userId,
      type: tx.type as 'deposit' | 'withdraw',
      amount: toNumber(tx.amount),
      createdAt: tx.createdAt,
    };
  }

  async findKrwTransactionsByUserId(userId: number): Promise<KrwTransaction[]> {
    const txs = await prisma.krwTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return txs.map(tx => ({
      id: tx.id,
      userId: tx.userId,
      type: tx.type as 'deposit' | 'withdraw',
      amount: toNumber(tx.amount),
      createdAt: tx.createdAt,
    }));
  }

  // ============ Order Methods ============
  
  async createOrder(data: Omit<Order, 'id' | 'createdAt' | 'remainingVolume' | 'state'>): Promise<Order> {
    const order = await prisma.order.create({
      data: {
        ...data,
        remainingVolume: data.volume,
        state: 'wait',
      },
    });
    return {
      id: order.id,
      userId: order.userId,
      market: order.market,
      side: order.side as 'bid' | 'ask',
      ordType: order.ordType as 'limit' | 'market',
      price: order.price ? toNumber(order.price) : null,
      volume: toNumber(order.volume),
      remainingVolume: toNumber(order.remainingVolume),
      state: order.state as 'wait' | 'done' | 'cancel',
      createdAt: order.createdAt,
    };
  }

  async findOrderById(id: number): Promise<Order | null> {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return null;
    return {
      id: order.id,
      userId: order.userId,
      market: order.market,
      side: order.side as 'bid' | 'ask',
      ordType: order.ordType as 'limit' | 'market',
      price: order.price ? toNumber(order.price) : null,
      volume: toNumber(order.volume),
      remainingVolume: toNumber(order.remainingVolume),
      state: order.state as 'wait' | 'done' | 'cancel',
      createdAt: order.createdAt,
    };
  }

  async findOrdersByUserId(userId: number, state?: string): Promise<Order[]> {
    const orders = await prisma.order.findMany({
      where: { userId, ...(state && { state }) },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(o => ({
      id: o.id,
      userId: o.userId,
      market: o.market,
      side: o.side as 'bid' | 'ask',
      ordType: o.ordType as 'limit' | 'market',
      price: o.price ? toNumber(o.price) : null,
      volume: toNumber(o.volume),
      remainingVolume: toNumber(o.remainingVolume),
      state: o.state as 'wait' | 'done' | 'cancel',
      createdAt: o.createdAt,
    }));
  }

  async findOpenOrders(): Promise<Order[]> {
    const orders = await prisma.order.findMany({
      where: { state: 'wait' },
    });
    return orders.map(o => ({
      id: o.id,
      userId: o.userId,
      market: o.market,
      side: o.side as 'bid' | 'ask',
      ordType: o.ordType as 'limit' | 'market',
      price: o.price ? toNumber(o.price) : null,
      volume: toNumber(o.volume),
      remainingVolume: toNumber(o.remainingVolume),
      state: o.state as 'wait' | 'done' | 'cancel',
      createdAt: o.createdAt,
    }));
  }

  async updateOrder(id: number, updates: Partial<Pick<Order, 'remainingVolume' | 'state'>>): Promise<Order | null> {
    const order = await prisma.order.update({ where: { id }, data: updates });
    return {
      id: order.id,
      userId: order.userId,
      market: order.market,
      side: order.side as 'bid' | 'ask',
      ordType: order.ordType as 'limit' | 'market',
      price: order.price ? toNumber(order.price) : null,
      volume: toNumber(order.volume),
      remainingVolume: toNumber(order.remainingVolume),
      state: order.state as 'wait' | 'done' | 'cancel',
      createdAt: order.createdAt,
    };
  }

  // ============ Trade Methods ============
  
  async createTrade(data: Omit<Trade, 'id' | 'createdAt'>): Promise<Trade> {
    const trade = await prisma.trade.create({ data });
    return {
      id: trade.id,
      orderId: trade.orderId,
      userId: trade.userId,
      market: trade.market,
      side: trade.side as 'bid' | 'ask',
      price: toNumber(trade.price),
      volume: toNumber(trade.volume),
      funds: toNumber(trade.funds),
      fee: toNumber(trade.fee),
      createdAt: trade.createdAt,
    };
  }

  async findTradesByUserId(userId: number): Promise<Trade[]> {
    const trades = await prisma.trade.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return trades.map(t => ({
      id: t.id,
      orderId: t.orderId,
      userId: t.userId,
      market: t.market,
      side: t.side as 'bid' | 'ask',
      price: toNumber(t.price),
      volume: toNumber(t.volume),
      funds: toNumber(t.funds),
      fee: toNumber(t.fee),
      createdAt: t.createdAt,
    }));
  }

  async findTradesByOrderId(orderId: number): Promise<Trade[]> {
    const trades = await prisma.trade.findMany({ where: { orderId } });
    return trades.map(t => ({
      id: t.id,
      orderId: t.orderId,
      userId: t.userId,
      market: t.market,
      side: t.side as 'bid' | 'ask',
      price: toNumber(t.price),
      volume: toNumber(t.volume),
      funds: toNumber(t.funds),
      fee: toNumber(t.fee),
      createdAt: t.createdAt,
    }));
  }

  // ============ Favorite Methods ============
  
  async createFavorite(userId: number, market: string): Promise<Favorite | null> {
    try {
      const fav = await prisma.favorite.create({ data: { userId, market } });
      return {
        id: fav.id,
        userId: fav.userId,
        market: fav.market,
        createdAt: fav.createdAt,
      };
    } catch {
      return null; // Already exists
    }
  }

  async deleteFavorite(userId: number, market: string): Promise<boolean> {
    try {
      await prisma.favorite.delete({
        where: { userId_market: { userId, market } },
      });
      return true;
    } catch {
      return false;
    }
  }

  async findFavoritesByUserId(userId: number): Promise<Favorite[]> {
    const favs = await prisma.favorite.findMany({ where: { userId } });
    return favs.map(f => ({
      id: f.id,
      userId: f.userId,
      market: f.market,
      createdAt: f.createdAt,
    }));
  }

  async isFavorite(userId: number, market: string): Promise<boolean> {
    const fav = await prisma.favorite.findUnique({
      where: { userId_market: { userId, market } },
    });
    return !!fav;
  }

  // ============ Post Methods ============
  
  async createPost(data: Omit<Post, 'id' | 'createdAt' | 'views' | 'likes'>): Promise<Post> {
    const post = await prisma.post.create({
      data: { ...data, views: 0, likes: 0 },
    });
    return {
      id: post.id,
      userId: post.userId,
      category: post.category,
      title: post.title,
      content: post.content,
      views: post.views,
      likes: post.likes,
      createdAt: post.createdAt,
    };
  }

  async findPostById(id: number): Promise<Post | null> {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return null;
    return {
      id: post.id,
      userId: post.userId,
      category: post.category,
      title: post.title,
      content: post.content,
      views: post.views,
      likes: post.likes,
      createdAt: post.createdAt,
    };
  }

  async findPosts(category?: string, limit: number = 20, offset: number = 0): Promise<Post[]> {
    const posts = await prisma.post.findMany({
      where: category && category !== '전체' ? { category } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return posts.map(p => ({
      id: p.id,
      userId: p.userId,
      category: p.category,
      title: p.title,
      content: p.content,
      views: p.views,
      likes: p.likes,
      createdAt: p.createdAt,
    }));
  }

  async findPostsByUserId(userId: number): Promise<Post[]> {
    const posts = await prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return posts.map(p => ({
      id: p.id,
      userId: p.userId,
      category: p.category,
      title: p.title,
      content: p.content,
      views: p.views,
      likes: p.likes,
      createdAt: p.createdAt,
    }));
  }

  async updatePost(id: number, updates: Partial<Pick<Post, 'title' | 'content' | 'views' | 'likes'>>): Promise<Post | null> {
    const post = await prisma.post.update({ where: { id }, data: updates });
    return {
      id: post.id,
      userId: post.userId,
      category: post.category,
      title: post.title,
      content: post.content,
      views: post.views,
      likes: post.likes,
      createdAt: post.createdAt,
    };
  }

  async deletePost(id: number): Promise<boolean> {
    try {
      await prisma.post.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // ============ Comment Methods ============
  
  async createComment(data: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> {
    const comment = await prisma.comment.create({ data });
    return {
      id: comment.id,
      postId: comment.postId,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt,
    };
  }

  async findCommentsByPostId(postId: number): Promise<Comment[]> {
    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
    });
    return comments.map(c => ({
      id: c.id,
      postId: c.postId,
      userId: c.userId,
      content: c.content,
      createdAt: c.createdAt,
    }));
  }

  async findCommentsByUserId(userId: number): Promise<Comment[]> {
    const comments = await prisma.comment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return comments.map(c => ({
      id: c.id,
      postId: c.postId,
      userId: c.userId,
      content: c.content,
      createdAt: c.createdAt,
    }));
  }

  async deleteComment(id: number): Promise<boolean> {
    try {
      await prisma.comment.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async getCommentCount(postId: number): Promise<number> {
    return prisma.comment.count({ where: { postId } });
  }

  // ============ Ticker Methods (In-Memory, no DB table) ============
  private tickerData: Map<string, { currentPrice: number; changeRate: number; volume: number; time: Date }> = new Map();

  createTickerData(data: { symbol: string; currentPrice: number; changeRate: number; volume: number }) {
    this.tickerData.set(data.symbol, { ...data, time: new Date() });
    return { id: 0, time: new Date(), ...data };
  }

  createManyTickerData(dataArray: { symbol: string; currentPrice: number; changeRate: number; volume: number }[]) {
    return dataArray.map(d => this.createTickerData(d));
  }

  findFirstTickerData(symbol: string) {
    const data = this.tickerData.get(symbol);
    if (!data) return null;
    return { id: 0, symbol, ...data };
  }

  findManyTickerData(symbol: string, limit: number = 30) {
    const data = this.tickerData.get(symbol);
    if (!data) return [];
    return [{ id: 0, symbol, ...data }];
  }

  getLatestTickers() {
    const result: { [symbol: string]: { currentPrice: number; time: Date } } = {};
    this.tickerData.forEach((value, key) => {
      result[key] = { currentPrice: value.currentPrice, time: value.time };
    });
    return result;
  }
}

const store = new DatabaseStore();
export default store;
export { prisma };
