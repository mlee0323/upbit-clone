import { Router, Request, Response } from 'express';
import store from '../db.js';

const router = Router();

// Get user's trade history
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ detail: '인증이 필요합니다' });
    }

    const trades = await store.findTradesByUserId(userId);

    res.json(trades.map(t => ({
      id: t.id,
      order_id: t.orderId,
      market: t.market,
      side: t.side,
      price: t.price.toString(),
      volume: t.volume.toString(),
      funds: t.funds.toString(),
      fee: t.fee.toString(),
      created_at: t.createdAt.toISOString()
    })));
  } catch (error) {
    console.error('Trades fetch error:', error);
    res.status(500).json({ detail: '체결 내역 조회에 실패했습니다' });
  }
});

// Get trades for specific order
router.get('/order/:orderId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ detail: '인증이 필요합니다' });
    }

    const orderId = parseInt(req.params.orderId);
    const order = await store.findOrderById(orderId);

    if (!order || order.userId !== userId) {
      return res.status(404).json({ detail: '주문을 찾을 수 없습니다' });
    }

    const trades = await store.findTradesByOrderId(orderId);

    res.json(trades.map(t => ({
      id: t.id,
      order_id: t.orderId,
      market: t.market,
      side: t.side,
      price: t.price.toString(),
      volume: t.volume.toString(),
      funds: t.funds.toString(),
      fee: t.fee.toString(),
      created_at: t.createdAt.toISOString()
    })));
  } catch (error) {
    console.error('Trades fetch error:', error);
    res.status(500).json({ detail: '체결 내역 조회에 실패했습니다' });
  }
});

export default router;
