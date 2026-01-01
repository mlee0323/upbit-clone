import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { User, Settings, FileText, MessageSquare, ChevronRight } from 'lucide-react';

interface MyPost {
  id: number;
  category: string;
  title: string;
  views: number;
  likes: number;
  comment_count: number;
  created_at: string;
}

interface MyComment {
  id: number;
  content: string;
  post_id: number;
  post_title: string;
  created_at: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'posts' | 'comments'>('profile');
  const [formData, setFormData] = useState({ name: '', password: '', confirmPassword: '' });
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [myComments, setMyComments] = useState<MyComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    setFormData({ ...formData, name: user?.name || '' });
    fetchMyActivity();
  }, [isLoggedIn, user]);

  const fetchMyActivity = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [postsRes, commentsRes] = await Promise.all([
        fetch('/api/v1/community/my/posts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/community/my/comments', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (postsRes.ok) setMyPosts(await postsRes.json());
      if (commentsRes.ok) setMyComments(await commentsRes.json());
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (formData.password && formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: '비밀번호가 일치하지 않습니다.' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          password: formData.password || undefined
        })
      });

      if (response.ok) {
        await response.json();
        // Update local auth state if needed (depends on how AuthContext is implemented)
        setMessage({ type: 'success', text: '회원 정보가 수정되었습니다.' });
        setFormData({ ...formData, password: '', confirmPassword: '' });
      } else {
        const err = await response.json();
        setMessage({ type: 'error', text: err.detail || '수정에 실패했습니다.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '오류가 발생했습니다.' });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  return (
    <div className="min-h-screen bg-upbit-bg">
      <Header />
      
      <div className="max-w-[1000px] mx-auto px-5 pt-[80px] pb-10">
        <h1 className="text-2xl font-bold mb-8">마이페이지</h1>

        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-[240px] flex-shrink-0">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 bg-gray-50 border-b flex flex-col items-center">
                <div className="w-20 h-20 bg-upbit-header rounded-full flex items-center justify-center text-white mb-3">
                  <User className="w-10 h-10" />
                </div>
                <div className="font-bold text-lg">{user?.name}</div>
                <div className="text-sm text-gray-500">{user?.email}</div>
              </div>
              <nav className="p-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'profile' ? 'bg-blue-50 text-upbit-header font-bold' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  회원 정보 수정
                </button>
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'posts' ? 'bg-blue-50 text-upbit-header font-bold' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  내 게시글
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'comments' ? 'bg-blue-50 text-upbit-header font-bold' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  내 댓글
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-white rounded-lg shadow p-8">
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-xl font-bold mb-6">회원 정보 수정</h2>
                  <form onSubmit={handleUpdateProfile} className="max-w-md space-y-6">
                    {message.text && (
                      <div className={`p-4 rounded-lg text-sm ${
                        message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {message.text}
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                      <input
                        type="email"
                        value={user?.email}
                        disabled
                        className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:border-upbit-header"
                      />
                    </div>

                    <div className="pt-4 border-t">
                      <h3 className="font-medium mb-4">비밀번호 변경</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">새 비밀번호</label>
                          <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="변경할 경우에만 입력하세요"
                            className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:border-upbit-header"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호 확인</label>
                          <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            placeholder="비밀번호를 한번 더 입력하세요"
                            className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:border-upbit-header"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full h-12 bg-upbit-header text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                    >
                      저장하기
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'posts' && (
                <div>
                  <h2 className="text-xl font-bold mb-6">내 게시글</h2>
                  {isLoading ? (
                    <div className="py-10 text-center text-gray-400">로딩 중...</div>
                  ) : myPosts.length === 0 ? (
                    <div className="py-10 text-center text-gray-400">작성한 게시글이 없습니다.</div>
                  ) : (
                    <div className="divide-y">
                      {myPosts.map((post) => (
                        <div 
                          key={post.id} 
                          className="py-4 flex justify-between items-center hover:bg-gray-50 cursor-pointer group px-2 rounded-lg"
                          onClick={() => navigate(`/community`)} // In a real app, this would go to post detail
                        >
                          <div>
                            <span className="text-xs text-gray-400 mb-1 block">{post.category}</span>
                            <h3 className="font-medium text-gray-900 group-hover:text-upbit-header">{post.title}</h3>
                            <div className="flex gap-4 mt-1 text-xs text-gray-500">
                              <span>{formatDate(post.created_at)}</span>
                              <span>조회 {post.views}</span>
                              <span>추천 {post.likes}</span>
                              <span>댓글 {post.comment_count}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'comments' && (
                <div>
                  <h2 className="text-xl font-bold mb-6">내 댓글</h2>
                  {isLoading ? (
                    <div className="py-10 text-center text-gray-400">로딩 중...</div>
                  ) : myComments.length === 0 ? (
                    <div className="py-10 text-center text-gray-400">작성한 댓글이 없습니다.</div>
                  ) : (
                    <div className="divide-y">
                      {myComments.map((comment) => (
                        <div 
                          key={comment.id} 
                          className="py-4 hover:bg-gray-50 cursor-pointer group px-2 rounded-lg"
                          onClick={() => navigate(`/community`)}
                        >
                          <p className="text-gray-900 mb-2">{comment.content}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="font-medium text-gray-500">원문: {comment.post_title}</span>
                            <span>•</span>
                            <span>{formatDate(comment.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
