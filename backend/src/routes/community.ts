import { Router, Request, Response } from 'express';
import store from '../db.js';
import { authenticate } from './auth.js';

const router = Router();

// Get posts (public)
router.get('/posts', async (req: Request, res: Response) => {
  try {
    const { category, limit = '20', offset = '0' } = req.query;
    
    const posts = await store.findPosts(
      category as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    const postsWithMeta = await Promise.all(posts.map(async (p) => {
      const user = await store.findUserById(p.userId);
      const commentCount = await store.getCommentCount(p.id);
      return {
        id: p.id,
        category: p.category,
        title: p.title,
        author: user?.name || '익명',
        views: p.views,
        likes: p.likes,
        comment_count: commentCount,
        created_at: p.createdAt.toISOString()
      };
    }));

    res.json(postsWithMeta);
  } catch (error) {
    console.error('Posts fetch error:', error);
    res.status(500).json({ detail: '게시글 조회에 실패했습니다' });
  }
});

// Get single post (public)
router.get('/posts/:id', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    const post = await store.findPostById(postId);

    if (!post) {
      return res.status(404).json({ detail: '게시글을 찾을 수 없습니다' });
    }

    // Increment views
    await store.updatePost(postId, { views: post.views + 1 });

    const user = await store.findUserById(post.userId);
    const comments = await store.findCommentsByPostId(postId);

    const commentsWithAuthor = await Promise.all(comments.map(async (c) => {
      const commentUser = await store.findUserById(c.userId);
      return {
        id: c.id,
        content: c.content,
        author: commentUser?.name || '익명',
        author_id: c.userId,
        created_at: c.createdAt.toISOString()
      };
    }));

    res.json({
      id: post.id,
      category: post.category,
      title: post.title,
      content: post.content,
      author: user?.name || '익명',
      author_id: post.userId,
      views: post.views + 1,
      likes: post.likes,
      created_at: post.createdAt.toISOString(),
      comments: commentsWithAuthor
    });
  } catch (error) {
    console.error('Post fetch error:', error);
    res.status(500).json({ detail: '게시글 조회에 실패했습니다' });
  }
});

// My posts (auth required)
router.get('/my/posts', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const posts = await store.findPostsByUserId(userId);
    
    const postsWithMeta = await Promise.all(posts.map(async (p) => {
      const commentCount = await store.getCommentCount(p.id);
      return {
        id: p.id,
        category: p.category,
        title: p.title,
        views: p.views,
        likes: p.likes,
        comment_count: commentCount,
        created_at: p.createdAt.toISOString()
      };
    }));

    res.json(postsWithMeta);
  } catch (error) {
    console.error('My posts fetch error:', error);
    res.status(500).json({ detail: '내 게시글 조회에 실패했습니다' });
  }
});

// My comments (auth required)
router.get('/my/comments', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const comments = await store.findCommentsByUserId(userId);
    
    const commentsWithPost = await Promise.all(comments.map(async (c) => {
      const post = await store.findPostById(c.postId);
      return {
        id: c.id,
        content: c.content,
        post_id: c.postId,
        post_title: post?.title || '삭제된 게시글',
        created_at: c.createdAt.toISOString()
      };
    }));

    res.json(commentsWithPost);
  } catch (error) {
    console.error('My comments fetch error:', error);
    res.status(500).json({ detail: '내 댓글 조회에 실패했습니다' });
  }
});

// Create post (auth required)
router.post('/posts', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { category, title, content } = req.body;

    if (!category || !title) {
      return res.status(400).json({ detail: '카테고리와 제목은 필수입니다' });
    }

    const post = await store.createPost({
      userId,
      category,
      title,
      content: content || ''
    });

    res.status(201).json({
      id: post.id,
      category: post.category,
      title: post.title,
      created_at: post.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Post creation error:', error);
    res.status(500).json({ detail: '게시글 작성에 실패했습니다' });
  }
});

// Update post (auth required, owner only)
router.put('/posts/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const postId = parseInt(req.params.id);
    const post = await store.findPostById(postId);

    if (!post) {
      return res.status(404).json({ detail: '게시글을 찾을 수 없습니다' });
    }

    if (post.userId !== userId) {
      return res.status(403).json({ detail: '수정 권한이 없습니다' });
    }

    const { title, content } = req.body;
    await store.updatePost(postId, { title, content });

    res.json({ success: true, id: postId });
  } catch (error) {
    console.error('Post update error:', error);
    res.status(500).json({ detail: '게시글 수정에 실패했습니다' });
  }
});

// Delete post (auth required, owner only)
router.delete('/posts/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const postId = parseInt(req.params.id);
    const post = await store.findPostById(postId);

    if (!post) {
      return res.status(404).json({ detail: '게시글을 찾을 수 없습니다' });
    }

    if (post.userId !== userId) {
      return res.status(403).json({ detail: '삭제 권한이 없습니다' });
    }

    await store.deletePost(postId);
    res.json({ success: true, id: postId });
  } catch (error) {
    console.error('Post delete error:', error);
    res.status(500).json({ detail: '게시글 삭제에 실패했습니다' });
  }
});

// Like post (auth required)
router.post('/posts/:id/like', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const postId = parseInt(req.params.id);
    const post = await store.findPostById(postId);

    if (!post) {
      return res.status(404).json({ detail: '게시글을 찾을 수 없습니다' });
    }

    await store.updatePost(postId, { likes: post.likes + 1 });
    res.json({ success: true, likes: post.likes + 1 });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ detail: '좋아요에 실패했습니다' });
  }
});

// Add comment (auth required)
router.post('/posts/:id/comments', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const postId = parseInt(req.params.id);
    const post = await store.findPostById(postId);

    if (!post) {
      return res.status(404).json({ detail: '게시글을 찾을 수 없습니다' });
    }

    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ detail: '댓글 내용을 입력해주세요' });
    }

    const comment = await store.createComment({
      postId,
      userId,
      content
    });

    const user = await store.findUserById(userId);

    res.status(201).json({
      id: comment.id,
      content: comment.content,
      author: user?.name || '익명',
      created_at: comment.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Comment creation error:', error);
    res.status(500).json({ detail: '댓글 작성에 실패했습니다' });
  }
});

// Delete comment (auth required, owner only)
router.delete('/comments/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const commentId = parseInt(req.params.id);
    const deleted = await store.deleteComment(commentId);

    if (!deleted) {
      return res.status(404).json({ detail: '댓글을 찾을 수 없습니다' });
    }

    res.json({ success: true, id: commentId });
  } catch (error) {
    console.error('Comment delete error:', error);
    res.status(500).json({ detail: '댓글 삭제에 실패했습니다' });
  }
});

export default router;
