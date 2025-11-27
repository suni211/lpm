import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/db';

const router = Router();

// ==================== 공개 API (인증 불필요) ====================

// 뉴스 목록 조회 (공개)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status = 'PUBLISHED' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // 총 뉴스 개수
    const [countResult] = await query(
      'SELECT COUNT(*) as total FROM news WHERE status = ?',
      [status]
    ) as any[];

    // 뉴스 목록 (고정된 뉴스 우선)
    const newsList = await query(
      `SELECT
        n.id,
        n.title,
        n.content,
        n.image_url,
        n.view_count,
        n.is_pinned,
        n.status,
        n.created_at,
        n.updated_at,
        a.username as author_name,
        (SELECT COUNT(*) FROM news_comments WHERE news_id = n.id AND is_deleted = FALSE) as comment_count
      FROM news n
      LEFT JOIN admins a ON n.admin_id = a.id
      WHERE n.status = ?
      ORDER BY n.is_pinned DESC, n.created_at DESC
      LIMIT ? OFFSET ?`,
      [status, Number(limit), offset]
    );

    res.json({
      success: true,
      data: {
        news: newsList,
        pagination: {
          total: countResult.total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(countResult.total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('뉴스 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '뉴스 목록 조회 실패' });
  }
});

// 뉴스 상세 조회 (공개)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 조회수 증가
    await query('UPDATE news SET view_count = view_count + 1 WHERE id = ?', [id]);

    // 뉴스 상세 정보
    const [newsDetail] = await query(
      `SELECT
        n.id,
        n.title,
        n.content,
        n.image_url,
        n.view_count,
        n.is_pinned,
        n.status,
        n.created_at,
        n.updated_at,
        a.username as author_name
      FROM news n
      LEFT JOIN admins a ON n.admin_id = a.id
      WHERE n.id = ?`,
      [id]
    ) as any[];

    if (!newsDetail) {
      return res.status(404).json({ success: false, message: '뉴스를 찾을 수 없습니다' });
    }

    res.json({ success: true, data: newsDetail });
  } catch (error) {
    console.error('뉴스 상세 조회 오류:', error);
    res.status(500).json({ success: false, message: '뉴스 조회 실패' });
  }
});

// ==================== 관리자 API (인증 필요) ====================

// 뉴스 작성 (관리자 전용)
router.post('/', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).adminId; // auth 미들웨어에서 설정
    if (!adminId) {
      return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다' });
    }

    const { title, content, image_url, is_pinned = false, status = 'PUBLISHED' } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: '제목과 내용은 필수입니다' });
    }

    const newsId = uuidv4();

    await query(
      `INSERT INTO news (id, admin_id, title, content, image_url, is_pinned, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newsId, adminId, title, content, image_url || null, is_pinned, status]
    );

    res.status(201).json({
      success: true,
      message: '뉴스가 작성되었습니다',
      data: { id: newsId }
    });
  } catch (error) {
    console.error('뉴스 작성 오류:', error);
    res.status(500).json({ success: false, message: '뉴스 작성 실패' });
  }
});

// 뉴스 수정 (관리자 전용)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).adminId;
    if (!adminId) {
      return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다' });
    }

    const { id } = req.params;
    const { title, content, image_url, is_pinned, status } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }
    if (image_url !== undefined) {
      updates.push('image_url = ?');
      values.push(image_url);
    }
    if (is_pinned !== undefined) {
      updates.push('is_pinned = ?');
      values.push(is_pinned);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '수정할 내용이 없습니다' });
    }

    values.push(id);

    await query(
      `UPDATE news SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ success: true, message: '뉴스가 수정되었습니다' });
  } catch (error) {
    console.error('뉴스 수정 오류:', error);
    res.status(500).json({ success: false, message: '뉴스 수정 실패' });
  }
});

// 뉴스 삭제 (관리자 전용)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).adminId;
    if (!adminId) {
      return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다' });
    }

    const { id } = req.params;

    await query('DELETE FROM news WHERE id = ?', [id]);

    res.json({ success: true, message: '뉴스가 삭제되었습니다' });
  } catch (error) {
    console.error('뉴스 삭제 오류:', error);
    res.status(500).json({ success: false, message: '뉴스 삭제 실패' });
  }
});

export default router;
