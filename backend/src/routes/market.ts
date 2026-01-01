// Market data API - reads from Redis
import { Router, Request, Response } from 'express';
import { getAllTickers, getTickers, getTicker, getMarkets, getOrderbook } from '../redis.js';

const router = Router();

// GET /api/v1/markets - 마켓 목록
router.get('/markets', async (_req: Request, res: Response) => {
  try {
    const markets = await getMarkets();
    res.json(markets);
  } catch (error) {
    console.error('Markets fetch error:', error);
    res.status(500).json({ detail: '마켓 목록 조회에 실패했습니다' });
  }
});

// GET /api/v1/ticker - 시세 조회
// Query: ?markets=KRW-BTC,KRW-ETH (optional, defaults to all)
router.get('/ticker', async (req: Request, res: Response) => {
  try {
    const { markets } = req.query;

    if (markets && typeof markets === 'string') {
      const marketList = markets.split(',').map((m) => m.trim());
      const tickers = await getTickers(marketList);
      res.json(tickers);
    } else {
      const allTickers = await getAllTickers();
      // Convert object to array
      res.json(Object.values(allTickers));
    }
  } catch (error) {
    console.error('Ticker fetch error:', error);
    res.status(500).json({ detail: '시세 조회에 실패했습니다' });
  }
});

// GET /api/v1/ticker/:market - 단일 시세
router.get('/ticker/:market', async (req: Request, res: Response) => {
  try {
    const { market } = req.params;
    const ticker = await getTicker(market);

    if (!ticker) {
      return res.status(404).json({ detail: '시세 정보를 찾을 수 없습니다' });
    }

    res.json(ticker);
  } catch (error) {
    console.error('Ticker fetch error:', error);
    res.status(500).json({ detail: '시세 조회에 실패했습니다' });
  }
});

// GET /api/v1/orderbook/:market - 호가창
router.get('/orderbook/:market', async (req: Request, res: Response) => {
  try {
    const { market } = req.params;
    const orderbook = await getOrderbook(market);

    if (!orderbook) {
      return res.status(404).json({ detail: '호가 정보를 찾을 수 없습니다' });
    }

    res.json(orderbook);
  } catch (error) {
    console.error('Orderbook fetch error:', error);
    res.status(500).json({ detail: '호가 조회에 실패했습니다' });
  }
});

export default router;
