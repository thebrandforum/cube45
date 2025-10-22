import { Instagram, BookOpen } from 'lucide-react'

export default function Footer() {
  return (
    <footer>
      {/* 단일 섹션 */}
      <div style={{ backgroundColor: '#8B7355' }} className="text-white py-4 md:py-8">
        <div className="max-w-5xl mx-auto px-3 md:px-6">
          <div className="flex justify-between items-center gap-3 md:gap-12">
            {/* 왼쪽 CUBE45 이미지 */}
            <img 
              src="/images/main/footer.jpg" 
              alt="CUBE45" 
              className="h-8 md:h-12 w-auto flex-shrink-0"
            />
            
            {/* 중간 영역 */}
            <div className="flex-1 min-w-0">
              {/* 메뉴 - 모바일에서는 가로 스크롤 가능 */}
              <div className="flex gap-2 md:gap-10 text-[10px] md:text-sm mb-2 md:mb-3 overflow-x-auto whitespace-nowrap scrollbar-hide">
                <span className="cursor-pointer hover:text-gray-200 flex-shrink-0">CUBE 45</span>
                <span className="cursor-pointer hover:text-gray-200 flex-shrink-0">Pool Villa</span>
                <span className="cursor-pointer hover:text-gray-200 flex-shrink-0">Facility</span>
                <span className="cursor-pointer hover:text-gray-200 flex-shrink-0">Gallery</span>
                <span className="cursor-pointer hover:text-gray-200 flex-shrink-0 hidden sm:inline">Special Offers</span>
                <span className="cursor-pointer hover:text-gray-200 flex-shrink-0">Reservation</span>
              </div>
              
              {/* 주소 정보 - 모바일: 위아래 / 데스크톱: 좌우 */}
              <div className="text-[9px] md:text-xs text-gray-200">
                {/* 모바일: 위아래로 쭉 */}
                <div className="md:hidden">
                  <p className="truncate">경기도 가평군 설악면 국수터길 13-1</p>
                  <p className="truncate">사업자번호 : 301-37-28829 | 대표자 : 박언</p>
                  <p className="truncate">예약문의 : 070-5129-1671</p>
                  <p className="truncate mt-2">온라인 위탁사 : 브랜드파트너스</p>
                  <p className="truncate">Brand by BRAND FORUM</p>
                  <p className="truncate">개인정보관리책임자 : 개인정보관리책임자 | 대표번호 : 02-338-1316</p>
                </div>
                
                {/* 데스크톱: 좌우로 분리 (둘 다 왼쪽 정렬) */}
                <div className="hidden md:flex md:justify-between md:gap-8">
                  {/* 왼쪽 */}
                  <div>
                    <p>경기도 가평군 설악면 국수터길 13-1</p>
                    <p>사업자번호 : 301-37-28829 | 대표자 : 박언</p>
                    <p>예약문의 : 070-5129-1671</p>
                  </div>
                  {/* 오른쪽 */}
                  <div>
                    <p>온라인 위탁사 : 브랜드파트너스</p>
                    <p>Brand by BRAND FORUM</p>
                    <p>개인정보관리책임자 : 개인정보관리책임자 | 대표번호 : 02-338-1316</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 오른쪽 SNS 아이콘 박스 */}
            <div className="flex gap-2 md:gap-4 p-2 md:p-4 flex-shrink-0">
              <a href="#" className="hover:opacity-80 transition-opacity">
                <Instagram size={16} className="text-white md:w-[22px] md:h-[22px]" />
              </a>
              <a href="#" className="hover:opacity-80 transition-opacity">
                <BookOpen size={16} className="text-white md:w-[22px] md:h-[22px]" />
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* 스크롤바 숨기기 스타일 */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </footer>
  )
}