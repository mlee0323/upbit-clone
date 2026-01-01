import { Router, Request, Response } from 'express';
import store from '../db.js';

const router = Router();

// Deposit KRW (가상 원화 입금)
router.post('/deposit', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ detail: '인증이 필요합니다' });
    }

    const { amount } = req.body;
    const depositAmount = parseFloat(amount);

    if (!depositAmount || depositAmount <= 0) {
      return res.status(400).json({ detail: '유효한 금액을 입력해주세요' });
    }

    if (depositAmount < 1000) {
      return res.status(400).json({ detail: '최소 입금 금액은 1,000원입니다' });
    }

    // Get or create KRW balance
    const balance = await store.getOrCreateBalance(userId, 'KRW');
    
    // Update balance
    await store.updateBalance(userId, 'KRW', {
      balance: balance.balance + depositAmount
    });

    // Create transaction record
    const tx = await store.createKrwTransaction({
      userId,
      type: 'deposit',
      amount: depositAmount
    });

    res.json({
      success: true,
      transaction_id: tx.id,
      type: 'deposit',
      amount: depositAmount.toString(),
      balance: (balance.balance + depositAmount).toString(),
      created_at: tx.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ detail: '입금 처리에 실패했습니다' });
  }
});

// Withdraw KRW (가상 원화 출금)
router.post('/withdraw', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ detail: '인증이 필요합니다' });
    }

    const { amount } = req.body;
    const withdrawAmount = parseFloat(amount);

    if (!withdrawAmount || withdrawAmount <= 0) {
      return res.status(400).json({ detail: '유효한 금액을 입력해주세요' });
    }

    if (withdrawAmount < 5000) {
      return res.status(400).json({ detail: '최소 출금 금액은 5,000원입니다' });
    }

    // Get KRW balance
    const balance = await store.findBalance(userId, 'KRW');

    if (!balance || balance.balance - balance.locked < withdrawAmount) {
      return res.status(400).json({ detail: '출금 가능 금액이 부족합니다' });
    }

    // Update balance
    await store.updateBalance(userId, 'KRW', {
      balance: balance.balance - withdrawAmount
    });

    // Create transaction record
    const tx = await store.createKrwTransaction({
      userId,
      type: 'withdraw',
      amount: withdrawAmount
    });

    res.json({
      success: true,
      transaction_id: tx.id,
      type: 'withdraw',
      amount: withdrawAmount.toString(),
      balance: (balance.balance - withdrawAmount).toString(),
      created_at: tx.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ detail: '출금 처리에 실패했습니다' });
  }
});

// Get KRW transaction history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ detail: '인증이 필요합니다' });
    }

    const transactions = await store.findKrwTransactionsByUserId(userId);

    res.json(transactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount.toString(),
      created_at: tx.createdAt.toISOString()
    })));
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ detail: '거래 내역 조회에 실패했습니다' });
  }
});

export default router;
