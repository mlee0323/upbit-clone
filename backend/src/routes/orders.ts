import { Router, Request, Response } from 'express';
import store from '../db.js';

const router = Router();

const FEE_RATE = 0.0005; // 0.05% 수수료

// Create order (시장가/지정가)
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ detail: '인증이 필요합니다' });
    }

    const { market, side, ord_type, price, volume } = req.body;

    // Validation
    if (!market || !side || !ord_type) {
      return res.status(400).json({ detail: '필수 파라미터가 누락되었습니다' });
    }

    if (!['bid', 'ask'].includes(side)) {
      return res.status(400).json({ detail: '유효하지 않은 주문 타입입니다' });
    }

    if (!['limit', 'market'].includes(ord_type)) {
      return res.status(400).json({ detail: '유효하지 않은 주문 유형입니다' });
    }

    const orderVolume = parseFloat(volume);
    if (!orderVolume || orderVolume <= 0) {
      return res.status(400).json({ detail: '유효한 수량을 입력해주세요' });
    }

    const orderPrice = ord_type === 'limit' ? parseFloat(price) : null;
    if (ord_type === 'limit' && (!orderPrice || orderPrice <= 0)) {
      return res.status(400).json({ detail: '유효한 가격을 입력해주세요' });
    }

    // Get current market price
    const ticker = store.findFirstTickerData(market);
    const currentPrice = ticker?.currentPrice || orderPrice || 0;

    if (!currentPrice) {
      return res.status(400).json({ detail: '현재가를 가져올 수 없습니다' });
    }

    // Calculate total funds
    const executionPrice = ord_type === 'market' ? currentPrice : orderPrice!;
    const funds = executionPrice * orderVolume;
    const fee = funds * FEE_RATE;

    // Check balance for bid (매수)
    if (side === 'bid') {
      const krwBalance = await store.findBalance(userId, 'KRW');
      const requiredKrw = funds + fee;

      if (!krwBalance || krwBalance.balance - krwBalance.locked < requiredKrw) {
        return res.status(400).json({ detail: '잔고가 부족합니다' });
      }

      // Lock KRW
      await store.updateBalance(userId, 'KRW', {
        locked: krwBalance.locked + requiredKrw
      });
    }

    // Check balance for ask (매도)
    if (side === 'ask') {
      const coinCurrency = market.split('-')[1]; // KRW-BTC -> BTC
      const coinBalance = await store.findBalance(userId, coinCurrency);

      if (!coinBalance || coinBalance.balance - coinBalance.locked < orderVolume) {
        return res.status(400).json({ detail: '보유 수량이 부족합니다' });
      }

      // Lock coin
      await store.updateBalance(userId, coinCurrency, {
        locked: coinBalance.locked + orderVolume
      });
    }

    // Create order
    const order = await store.createOrder({
      userId,
      market,
      side: side as 'bid' | 'ask',
      ordType: ord_type as 'limit' | 'market',
      price: orderPrice,
      volume: orderVolume
    });

    // If market order, execute immediately
    if (ord_type === 'market') {
      await executeOrder(order.id, currentPrice);
    }

    res.status(201).json({
      id: order.id,
      market: order.market,
      side: order.side,
      ord_type: order.ordType,
      price: order.price?.toString() || null,
      volume: order.volume.toString(),
      remaining_volume: order.remainingVolume.toString(),
      state: order.state,
      created_at: order.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ detail: '주문 생성에 실패했습니다' });
  }
});

// Get user's orders
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ detail: '인증이 필요합니다' });
    }

    const { state } = req.query;
    const orders = await store.findOrdersByUserId(userId, state as string);

    res.json(orders.map(o => ({
      id: o.id,
      market: o.market,
      side: o.side,
      ord_type: o.ordType,
      price: o.price?.toString() || null,
      volume: o.volume.toString(),
      remaining_volume: o.remainingVolume.toString(),
      state: o.state,
      created_at: o.createdAt.toISOString()
    })));
  } catch (error) {
    console.error('Order fetch error:', error);
    res.status(500).json({ detail: '주문 조회에 실패했습니다' });
  }
});

