import { Router, Request, Response } from 'express';
import store from '../db.js';

const router = Router();

// Get user balances
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ detail: '인증이 필요합니다' });
    }

    const balances = await store.findBalancesByUserId(userId);
    
    // Format response
    const formatted = balances.map(b => ({
      currency: b.currency,
      balance: b.balance.toString(),
      locked: b.locked.toString(),
      avg_buy_price: b.avgBuyPrice.toString(),
      available: (b.balance - b.locked).toString()
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ detail: '잔고 조회에 실패했습니다' });
  }
});

// Get specific currency balance
router.get('/:currency', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ detail: '인증이 필요합니다' });
    }

    const { currency } = req.params;
    const balance = await store.findBalance(userId, currency.toUpperCase());

    if (!balance) {
      return res.json({
        currency: currency.toUpperCase(),
        balance: '0',
        locked: '0',
        avg_buy_price: '0',
        available: '0'
      });
    }

    res.json({
      currency: balance.currency,
      balance: balance.balance.toString(),
      locked: balance.locked.toString(),
      avg_buy_price: balance.avgBuyPrice.toString(),
      available: (balance.balance - balance.locked).toString()
    });
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ detail: '잔고 조회에 실패했습니다' });
  }
});

export default router;
