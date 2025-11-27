import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './NewsDetailPage.css';

interface News {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  author_name: string;
}

interface Comment {
  id: string;
  content: string;
  author_username: string;
  created_at: string;
  parent_comment_id: string | null;
  is_deleted: boolean;
}

const NewsDetailPage = () => {
  const { newsId } = useParams<{ newsId: string }>();
  const navigate = useNavigate();
  const [news, setNews] = useState<News | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (newsId) {
      fetchNewsDetail();
      fetchComments();
    }
  }, [newsId]);

  const fetchNewsDetail = async () => {
    try {
      const response = await api.get(`/news/${newsId}`);
      setNews(response.data.data);
    } catch (error) {
      console.error('뉴스 상세 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await api.get(`/news-comments/${newsId}`);
      setComments(response.data.data.comments);
    } catch (error) {
      console.error('댓글 조회 실패:', error);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    try {
      setSubmitting(true);
      await api.post(`/news-comments/${newsId}`, {
        content: commentContent,
      });
      setCommentContent('');
      fetchComments();
      alert('댓글이 작성되었습니다');
    } catch (error: any) {
      console.error('댓글 작성 실패:', error);
      alert(error.response?.data?.message || '댓글 작성에 실패했습니다');
    } finally {
      setSubmitting(false);
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
      <div className="news-detail-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="news-detail-page">
        <div className="empty-state">뉴스를 찾을 수 없습니다</div>
        <button onClick={() => navigate('/news')} className="back-button">
          목록으로
        </button>
      </div>
    );
  }

  return (
    <div className="news-detail-page">
      <div className="news-detail-container">
        <button onClick={() => navigate('/news')} className="back-button">
          ← 목록으로
        </button>

        <article className="news-article">
          <h1 className="news-title">{news.title}</h1>
          <div className="news-meta">
            <span>작성자: {news.author_name}</span>
            <span>작성일: {formatDate(news.created_at)}</span>
            <span>조회수: {news.view_count}</span>
          </div>

          {news.image_url && (
            <div className="news-image">
              <img src={news.image_url} alt={news.title} />
            </div>
          )}

          <div className="news-content">
            {news.content.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </article>

        <div className="comments-section">
          <h2>댓글 ({comments.length})</h2>

          <form onSubmit={handleCommentSubmit} className="comment-form">
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="댓글을 입력하세요"
              maxLength={1000}
              disabled={submitting}
            />
            <button type="submit" disabled={submitting || !commentContent.trim()}>
              {submitting ? '작성 중...' : '댓글 작성'}
            </button>
          </form>

          <div className="comments-list">
            {comments.length === 0 ? (
              <div className="empty-comments">첫 댓글을 작성해보세요</div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-header">
                    <span className="comment-author">{comment.author_username}</span>
                    <span className="comment-date">{formatDate(comment.created_at)}</span>
                  </div>
                  <div className="comment-content">
                    {comment.is_deleted ? (
                      <span className="deleted-comment">삭제된 댓글입니다</span>
                    ) : (
                      comment.content
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsDetailPage;
