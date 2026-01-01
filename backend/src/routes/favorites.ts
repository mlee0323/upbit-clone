import { Router, Request, Response } from 'express';
import store from '../db.js';

const router = Router();

// Get user's favorites
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ detail: '인증이 필요합니다' });
    }

    const favorites = await store.findFavoritesByUserId(userId);

    res.json(favorites.map(f => ({
      market: f.market,
      created_at: f.createdAt.toISOString()
    })));
  } catch (error) {
    console.error('Favorites fetch error:', error);
    res.status(500).json({ detail: '관심 종목 조회에 실패했습니다' });
  }
});

// Add favorite
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ detail: '인증이 필요합니다' });
    }

    const { market } = req.body;

    if (!market) {
      return res.status(400).json({ detail: '마켓 코드를 입력해주세요' });
    }

    const favorite = await store.createFavorite(userId, market);

    if (!favorite) {
      return res.status(409).json({ detail: '이미 관심 종목에 추가되었습니다' });
    }

    res.status(201).json({
      success: true,
      market: favorite.market,
      created_at: favorite.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ detail: '관심 종목 추가에 실패했습니다' });
  }
});

// Remove favorite
router.delete('/:market', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ detail: '인증이 필요합니다' });
    }

    const { market } = req.params;

    const deleted = await store.deleteFavorite(userId, market);

    if (!deleted) {
      return res.status(404).json({ detail: '관심 종목을 찾을 수 없습니다' });
    }

    res.json({ success: true, market });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ detail: '관심 종목 삭제에 실패했습니다' });
  }
});

// Check if market is favorite
router.get('/check/:market', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ detail: '인증이 필요합니다' });
    }

    const { market } = req.params;
    const isFavorite = await store.isFavorite(userId, market);

    res.json({ market, is_favorite: isFavorite });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ detail: '관심 종목 확인에 실패했습니다' });
  }
});

export default router;
