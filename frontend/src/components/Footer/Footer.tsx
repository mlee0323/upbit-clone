import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[#f8f9fa] border-t border-gray-200 mt-3">
      <div className="max-w-[1400px] mx-auto px-5 py-8">
        <div className="flex justify-between">
          {/* Left - Company Info */}
          <div className="flex-1">
            <Link to="/" className="text-xl font-bold text-upbit-header">
              Upbit
            </Link>
            <div className="mt-4 text-[11px] text-gray-500 space-y-2">
              <p>
                <span className="font-medium text-gray-700">고객센터</span>
                <span className="ml-3">1588-5682</span>
                <span className="ml-3">서울시 강남구 테헤란로 4길 14, 2층</span>
              </p>
              <p>
                <span>두나무 주식회사</span>
                <span className="ml-3">서울시 강남구 테헤란로 4길 14, 5층</span>
                <span className="ml-3">대표 이석우</span>
                <span className="ml-3">사업자등록번호 119-86-54968</span>
              </p>
              <p>
                <span>기사 배열 책임자 박동규</span>
                <span className="ml-3">청소년 보호 책임자 송세정</span>
              </p>
              <p className="mt-3 text-gray-400">
                Copyright © 2017 - 2024 Dunamu Inc.
              </p>
            </div>
          </div>

          {/* Right - Footer Menu */}
          <div className="flex gap-16">
            <div>
              <h4 className="font-bold text-sm text-gray-700 mb-3">회사</h4>
              <ul className="space-y-2 text-[11px] text-gray-500">
                <li><Link to="#" className="hover:text-gray-700">회사소개</Link></li>
                <li><Link to="#" className="hover:text-gray-700">공지사항</Link></li>
                <li><Link to="#" className="hover:text-gray-700">이용약관</Link></li>
                <li><Link to="#" className="hover:text-gray-700">Open API 이용약관</Link></li>
                <li><Link to="#" className="hover:text-gray-700 font-bold">개인정보처리방침</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-700 mb-3">고객지원</h4>
              <ul className="space-y-2 text-[11px] text-gray-500">
                <li><Link to="#" className="hover:text-gray-700">자주하는 질문(FAQ)</Link></li>
                <li><Link to="#" className="hover:text-gray-700">카카오톡 문의(24시간)</Link></li>
                <li><Link to="#" className="hover:text-gray-700">1:1 문의하기</Link></li>
                <li><Link to="#" className="hover:text-gray-700">Open API</Link></li>
                <li><Link to="#" className="hover:text-gray-700">거래 이용 안내</Link></li>
                <li><Link to="#" className="hover:text-gray-700">입출금 이용 안내</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
