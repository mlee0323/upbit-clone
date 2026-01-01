import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import store from '../db.js';

const router = Router();

// JWT settings
const SECRET_KEY = process.env.JWT_SECRET_KEY || 'your-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRE_HOURS = 24;

// Types
interface JWTPayload {
  sub: string;
  exp: number;
}

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    isActive: boolean;
  };
}

// Helper functions
const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

const verifyPassword = async (plain: string, hashed: string): Promise<boolean> => {
  return bcrypt.compare(plain, hashed);
};

const createAccessToken = (email: string): string => {
  const payload = {
    sub: email,
    exp: Math.floor(Date.now() / 1000) + (ACCESS_TOKEN_EXPIRE_HOURS * 60 * 60)
  };
  return jwt.sign(payload, SECRET_KEY);
};

const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, SECRET_KEY) as JWTPayload;
  } catch {
    return null;
  }
};

// Middleware
const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ detail: '인증 토큰이 필요합니다' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = decodeToken(token);

  if (!payload) {
    res.status(401).json({ detail: '유효하지 않은 토큰입니다' });
    return;
  }

  const user = await store.findUserByEmail(payload.sub);

  if (!user) {
    res.status(401).json({ detail: '사용자를 찾을 수 없습니다' });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    isActive: user.isActive
  };

  next();
};

// Routes
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Check if email already exists
    const existingUser = await store.findUserByEmail(email);

    if (existingUser) {
      res.status(400).json({ detail: '이미 가입된 이메일입니다' });
      return;
    }

    // Create new user
    const hashedPassword = await hashPassword(password);
    const newUser = await store.createUser({
      email,
      hashedPassword,
      name
    });

    console.log(`[AUTH] New user signup: ${email} (${name})`);
    res.json({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      is_active: newUser.isActive
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ detail: '회원가입 중 오류가 발생했습니다' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await store.findUserByEmail(email);

    if (!user) {
      res.status(401).json({ detail: '이메일 또는 비밀번호가 올바르지 않습니다' });
      return;
    }

    // Verify password
    const isValid = await verifyPassword(password, user.hashedPassword);
    if (!isValid) {
      res.status(401).json({ detail: '이메일 또는 비밀번호가 올바르지 않습니다' });
      return;
    }

    // Create access token
    const accessToken = createAccessToken(user.email);

    console.log(`[AUTH] User login successful: ${email}`);
    res.json({
      access_token: accessToken,
      token_type: 'bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_active: user.isActive
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ detail: '로그인 중 오류가 발생했습니다' });
  }
});

router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    name: req.user!.name,
    is_active: req.user!.isActive
  });
});

router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, password } = req.body;
    const updates: any = {};
    
    if (name) updates.name = name;
    if (password) {
      updates.hashedPassword = await hashPassword(password);
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ detail: '수정할 내용이 없습니다' });
    }
    
    const updatedUser = await store.updateUser(req.user!.id, updates);
    
    res.json({
      id: updatedUser!.id,
      email: updatedUser!.email,
      name: updatedUser!.name,
      is_active: updatedUser!.isActive
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ detail: '회원 정보 수정에 실패했습니다' });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: '로그아웃 되었습니다' });
});

export { authenticate };
export default router;
