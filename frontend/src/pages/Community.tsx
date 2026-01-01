import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ThumbsUp, Eye, Search, Plus, ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Post {
  id: number;
  category: string;
  title: string;
  author: string;
  author_id?: number;
  content?: string;
  views: number;
  likes: number;
  comment_count: number;
  created_at: string;
  comments?: Comment[];
}

interface Comment {
  id: number;
  content: string;
  author: string;
  author_id: number;
  created_at: string;
}

export default function Community() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [newPost, setNewPost] = useState({ category: '자유게시판', title: '', content: '' });
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const categories = ['전체', '자유게시판', '코인분석', '질문/답변', '공지사항'];

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== '전체') {
        params.append('category', selectedCategory);
      }
      
      const response = await fetch(`/api/v1/community/posts?${params}`);
      if (response.ok) {
        setPosts(await response.json());
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPost = async (id: number) => {
    try {
      const response = await fetch(`/api/v1/community/posts/${id}`);
      if (response.ok) {
        setSelectedPost(await response.json());
      }
    } catch (err) {
      console.error('Failed to fetch post:', err);
    }
  };

  const handleCreatePost = async () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newPost)
      });

      if (response.ok) {
        setIsWriting(false);
        setNewPost({ category: '자유게시판', title: '', content: '' });
        fetchPosts();
      }
    } catch (err) {
      console.error('Failed to create post:', err);
    }
  };

  const handleLike = async (postId: number) => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/community/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost({ ...selectedPost, likes: selectedPost.likes + 1 });
        }
        fetchPosts();
      }
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleAddComment = async () => {
    if (!isLoggedIn || !selectedPost || !newComment.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/community/posts/${selectedPost.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment })
      });

      if (response.ok) {
        setNewComment('');
        fetchPost(selectedPost.id);
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/community/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setSelectedPost(null);
        fetchPosts();
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/community/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        if (selectedPost) fetchPost(selectedPost.id);
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '공지사항': return 'bg-red-100 text-red-600';
      case '코인분석': return 'bg-blue-100 text-blue-600';
      case '자유게시판': return 'bg-green-100 text-green-600';
      case '질문/답변': return 'bg-yellow-100 text-yellow-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDate = (dateStr: string, includeTime: boolean = false) => {
    const date = new Date(dateStr);
    if (includeTime) {
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return date.toLocaleDateString('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\s/g, '');
  };

  // Post Detail View
  if (selectedPost) {
    return (
      <div className="min-h-screen bg-upbit-bg">
        <Header />
        
        <div className="max-w-[900px] mx-auto px-5 pt-[80px] pb-10">
          <div className="flex justify-between items-center mb-4">
            <button 
              onClick={() => setSelectedPost(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              목록으로
            </button>
            {isLoggedIn && user?.id === selectedPost.author_id && (
              <button
                onClick={() => handleDeletePost(selectedPost.id)}
                className="text-red-500 hover:text-red-700 text-sm font-medium"
              >
                삭제하기
              </button>
            )}
          </div>

          <div className="bg-white rounded-lg shadow">
            {/* Post Header */}
            <div className="p-6 border-b">
              <h1 className="text-2xl font-bold mb-4">{selectedPost.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className={`text-xs px-2 py-0.5 rounded ${getCategoryColor(selectedPost.category)}`}>
                  {selectedPost.category}
                </span>
                <span className="w-[1px] h-3 bg-gray-200" />
                <span>{selectedPost.author}</span>
                <span>{formatDate(selectedPost.created_at, true)}</span>
                <div className="ml-auto flex items-center gap-4">
                  <span><Eye className="inline w-4 h-4 mr-1" />{selectedPost.views}</span>
                  <span><ThumbsUp className="inline w-4 h-4 mr-1" />{selectedPost.likes}</span>
                </div>
              </div>
            </div>

            {/* Post Content */}
            <div className="p-6 min-h-[200px] whitespace-pre-wrap">
              {selectedPost.content}
            </div>

            {/* Like Button */}
            <div className="p-6 border-t flex justify-center">
              <button
                onClick={() => handleLike(selectedPost.id)}
                className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <ThumbsUp className="w-5 h-5" />
                추천 {selectedPost.likes}
              </button>
            </div>

            {/* Comments */}
            <div className="border-t">
              <div className="p-4 bg-gray-50 font-medium flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                댓글 {selectedPost.comments?.length || 0}
              </div>

              {selectedPost.comments?.map((comment) => (
                <div key={comment.id} className="p-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{comment.author}</span>
                      <span className="text-xs text-gray-400">{formatDate(comment.created_at, true)}</span>
                    </div>
                    {isLoggedIn && user?.id === comment.author_id && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
              ))}

              {/* Add Comment */}
              {isLoggedIn ? (
                <div className="p-4 border-t flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="댓글을 입력하세요..."
                    className="flex-1 h-10 px-4 border border-gray-300 rounded-lg focus:outline-none focus:border-upbit-header"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <button
                    onClick={handleAddComment}
                    className="px-4 bg-upbit-header text-white rounded-lg hover:bg-blue-700"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="p-4 border-t text-center text-gray-500">
                  <Link to="/login" className="text-upbit-header hover:underline">로그인</Link> 후 댓글을 작성할 수 있습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  // Write Post View
  if (isWriting) {
    return (
      <div className="min-h-screen bg-upbit-bg">
        <Header />
        
        <div className="max-w-[900px] mx-auto px-5 pt-[80px] pb-10">
          <button 
            onClick={() => setIsWriting(false)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            취소
          </button>

          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold mb-6">글쓰기</h1>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">카테고리</label>
                <select
                  value={newPost.category}
                  onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:border-upbit-header"
                >
                  {categories.filter(c => c !== '전체').map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">제목</label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="제목을 입력하세요"
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:border-upbit-header"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">내용</label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder="내용을 입력하세요"
                  rows={10}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-upbit-header resize-none"
                />
              </div>

              <button
                onClick={handleCreatePost}
                disabled={!newPost.title.trim()}
                className="w-full py-3 bg-upbit-header text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                작성하기
              </button>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  // Post List View
  return (
    <div className="min-h-screen bg-upbit-bg">
      <Header />
      
      <div className="max-w-[1400px] mx-auto px-5 pt-[80px] pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">커뮤니티</h1>
          <button 
            onClick={() => isLoggedIn ? setIsWriting(true) : navigate('/login')}
            className="flex items-center gap-2 px-4 py-2 bg-upbit-header text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            글쓰기
          </button>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-[200px] flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-gray-900 mb-3">카테고리</h3>
              <ul className="space-y-1">
                {categories.map((category) => (
                  <li key={category}>
                    <button
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-3 py-2 rounded transition-colors ${
                        selectedCategory === category
                          ? 'bg-upbit-header text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {category}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Search */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="게시글 검색..."
                  className="w-full h-10 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:border-upbit-header"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Post List */}
            <div className="bg-white rounded-lg shadow">
              {isLoading ? (
                <div className="p-8 text-center text-gray-400">로딩 중...</div>
              ) : posts.length === 0 ? (
                <div className="p-8 text-center text-gray-400">게시글이 없습니다</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-sm text-gray-500">
                      <th className="py-3 px-4 text-left font-medium w-24">카테고리</th>
                      <th className="py-3 px-4 text-left font-medium">제목</th>
                      <th className="py-3 px-4 text-center font-medium w-24">작성자</th>
                      <th className="py-3 px-4 text-center font-medium w-24">날짜</th>
                      <th className="py-3 px-4 text-center font-medium w-16">조회</th>
                      <th className="py-3 px-4 text-center font-medium w-16">추천</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr 
                        key={post.id} 
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => fetchPost(post.id)}
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(post.category)}`}>
                            {post.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-900 hover:text-upbit-header line-clamp-1">
                            {post.title}
                            {post.comment_count > 0 && (
                              <span className="text-upbit-header ml-2 text-sm">[{post.comment_count}]</span>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-600 whitespace-nowrap">{post.author}</td>
                        <td className="py-3 px-4 text-center text-sm text-gray-500 whitespace-nowrap">{formatDate(post.created_at)}</td>
                        <td className="py-3 px-4 text-center text-sm text-gray-500 whitespace-nowrap">
                          <Eye className="inline w-3 h-3 mr-1" />
                          {post.views}
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-500 whitespace-nowrap">
                          <ThumbsUp className="inline w-3 h-3 mr-1" />
                          {post.likes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
