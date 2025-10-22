'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X, ChevronDown, ChevronUp } from 'lucide-react'

export default function AdminNavigation() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSubMenuOpen, setMobileSubMenuOpen] = useState<Record<string, boolean>>({})
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // 1분마다 업데이트

    return () => clearInterval(timer)
  }, [])

  const formatDate = (date: Date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const weekday = weekdays[date.getDay()]
    return `${month}.${day}(${weekday})`
  }

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/')
  }

  // 모바일 서브메뉴 토글
  const toggleMobileSubMenu = (menu: string) => {
    setMobileSubMenuOpen(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }))
  }

  return (
    <>
      {/* 데스크탑 헤더바 */}
      <header className="hidden md:block fixed top-0 left-0 right-0 bg-white shadow-md z-40">
        <div className="flex items-center justify-center h-16">
          <h1 className="text-xl font-bold text-gray-800">관리자 페이지</h1>
        </div>
      </header>

      {/* 모바일 헤더바 */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white shadow-md z-40">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2"
          >
            {mobileMenuOpen ? (
              <X size={24} className="text-gray-700" />
            ) : (
              <Menu size={24} className="text-gray-700" />
            )}
          </button>
          <h1 className="text-lg font-bold text-gray-800">관리자 페이지</h1>
          <div className="w-10"></div> {/* 균형을 위한 빈 공간 */}
        </div>
      </header>

      {/* 데스크톱 사이드바 */}
      <aside className="hidden md:block w-48 bg-white shadow-lg fixed left-0 top-16 bottom-0 overflow-y-auto">
        <div className="p-4">
          <div className="text-lg font-bold text-gray-800 mb-8">관리자</div>
          
          {/* 예약/매출 섹션 */}
          <div className="text-xs font-bold text-gray-600 mb-2 mt-4">예약/매출</div>
          <ul className="space-y-2 mb-6">
            <li>
              <a 
                href="/admin/dashboard" 
                className={`flex items-center p-3 rounded ${
                  isActive('/admin/dashboard') 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                대시보드
              </a>
              {/* 대시보드 하위 메뉴 */}
              <ul className="ml-8 mt-2 space-y-1">
                <li>
                  <a 
                    href="/admin/dashboard/price-detail" 
                    className={`flex items-center p-2 text-sm rounded ${
                      pathname === '/admin/dashboard/price-detail'
                        ? 'text-blue-600 bg-blue-50' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-2">•</span>
                    상세요금관리
                  </a>
                </li>
                <li>
                  <a 
                    href="/admin/dashboard/daily-sales" 
                    className={`flex items-center p-2 text-sm rounded ${
                      pathname === '/admin/dashboard/daily-sales'
                        ? 'text-blue-600 bg-blue-50' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-2">•</span>
                    일일매출현황
                  </a>
                </li>
                <li>
                  <a 
                    href="/admin/dashboard/property-report" 
                    className={`flex items-center p-2 text-sm rounded ${
                      pathname === '/admin/dashboard/property-report'
                        ? 'text-blue-600 bg-blue-50' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-2">•</span>
                    숙소리포트
                  </a>
                </li>
              </ul>
            </li>
            <li>
              <a 
                href="/admin/reservation" 
                className={`flex items-center p-3 rounded ${
                  isActive('/admin/reservation') 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                예약관리
              </a>
            </li>
            <li>
              <a 
                href="/admin/cancell" 
                className={`flex items-center p-3 rounded ${
                  isActive('/admin/cancell') 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                취소관리
              </a>
            </li>
          </ul>

          {/* 구분선 추가 */}
          <div className="border-t border-gray-300 my-4"></div>

          {/* 페이지 콘텐츠 섹션 */}
          <div className="text-xs font-bold text-gray-600 mb-2">페이지 콘텐츠</div>
          <ul className="space-y-2">
            <li>
              <a 
                href="/admin/content-manage" 
                className={`flex items-center p-3 rounded ${
                  pathname === '/admin/content-manage'
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                메인 관리
              </a>
            </li>
            <li>
              <a 
                href="/admin/content-manage/intro" 
                className={`flex items-center p-3 rounded ${
                  pathname === '/admin/content-manage/intro'
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                CUBE 45 관리
              </a>
            </li>
            <li>
              <a 
                href="/admin/content-manage/room-manage" 
                className={`flex items-center p-3 rounded ${
                  pathname === '/admin/content-manage/room-manage'
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                객실 관리
              </a>
            </li>
            <li>
              <a 
                href="/admin/content-manage/various" 
                className={`flex items-center p-3 rounded ${
                  pathname === '/admin/content-manage/various'
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                <span>
                  부대시설/<br/>
                  이용안내/<br/>
                  스페셜오퍼<br/>
                  관리  
                </span>
              </a>
            </li>	
          </ul>

          {/* 시계 */}
          <div className="mt-auto pt-8">
            <div className="text-center p-4 bg-blue-50 rounded">
              <p className="text-sm text-gray-600">{mounted ? formatDate(currentTime) : '--.--(-)' }</p>
              <p className="text-lg font-bold text-gray-800">{mounted ? formatTime(currentTime) : '--:--'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 모바일 슬라이드 메뉴 */}
      <div 
        className={`md:hidden fixed top-0 left-0 h-full w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 모바일 메뉴 헤더 */}
        <div className="bg-blue-600 p-4 flex justify-between items-center">
          <span className="text-white text-lg font-semibold">관리자 메뉴</span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="text-white p-1"
          >
            <X size={24} />
          </button>
        </div>

        {/* 모바일 메뉴 아이템 */}
        <nav className="overflow-y-auto h-[calc(100%-144px)]">
          {/* 예약/매출 섹션 */}
          <div className="px-4 pt-4">
            <div className="text-xs font-bold text-gray-600 mb-2">예약/매출</div>
          </div>
          
          <ul>
            {/* 대시보드 */}
            <li className="border-b border-gray-200">
              <div
                className={`px-4 py-3 flex justify-between items-center cursor-pointer ${
                  isActive('/admin/dashboard') 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
                onClick={() => toggleMobileSubMenu('dashboard')}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  <span className="font-medium">대시보드</span>
                </div>
                <span className="text-gray-400">
                  {mobileSubMenuOpen['dashboard'] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </span>
              </div>
              
              {/* 대시보드 서브메뉴 */}
              {mobileSubMenuOpen['dashboard'] && (
                <ul className="bg-gray-50">
                  <li>
                    <a
                      href="/admin/dashboard"
                      className={`block px-12 py-2 text-sm ${
                        pathname === '/admin/dashboard'
                          ? 'text-blue-600 bg-blue-100'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      메인 대시보드
                    </a>
                  </li>
                  <li>
                    <a
                      href="/admin/dashboard/price-detail"
                      className={`block px-12 py-2 text-sm ${
                        pathname === '/admin/dashboard/price-detail'
                          ? 'text-blue-600 bg-blue-100'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      상세요금관리
                    </a>
                  </li>
                  <li>
                    <a
                      href="/admin/dashboard/daily-sales"
                      className={`block px-12 py-2 text-sm ${
                        pathname === '/admin/dashboard/daily-sales'
                          ? 'text-blue-600 bg-blue-100'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      일일매출현황
                    </a>
                  </li>
                  <li>
                    <a
                      href="/admin/dashboard/property-report"
                      className={`block px-12 py-2 text-sm ${
                        pathname === '/admin/dashboard/property-report'
                          ? 'text-blue-600 bg-blue-100'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      숙소리포트
                    </a>
                  </li>
                </ul>
              )}
            </li>

            {/* 예약관리 */}
            <li className="border-b border-gray-200">
              <a
                href="/admin/reservation"
                className={`px-4 py-3 flex items-center ${
                  isActive('/admin/reservation') 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">예약관리</span>
              </a>
            </li>

            {/* 취소관리 */}
            <li className="border-b border-gray-200">
              <a
                href="/admin/cancell"
                className={`px-4 py-3 flex items-center ${
                  isActive('/admin/cancell') 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">취소관리</span>
              </a>
            </li>
          </ul>

          {/* 페이지 콘텐츠 섹션 */}
          <div className="px-4 pt-4">
            <div className="text-xs font-bold text-gray-600 mb-2">페이지 콘텐츠</div>
          </div>
          
          <ul>
            {/* 메인 관리 */}
            <li className="border-b border-gray-200">
              <a
                href="/admin/content-manage"
                className={`px-4 py-3 flex items-center ${
                  pathname === '/admin/content-manage'
                    ? 'bg-blue-50 text-blue-600'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                <span className="font-medium">메인 관리</span>
              </a>
            </li>

            {/* CUBE 45 관리 */}
            <li className="border-b border-gray-200">
              <a
                href="/admin/content-manage/intro"
                className={`px-4 py-3 flex items-center ${
                  pathname === '/admin/content-manage/intro'
                    ? 'bg-blue-50 text-blue-600'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="font-medium">CUBE 45 관리</span>
              </a>
            </li>

            {/* 객실 관리 */}
            <li className="border-b border-gray-200">
              <a
                href="/admin/content-manage/room-manage"
                className={`px-4 py-3 flex items-center ${
                  pathname === '/admin/content-manage/room-manage'
                    ? 'bg-blue-50 text-blue-600'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <span className="font-medium">객실 관리</span>
              </a>
            </li>

            {/* 기타 관리 */}
            <li className="border-b border-gray-200">
              <a
                href="/admin/content-manage/various"
                className={`px-4 py-3 flex items-center ${
                  pathname === '/admin/content-manage/various'
                    ? 'bg-blue-50 text-blue-600'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-sm">부대시설/이용안내/스페셜오퍼 관리</span>
              </a>
            </li>
          </ul>
        </nav>

        {/* 모바일 시계 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-blue-50">
          <div className="text-center">
            <p className="text-sm text-gray-600">{mounted ? formatDate(currentTime) : '--.--(-)' }</p>
            <p className="text-lg font-bold text-gray-800">{mounted ? formatTime(currentTime) : '--:--'}</p>
          </div>
        </div>
      </div>

      {/* 모바일 메뉴 오버레이 */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  )
}