'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, ChevronDown, ChevronUp } from 'lucide-react'

export default function Navigation() {
  const [hoveredMenu, setHoveredMenu] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSubMenuOpen, setMobileSubMenuOpen] = useState({})
  
  const menuItems = {
    'CUBE 45': ['CUBE 45', '배치도', '관광정보', '오시는길'],
    '독채객실': ['풀빌라옵션','A동','B동', 'C동', 'D동'],
    '부대시설': [],
    '이용안내': [],
    '스페셜 오퍼': [],
	'실시간예약': []
  }
  
  // 서브메뉴 링크 매핑
  const subMenuLinks = {
    'CUBE 45': {
      'CUBE 45': '/intro',
      '배치도': '/location',
      '관광정보': '/tour',
      '오시는길': '/Contact'
    },
    '독채객실': { 
      '풀빌라옵션': '/room/pool', 	
      'A동': '/room/a',	
      'B동': '/room/b',
      'C동': '/room/c',
      'D동': '/room/d'
    }
  }

  // 메인 메뉴 링크 매핑
  const mainMenuLinks = {
    '부대시설': '/facilities',
    '이용안내': '/guide',
    '스페셜 오퍼': '/special',
    '실시간예약': 'https://rev.yapen.co.kr/external/set?ypIdx=78048',
    '예약확인': '/comfirm'
  }

  // 모바일 서브메뉴 토글
  const toggleMobileSubMenu = (menu) => {
    setMobileSubMenuOpen(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }))
  }

  // 모바일 메뉴 클릭 처리
  const handleMobileMenuClick = (menu) => {
    if (menuItems[menu].length > 0) {
      toggleMobileSubMenu(menu)
    } else if (menu === '실시간예약') {
      window.open('https://rev.yapen.co.kr/external/set?ypIdx=78048', '_blank')
      setMobileMenuOpen(false)
    } else if (mainMenuLinks[menu]) {
      window.location.href = mainMenuLinks[menu]
      setMobileMenuOpen(false)
    }
  }
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* 상단 로고 영역 */}
      <div style={{ backgroundColor: 'white' }}>
        <div className="text-center relative">
          {/* 모바일 햄버거 메뉴 버튼 */}
          <button
            className="md:hidden absolute left-4 top-1/2 -translate-y-1/2 p-2 z-10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X size={24} className="text-gray-700" />
            ) : (
              <Menu size={24} className="text-gray-700" />
            )}
          </button>

          {/* 로고 */}
          <Link href="/">
            <div className="cursor-pointer flex justify-center items-center py-2.5 md:py-4">
              <Image 
                src="/images/main/cube45.jpg"
                alt="CUBE 45"
                width={160}
                height={64}
                priority
                className="object-contain w-24 md:w-40 h-12 md:h-16"
              />
            </div>
          </Link>
        </div>
      </div>
      
      {/* 데스크톱 네비게이션 */}
      <nav style={{ backgroundColor: '#7d6f5d' }} className="hidden md:block text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-14">
            <ul className="flex items-stretch space-x-12">
              {Object.keys(menuItems).map((menu) => (
                <li 
                  key={menu}
                  className="relative flex items-center"
                  onMouseEnter={() => setHoveredMenu(menu)}
                  onMouseLeave={() => setHoveredMenu(null)}
                >
                  {menu === '실시간예약' ? (
                      <a href="https://rev.yapen.co.kr/external/set?ypIdx=78048" target="_blank" rel="noopener noreferrer">
                        <span className="cursor-pointer text-white px-6 flex items-center text-lg font-medium h-14" style={{ backgroundColor: '#3E2B2C' }}>
                          {menu}
                        </span>
                      </a>
                  ) : menu === '예약확인' ? (
                    <Link href="/comfirm">
                      <span className="cursor-pointer hover:text-gray-200 flex items-center text-lg font-medium h-14">
                        {menu}
                      </span>
                    </Link>
                  ) : menu === '부대시설' ? (
                    <Link href="/facilities">
                      <span className="cursor-pointer hover:text-gray-200 flex items-center text-lg font-medium h-14">
                        {menu}
                      </span>
                    </Link>
                  ) : menu === '스페셜 오퍼' ? (
                    <Link href="/special">
                      <span className="cursor-pointer hover:text-gray-200 flex items-center text-lg font-medium h-14">
                        {menu}
                      </span>
                    </Link>
                  ) : menu === '이용안내' ? (
                    <Link href="/guide">
                      <span className="cursor-pointer hover:text-gray-200 flex items-center text-lg font-medium h-14">
                        {menu}
                      </span>
                    </Link>
                  ) : menu === 'CUBE 45' ? (
                    <span className="cursor-default flex items-center text-lg font-medium h-14">
                      {menu}
                    </span>
                  ) : (
                    <span className="cursor-pointer hover:text-gray-200 flex items-center text-lg font-medium h-14">
                      {menu}
                    </span>
                  )}
                  
                  {menuItems[menu].length > 0 && hoveredMenu === menu && (
                    <ul className="absolute top-full left-0 bg-white shadow-lg min-w-[150px] z-50">
                      {menuItems[menu].map((sub) => (
                        <li key={sub}>
                          <Link href={subMenuLinks[menu]?.[sub] || '#'}>
                            <span className="block px-4 py-2 text-gray-700 hover:bg-gray-100 cursor-pointer text-sm">
                              {sub}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>

      {/* 모바일 슬라이드 메뉴 */}
      <div 
        className={`md:hidden fixed top-0 left-0 h-full w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 모바일 메뉴 헤더 */}
        <div style={{ backgroundColor: '#7d6f5d' }} className="p-4 flex justify-between items-center">
          <span className="text-white text-lg font-semibold">MENU</span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="text-white p-1"
          >
            <X size={24} />
          </button>
        </div>

        {/* 모바일 메뉴 아이템 */}
        <nav className="overflow-y-auto h-[calc(100%-64px)]">
          <ul>
            {Object.keys(menuItems).map((menu) => (
              <li key={menu} className="border-b border-gray-200">
                <div
                  className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                  style={menu === '실시간예약' ? { backgroundColor: '#3E2B2C' } : {}}
                  onClick={() => handleMobileMenuClick(menu)}
                >
                  <span className={`font-medium ${menu === '실시간예약' ? 'text-white font-semibold' : 'text-gray-700'}`}>
                    {menu}
                  </span>
                  {menuItems[menu].length > 0 && (
                    <span className={menu === '실시간예약' ? 'text-white' : 'text-gray-400'}>
                      {mobileSubMenuOpen[menu] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </span>
                  )}
                </div>
                
                {/* 모바일 서브메뉴 */}
                {menuItems[menu].length > 0 && mobileSubMenuOpen[menu] && (
                  <ul className="bg-gray-50">
                    {menuItems[menu].map((sub) => (
                      <li key={sub}>
                        <Link href={subMenuLinks[menu]?.[sub] || '#'}>
                          <span 
                            className="block px-8 py-2 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {sub}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* 모바일 메뉴 오버레이 */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  )
}