// Get single order
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ detail: '인증이 필요합니다' });
    }

    const orderId = parseInt(req.params.id);
    const order = await store.findOrderById(orderId);

    if (!order || order.userId !== userId) {
      return res.status(404).json({ detail: '주문을 찾을 수 없습니다' });
    }

    res.json({
      id: order.id,
      market: order.market,
      side: order.side,
      ord_type: order.ordType,
      price: order.price?.toString() || null,
      volume: order.volume.toString(),
      remaining_volume: order.remainingVolume.toString(),
      state: order.state,
      created_at: order.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Order fetch error:', error);
    res.status(500).json({ detail: '주문 조회에 실패했습니다' });
  }
});

// Cancel order
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ detail: '인증이 필요합니다' });
    }

    const orderId = parseInt(req.params.id);
    const order = await store.findOrderById(orderId);

    if (!order || order.userId !== userId) {
      return res.status(404).json({ detail: '주문을 찾을 수 없습니다' });
    }

    if (order.state !== 'wait') {
      return res.status(400).json({ detail: '취소할 수 없는 주문입니다' });
    }

    // Unlock funds
    if (order.side === 'bid') {
      const krwBalance = await store.findBalance(userId, 'KRW');
      if (krwBalance) {
        const lockedAmount = (order.price || 0) * order.remainingVolume * (1 + FEE_RATE);
        await store.updateBalance(userId, 'KRW', {
          locked: Math.max(0, krwBalance.locked - lockedAmount)
        });
      }
    } else {
      const coinCurrency = order.market.split('-')[1];
      const coinBalance = await store.findBalance(userId, coinCurrency);
      if (coinBalance) {
        await store.updateBalance(userId, coinCurrency, {
          locked: Math.max(0, coinBalance.locked - order.remainingVolume)
        });
      }
    }

    // Update order state
    await store.updateOrder(orderId, { state: 'cancel' });

    res.json({ success: true, id: orderId, state: 'cancel' });
  } catch (error) {
    console.error('Order cancel error:', error);
    res.status(500).json({ detail: '주문 취소에 실패했습니다' });
  }
});

// Helper: Execute order (for market orders and matched limit orders)
async function executeOrder(orderId: number, executionPrice: number) {
  const order = await store.findOrderById(orderId);
  if (!order || order.state !== 'wait') return;

  const volume = order.remainingVolume;
  const funds = executionPrice * volume;
  const fee = funds * FEE_RATE;

  const coinCurrency = order.market.split('-')[1];

  if (order.side === 'bid') {
    // 매수: KRW 차감, 코인 증가
    const krwBalance = (await store.findBalance(order.userId, 'KRW'))!;
    const coinBalance = await store.getOrCreateBalance(order.userId, coinCurrency);

    // Calculate new average buy price
    const totalValue = coinBalance.balance * coinBalance.avgBuyPrice + funds;
    const totalVolume = coinBalance.balance + volume;
    const newAvgPrice = totalVolume > 0 ? totalValue / totalVolume : executionPrice;

    await store.updateBalance(order.userId, 'KRW', {
      balance: krwBalance.balance - funds - fee,
      locked: Math.max(0, krwBalance.locked - funds - fee)
    });

    await store.updateBalance(order.userId, coinCurrency, {
      balance: coinBalance.balance + volume,
      avgBuyPrice: newAvgPrice
    });
  } else {
    // 매도: 코인 차감, KRW 증가
    const coinBalance = (await store.findBalance(order.userId, coinCurrency))!;
    const krwBalance = await store.getOrCreateBalance(order.userId, 'KRW');

    await store.updateBalance(order.userId, coinCurrency, {
      balance: coinBalance.balance - volume,
      locked: Math.max(0, coinBalance.locked - volume)
    });

    await store.updateBalance(order.userId, 'KRW', {
      balance: krwBalance.balance + funds - fee
    });
  }

  // Create trade record
  await store.createTrade({
    orderId: order.id,
    userId: order.userId,
    market: order.market,
    side: order.side,
    price: executionPrice,
    volume,
    funds,
    fee
  });

  // Update order
  await store.updateOrder(orderId, {
    remainingVolume: 0,
    state: 'done'
  });
}

// Export for scheduler
export { executeOrder };
export default router;
