import { useState } from 'react';
import Header from '../components/Header';
import { ChevronRight, HelpCircle, MessageCircle, Bell, FileText } from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface Notice {
  id: string;
  title: string;
  date: string;
  isNew: boolean;
}

const FAQS: FAQ[] = [
  {
    id: '1',
    question: '회원가입은 어떻게 하나요?',
    answer: '홈페이지 우측 상단의 "회원가입" 버튼을 클릭하여 이메일, 비밀번호, 이름을 입력하시면 회원가입이 완료됩니다.',
  },
  {
    id: '2',
    question: '비밀번호를 잊어버렸어요.',
    answer: '로그인 페이지에서 "비밀번호 찾기"를 클릭하시고 가입 시 사용한 이메일을 입력하시면 비밀번호 재설정 안내 메일이 발송됩니다.',
  },
  {
    id: '3',
    question: '거래 수수료는 얼마인가요?',
    answer: '매매 수수료는 거래 금액의 0.05%입니다. 원화 입출금 수수료는 무료입니다.',
  },
  {
    id: '4',
    question: '출금이 안돼요.',
    answer: '보안을 위해 첫 입금 후 72시간 동안은 출금이 제한됩니다. 이후에는 정상적으로 출금이 가능합니다.',
  },
  {
    id: '5',
    question: '차트가 안 보여요.',
    answer: '브라우저 캐시를 삭제하거나, 다른 브라우저에서 접속해 보세요. 문제가 지속되면 고객센터로 문의해 주세요.',
  },
];

const NOTICES: Notice[] = [
  { id: '1', title: '[공지] 시스템 정기 점검 안내 (12/25)', date: '2024-12-20', isNew: true },
  { id: '2', title: '[공지] 신규 코인 상장 안내 - SOL, AVAX', date: '2024-12-18', isNew: true },
  { id: '3', title: '[안내] 이벤트 당첨자 발표', date: '2024-12-15', isNew: false },
  { id: '4', title: '[공지] 개인정보처리방침 개정 안내', date: '2024-12-10', isNew: false },
  { id: '5', title: '[안내] 연말 고객센터 운영 시간 변경 안내', date: '2024-12-08', isNew: false },
];

export default function CustomerCenter() {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-upbit-bg">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">고객센터</h1>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button className="flex flex-col items-center gap-2 p-4 bg-upbit-bg-secondary hover:bg-upbit-bg-tertiary rounded-lg transition-colors">
            <Bell className="w-6 h-6 text-upbit-accent" />
            <span className="text-sm text-white">공지사항</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 bg-upbit-bg-secondary hover:bg-upbit-bg-tertiary rounded-lg transition-colors">
            <HelpCircle className="w-6 h-6 text-upbit-accent" />
            <span className="text-sm text-white">자주 묻는 질문</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 bg-upbit-bg-secondary hover:bg-upbit-bg-tertiary rounded-lg transition-colors">
            <MessageCircle className="w-6 h-6 text-upbit-accent" />
            <span className="text-sm text-white">1:1 문의</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 bg-upbit-bg-secondary hover:bg-upbit-bg-tertiary rounded-lg transition-colors">
            <FileText className="w-6 h-6 text-upbit-accent" />
            <span className="text-sm text-white">이용약관</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Notices */}
          <div className="bg-upbit-bg-card border border-upbit-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">공지사항</h2>
              <button className="text-sm text-upbit-text-secondary hover:text-white flex items-center gap-1">
                더보기 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {NOTICES.map((notice) => (
                <button
                  key={notice.id}
                  className="w-full flex items-center justify-between p-3 hover:bg-upbit-bg-tertiary rounded transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {notice.isNew && (
                      <span className="px-1.5 py-0.5 bg-upbit-up text-white text-xxs rounded flex-shrink-0">
                        NEW
                      </span>
                    )}
                    <span className="text-sm text-white truncate">{notice.title}</span>
                  </div>
                  <span className="text-xs text-upbit-text-tertiary flex-shrink-0 ml-2">
                    {notice.date}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-upbit-bg-card border border-upbit-border rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-4">자주 묻는 질문</h2>
            <div className="space-y-2">
              {FAQS.map((faq) => (
                <div key={faq.id} className="border-b border-upbit-border last:border-b-0">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                    className="w-full flex items-center justify-between py-3 text-left"
                  >
                    <span className="text-sm text-white pr-4">{faq.question}</span>
                    <ChevronRight
                      className={`w-4 h-4 text-upbit-text-tertiary flex-shrink-0 transition-transform ${
                        expandedFaq === faq.id ? 'rotate-90' : ''
                      }`}
                    />
                  </button>
                  {expandedFaq === faq.id && (
                    <div className="pb-3 text-sm text-upbit-text-secondary">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="mt-8 bg-upbit-bg-secondary border border-upbit-border rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">
            도움이 필요하신가요?
          </h3>
          <p className="text-upbit-text-secondary mb-4">
            평일 09:00 ~ 18:00 (공휴일 휴무)
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="mailto:support@upbitclone.com"
              className="px-4 py-2 bg-upbit-accent hover:bg-upbit-accent-hover text-white rounded transition-colors"
            >
              이메일 문의
            </a>
            <button className="px-4 py-2 bg-upbit-bg-tertiary hover:bg-upbit-bg text-white rounded transition-colors">
              카카오톡 상담
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
