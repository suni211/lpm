import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './NewsPage.css';

interface News {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  view_count: number;
  is_pinned: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  author_name: string;
  comment_count: number;
}

const NewsPage = () => {
  const navigate = useNavigate();
  const [newsList, setNewsList] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchNews();
  }, [page]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await api.get('/news', {
        params: { page, limit: 20, status: 'PUBLISHED' }
      });
      setNewsList(response.data.data.news);
      setTotalPages(response.data.data.pagination.totalPages);
    } catch (error) {
      console.error('뉴스 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewsClick = (newsId: string) => {
    navigate(`/news/${newsId}`);
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
      <div className="news-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="news-page">
      <div className="news-header">
        <h1>뉴스</h1>
        <p>CRYP-UP의 최신 소식을 확인하세요</p>
      </div>

      <div className="news-list">
        {newsList.length === 0 ? (
          <div className="empty-state">등록된 뉴스가 없습니다</div>
        ) : (
          newsList.map((news) => (
            <div
              key={news.id}
              className={`news-item ${news.is_pinned ? 'pinned' : ''}`}
              onClick={() => handleNewsClick(news.id)}
            >
              {news.is_pinned && <span className="pinned-badge">고정</span>}
              {news.image_url && (
                <div className="news-image">
                  <img src={news.image_url} alt={news.title} />
                </div>
              )}
              <div className="news-content">
                <h2 className="news-title">{news.title}</h2>
                <p className="news-preview">
                  {news.content.length > 150
                    ? news.content.substring(0, 150) + '...'
                    : news.content}
                </p>
                <div className="news-meta">
                  <span className="news-author">작성자: {news.author_name}</span>
                  <span className="news-date">{formatDate(news.created_at)}</span>
                  <span className="news-views">조회수: {news.view_count}</span>
                  <span className="news-comments">댓글: {news.comment_count}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="pagination-button"
          >
            이전
          </button>
          <span className="page-info">
            {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="pagination-button"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
};

export default NewsPage;
