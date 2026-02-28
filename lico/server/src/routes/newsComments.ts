import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/db';

const router = Router();

// ==================== 댓글 조회 (공개) ====================

// 특정 뉴스의 댓글 목록 조회
router.get('/:newsId', async (req: Request, res: Response) => {
  try {
    const { newsId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // 댓글 목록 (대댓글 포함)
    const comments = await query(
      `SELECT
        nc.id,
        nc.news_id,
        nc.content,
        nc.parent_comment_id,
        nc.is_deleted,
        nc.created_at,
        nc.updated_at,
        uw.minecraft_username as author_username,
        uw.wallet_address as author_wallet
      FROM news_comments nc
      LEFT JOIN user_wallets uw ON nc.wallet_id = uw.id
      WHERE nc.news_id = ?
      ORDER BY nc.created_at ASC
      LIMIT ? OFFSET ?`,
      [newsId, Number(limit), offset]
    );

    // 댓글 개수
    const [countResult] = await query(
      'SELECT COUNT(*) as total FROM news_comments WHERE news_id = ? AND is_deleted = FALSE',
      [newsId]
    ) as any[];

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          total: countResult.total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(countResult.total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('댓글 조회 오류:', error);
    res.status(500).json({ success: false, message: '댓글 조회 실패' });
  }
});

// ==================== 댓글 작성/수정/삭제 (인증 필요) ====================

// 댓글 작성
router.post('/:newsId', async (req: Request, res: Response) => {
  try {
    const walletId = (req as any).walletId; // auth 미들웨어에서 설정
    if (!walletId) {
      return res.status(401).json({ success: false, message: '로그인이 필요합니다' });
    }

    const { newsId } = req.params;
    const { content, parent_comment_id = null } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: '댓글 내용을 입력해주세요' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ success: false, message: '댓글은 1000자 이하로 작성해주세요' });
    }

    // 뉴스 존재 확인
    const [news] = await query('SELECT id FROM news WHERE id = ?', [newsId]) as any[];
    if (!news) {
      return res.status(404).json({ success: false, message: '뉴스를 찾을 수 없습니다' });
    }

    // 대댓글인 경우 부모 댓글 확인
    if (parent_comment_id) {
      const [parentComment] = await query(
        'SELECT id FROM news_comments WHERE id = ? AND news_id = ?',
        [parent_comment_id, newsId]
      ) as any[];
      if (!parentComment) {
        return res.status(404).json({ success: false, message: '부모 댓글을 찾을 수 없습니다' });
      }
    }

    const commentId = uuidv4();

    await query(
      `INSERT INTO news_comments (id, news_id, wallet_id, content, parent_comment_id)
       VALUES (?, ?, ?, ?, ?)`,
      [commentId, newsId, walletId, content, parent_comment_id]
    );

    res.status(201).json({
      success: true,
      message: '댓글이 작성되었습니다',
      data: { id: commentId }
    });
  } catch (error) {
    console.error('댓글 작성 오류:', error);
    res.status(500).json({ success: false, message: '댓글 작성 실패' });
  }
});

// 댓글 수정
router.put('/:newsId/:commentId', async (req: Request, res: Response) => {
  try {
    const walletId = (req as any).walletId;
    if (!walletId) {
      return res.status(401).json({ success: false, message: '로그인이 필요합니다' });
    }

    const { newsId, commentId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: '댓글 내용을 입력해주세요' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ success: false, message: '댓글은 1000자 이하로 작성해주세요' });
    }

    // 댓글 소유권 확인
    const [comment] = await query(
      'SELECT wallet_id FROM news_comments WHERE id = ? AND news_id = ?',
      [commentId, newsId]
    ) as any[];

    if (!comment) {
      return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다' });
    }

    if (comment.wallet_id !== walletId) {
      return res.status(403).json({ success: false, message: '댓글 수정 권한이 없습니다' });
    }

    await query(
      'UPDATE news_comments SET content = ? WHERE id = ?',
      [content, commentId]
    );

    res.json({ success: true, message: '댓글이 수정되었습니다' });
  } catch (error) {
    console.error('댓글 수정 오류:', error);
    res.status(500).json({ success: false, message: '댓글 수정 실패' });
  }
});

// 댓글 삭제
router.delete('/:newsId/:commentId', async (req: Request, res: Response) => {
  try {
    const walletId = (req as any).walletId;
    const adminId = (req as any).adminId; // 관리자인 경우

    if (!walletId && !adminId) {
      return res.status(401).json({ success: false, message: '로그인이 필요합니다' });
    }

    const { newsId, commentId } = req.params;

    // 댓글 확인
    const [comment] = await query(
      'SELECT wallet_id FROM news_comments WHERE id = ? AND news_id = ?',
      [commentId, newsId]
    ) as any[];

    if (!comment) {
      return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다' });
    }

    // 권한 확인 (본인 또는 관리자)
    if (!adminId && comment.wallet_id !== walletId) {
      return res.status(403).json({ success: false, message: '댓글 삭제 권한이 없습니다' });
    }

    // 소프트 삭제 (is_deleted = TRUE)
    await query(
      'UPDATE news_comments SET is_deleted = TRUE, content = ? WHERE id = ?',
      ['삭제된 댓글입니다', commentId]
    );

    res.json({ success: true, message: '댓글이 삭제되었습니다' });
  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    res.status(500).json({ success: false, message: '댓글 삭제 실패' });
  }
});

export default router;
