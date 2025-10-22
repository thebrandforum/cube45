'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function OffersSection() {
  const [offersData, setOffersData] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // 화면 크기 체크
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Supabase에서 데이터 가져오기
  useEffect(() => {
    fetchOffers()
  }, [])

  // 자동 슬라이드 기능 - 모바일/데스크탑 구분
  useEffect(() => {
    const itemsToShow = isMobile ? 1 : 3  // 모바일 1개로 변경
    if (offersData.length <= itemsToShow) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === offersData.length - 1 ? 0 : prev + 1))
    }, isMobile ? 3000 : 1500) // 모바일 3초, 데스크탑 1.5초

    return () => clearInterval(interval)
  }, [offersData.length, isMobile])

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('cube45_various_contents')
        .select('*')
        .eq('page_name', 'special')
        .eq('content_type', 'offer')
        .eq('is_active', true)
        .order('display_order')

      if (error) throw error

      // 데이터 형식 변환
      const formattedOffers = data?.map((item, index) => ({
        id: item.id,
        number: item.extra_data?.number || String(index + 1).padStart(2, '0'),
        title: item.title || '',
        subtitle: item.subtitle || '',
        koreanTitle: item.extra_data?.koreanTitle || '',
        image: item.image_url || '',
        description: item.description || ''
      })) || []

      setOffersData(formattedOffers)
    } catch (error) {
      console.error('오퍼 데이터 로드 실패:', error)
      // 에러 시 빈 배열
      setOffersData([])
    } finally {
      setLoading(false)
    }
  }
  
  // 이전 슬라이드
  const handlePrev = () => {
    if (offersData.length === 0) return
    setCurrentIndex((prev) => (prev === 0 ? offersData.length - 1 : prev - 1))
  }
  
  // 다음 슬라이드
  const handleNext = () => {
    if (offersData.length === 0) return
    setCurrentIndex((prev) => (prev === offersData.length - 1 ? 0 : prev + 1))
  }
  
  // 표시할 아이템 가져오기
  const getVisibleOffers = () => {
    if (offersData.length === 0) return []
    
    const visible = []
    const itemsToShow = isMobile ? 1 : 3  // 모바일 1개로 변경
    
    for (let i = 0; i < itemsToShow; i++) {
      const index = (currentIndex + i) % offersData.length
      visible.push(offersData[index])
    }
    return visible
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-black mb-12">OFFERS</h2>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (offersData.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-black mb-12">OFFERS</h2>
        <p className="text-center text-gray-500">등록된 오퍼가 없습니다.</p>
      </div>
    )
  }

  const itemsToShow = isMobile ? 1 : 3  // 모바일 1개로 변경

  return (
    <div className="container mx-auto px-4 py-16">
      <h2 className="text-3xl font-bold text-center text-black mb-12">OFFERS</h2>
      <div className="relative">
        {/* 그리드 - 모바일 1개, 데스크탑 3개 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mx-auto max-w-xs sm:max-w-none">
          {getVisibleOffers().map((offer) => (
            <div key={offer.id}>
              <div className="mb-2 px-1 sm:px-0">
                <p className="text-gray-500 text-xs sm:text-sm mb-1">{offer.number}</p>
                <p className="text-[10px] sm:text-xs text-gray-600 mb-1 sm:mb-2 truncate">{offer.title}</p>
                <h3 className="text-sm sm:text-xl font-semibold text-black mb-0.5 sm:mb-1">{offer.subtitle}</h3>
                <h3 className="text-sm sm:text-xl font-semibold text-black">{offer.koreanTitle}</h3>
              </div>
              {/* 사진 영역 */}
              <div className="h-40 sm:h-80 overflow-hidden relative">
                {offer.image ? (
                  <img 
                    src={offer.image}
                    alt={offer.koreanTitle}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200"></div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* 좌우 화살표 - 아이템이 표시 개수보다 많을 때만 */}
        {offersData.length > itemsToShow && (
          <>
            {/* 데스크탑 화살표 */}
            <button 
              onClick={handlePrev}
              className="absolute -left-10 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm text-gray-800 p-3 rounded-full hover:bg-white hover:shadow-lg transition-all hidden sm:block"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              onClick={handleNext}
              className="absolute -right-10 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm text-gray-800 p-3 rounded-full hover:bg-white hover:shadow-lg transition-all hidden sm:block"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* 모바일 화살표 */}
            <button 
              onClick={handlePrev}
              className="absolute left-0 top-[55%] -translate-y-1/2 z-10 bg-white/80 text-gray-800 p-1.5 rounded-full shadow-md sm:hidden"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              onClick={handleNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 text-gray-800 p-1.5 rounded-full shadow-md sm:hidden"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>
      
      {/* 페이지 인디케이터 */}
      {offersData.length > itemsToShow && (
        <div className="flex justify-center mt-6 sm:mt-8 gap-2">
          {offersData.map((_, index) => {
            // 현재 표시되는 아이템 확인
            let isActive = false
            for (let i = 0; i < itemsToShow; i++) {
              if ((currentIndex + i) % offersData.length === index) {
                isActive = true
                break
              }
            }
            
            return (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  isActive ? 'bg-gray-800' : 'bg-gray-300'
                }`}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}