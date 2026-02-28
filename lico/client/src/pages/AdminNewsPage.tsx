import { useState, useEffect } from 'react';
import api from '../services/api';
import './AdminNewsPage.css';

interface News {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  view_count: number;
  is_pinned: boolean;
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
  created_at: string;
  updated_at: string;
  author_name: string;
  comment_count: number;
}

const AdminNewsPage = () => {
  const [newsList, setNewsList] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);

  // 폼 상태
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [status, setStatus] = useState<'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('PUBLISHED');

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      // 모든 상태의 뉴스 조회 (ADMIN용)
      const response = await api.get('/news', {
        params: { page: 1, limit: 100 }
      });
      setNewsList(response.data.data.news);
    } catch (error) {
      console.error('뉴스 목록 조회 실패:', error);
      alert('뉴스 목록을 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setImageUrl('');
    setIsPinned(false);
    setStatus('PUBLISHED');
    setEditingNews(null);
    setShowForm(false);
  };

  const handleEdit = (news: News) => {
    setEditingNews(news);
    setTitle(news.title);
    setContent(news.content);
    setImageUrl(news.image_url || '');
    setIsPinned(news.is_pinned);
    setStatus(news.status);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 입력해주세요');
      return;
    }

    try {
      const newsData = {
        title: title.trim(),
        content: content.trim(),
        image_url: imageUrl.trim() || null,
        is_pinned: isPinned,
        status,
      };

      if (editingNews) {
        // 수정
        await api.put(`/news/${editingNews.id}`, newsData);
        alert('뉴스가 수정되었습니다');
      } else {
        // 작성
        await api.post('/news', newsData);
        alert('뉴스가 작성되었습니다');
      }

      resetForm();
      fetchNews();
    } catch (error: any) {
      console.error('뉴스 작성/수정 실패:', error);
      alert(error.response?.data?.message || '작업 실패');
    }
  };

  const handleDelete = async (newsId: string, newsTitle: string) => {
    if (!confirm(`"${newsTitle}" 뉴스를 삭제하시겠습니까?`)) return;

    try {
      await api.delete(`/news/${newsId}`);
      alert('뉴스가 삭제되었습니다');
      fetchNews();
    } catch (error: any) {
      console.error('뉴스 삭제 실패:', error);
      alert(error.response?.data?.message || '삭제 실패');
    }
  };

  const handleTogglePin = async (news: News) => {
    try {
      await api.put(`/news/${news.id}`, {
        is_pinned: !news.is_pinned,
      });
      fetchNews();
    } catch (error: any) {
      console.error('고정 토글 실패:', error);
      alert(error.response?.data?.message || '고정 설정 실패');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="admin-news-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="admin-news-page">
      <div className="admin-news-header">
        <div>
          <h1>뉴스 관리</h1>
          <p>ADMIN 전용 뉴스 작성 및 관리</p>
        </div>
        <button
          className="btn-create"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
        >
          {showForm ? '취소' : '새 뉴스 작성'}
        </button>
      </div>

      {showForm && (
        <div className="news-form-container">
          <h2>{editingNews ? '뉴스 수정' : '새 뉴스 작성'}</h2>
          <form onSubmit={handleSubmit} className="news-form">
            <div className="form-group">
              <label>제목 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="뉴스 제목을 입력하세요"
                required
              />
            </div>

            <div className="form-group">
              <label>내용 *</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="뉴스 내용을 입력하세요"
                rows={10}
                required
              />
            </div>

            <div className="form-group">
              <label>이미지 URL (선택)</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>상태</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                  <option value="PUBLISHED">공개</option>
                  <option value="DRAFT">임시저장</option>
                  <option value="ARCHIVED">보관</option>
                </select>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                  />
                  상단 고정
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit">
                {editingNews ? '수정하기' : '작성하기'}
              </button>
              <button type="button" className="btn-cancel" onClick={resetForm}>
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="news-list">
        <h2>뉴스 목록 ({newsList.length}개)</h2>
        {newsList.length === 0 ? (
          <div className="empty-state">등록된 뉴스가 없습니다</div>
        ) : (
          <table className="news-table">
            <thead>
              <tr>
                <th>상태</th>
                <th>제목</th>
                <th>작성자</th>
                <th>작성일</th>
                <th>조회수</th>
                <th>댓글</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {newsList.map((news) => (
                <tr key={news.id} className={news.is_pinned ? 'pinned-row' : ''}>
                  <td>
                    <span className={`status-badge status-${news.status.toLowerCase()}`}>
                      {news.status === 'PUBLISHED' ? '공개' : news.status === 'DRAFT' ? '임시저장' : '보관'}
                    </span>
                    {news.is_pinned && <span className="pin-badge">📌</span>}
                  </td>
                  <td className="news-title-cell">
                    <div className="news-title-text">{news.title}</div>
                    {news.image_url && <span className="has-image">🖼️</span>}
                  </td>
                  <td>{news.author_name}</td>
                  <td>{formatDate(news.created_at)}</td>
                  <td>{news.view_count}</td>
                  <td>{news.comment_count}</td>
                  <td className="action-buttons">
                    <button
                      className="btn-pin"
                      onClick={() => handleTogglePin(news)}
                      title={news.is_pinned ? '고정 해제' : '상단 고정'}
                    >
                      {news.is_pinned ? '📌' : '📍'}
                    </button>
                    <button className="btn-edit" onClick={() => handleEdit(news)}>
                      수정
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(news.id, news.title)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminNewsPage;
