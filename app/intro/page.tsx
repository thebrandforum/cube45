'use client'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface PageContent {
  id: number
  page_name: string
  section_name: string
  content_type: string
  title: string | null
  subtitle: string | null
  description: string | null
  image_url: string | null
  display_order: number
  is_active: boolean
  extra_data: Record<string, string | undefined> | null
}

export default function IntroPage() {
  const [contents, setContents] = useState<PageContent[]>([])
  const [loading, setLoading] = useState(true)
  const [exclusiveCurrentImage, setExclusiveCurrentImage] = useState(0)
  const [exceptionalCurrentImage, setExceptionalCurrentImage] = useState(0)
  
  // 애니메이션을 위한 ref들
  const leftTextRef = useRef(null)
  const rightImageRef = useRef(null)
  const centerImageRef = useRef(null)
  const leftTitleRef = useRef(null)
  const rightTextRef = useRef(null)
  const reservationBtnRef = useRef(null)
  
  // 모바일용 ref들 추가
  const mobileTitleRef = useRef(null)
  const mobileImageRef = useRef(null)
  const mobileTextRef = useRef(null)
  const mobileBtnRef = useRef(null)

  // 데이터 가져오기
  useEffect(() => {
    fetchContents()
  }, [])

  const fetchContents = async () => {
    try {
      const { data, error } = await supabase
        .from('cube45_page_contents')
        .select('*')
        .eq('page_name', 'intro')
        .eq('is_active', true)
        .order('display_order')

      if (error) throw error
      setContents(data || [])
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 특정 섹션 콘텐츠 가져오기
  const getContent = (section_name: string) => {
    return contents.find(c => c.section_name === section_name)
  }

  useEffect(() => {
    // Intersection Observer 설정
    const observerOptions = {
      threshold: 0.3,
      rootMargin: '0px 0px -50px 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-slide-in')
        } else {
          entry.target.classList.remove('animate-slide-in')
        }
      })
    }, observerOptions)

    // 모든 애니메이션 요소들을 관찰
    const elements = [
      leftTextRef.current,
      rightImageRef.current,
      centerImageRef.current,
      leftTitleRef.current,
      rightTextRef.current,
      reservationBtnRef.current,
      mobileTitleRef.current,
      mobileImageRef.current,
      mobileTextRef.current,
      mobileBtnRef.current
    ]

    elements.forEach(el => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [loading]) // loading이 끝난 후 Observer 설정

  // 모든 Hook은 조건문 전에 선언
  const bannerContent = getContent('banner')
  const exclusiveCubeContent = getContent('exclusive_cube')
  const exclusiveCubeImage = getContent('exclusive_cube_image')
  const exceptionalRetreatContent = getContent('exceptional_retreat')
  const exceptionalRetreatImage = getContent('exceptional_retreat_image')
  
  // 추가 이미지들 수집
  const exclusiveImages: string[] = [exclusiveCubeImage?.image_url]
    .filter((img): img is string => Boolean(img))
  for (let i = 2; i <= 5; i++) {
    const img = getContent(`exclusive_cube_image_${i}`)?.image_url
    if (img) exclusiveImages.push(img)
  }
  
  const exceptionalImages: string[] = [exceptionalRetreatImage?.image_url]
    .filter((img): img is string => Boolean(img))
  for (let i = 2; i <= 5; i++) {
    const img = getContent(`exceptional_retreat_image_${i}`)?.image_url
    if (img) exceptionalImages.push(img)
  }

  // 슬라이드 효과 - 조건문 전에 위치
  useEffect(() => {
    if (!loading && exclusiveImages.length > 1) {
      const timer = setInterval(() => {
        setExclusiveCurrentImage(prev => (prev + 1) % exclusiveImages.length)
      }, 2500)
      return () => clearInterval(timer)
    }
  }, [loading, contents])

  useEffect(() => {
    if (!loading && exceptionalImages.length > 1) {
      const timer = setInterval(() => {
        setExceptionalCurrentImage(prev => (prev + 1) % exceptionalImages.length)
      }, 2500)
      return () => clearInterval(timer)
    }
  }, [loading, contents])

  // 로딩 체크는 모든 Hook 선언 후에
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">로딩 중...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        /* 초기 상태 - 왼쪽 요소들 */
        .slide-from-left {
          transform: translateX(-100px);
          opacity: 0;
          transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        /* 초기 상태 - 오른쪽 요소들 */
        .slide-from-right {
          transform: translateX(100px);
          opacity: 0;
          transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        /* 초기 상태 - 중앙 요소들 */
        .slide-from-bottom {
          transform: translateY(50px);
          opacity: 0;
          transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        /* 애니메이션 실행 */
        .animate-slide-in {
          transform: translate(0, 0) !important;
          opacity: 1 !important;
        }

        /* 모바일에서 애니메이션 거리 축소 */
        @media (max-width: 768px) {
          .slide-from-left {
            transform: translateX(-30px);
          }
          .slide-from-right {
            transform: translateX(30px);
          }
          .slide-from-bottom {
            transform: translateY(20px);
          }
        }
      `}</style>

      <div className="min-h-screen bg-white overflow-x-hidden">
        {/* 네비게이션 */}
        <Navigation />

        {/* 메인 콘텐츠 */}
        <div className="pt-20 md:pt-28">
          {/* CUBE 45 헤더 섹션 */}
          <div className="relative">
            <div className="h-[300px] md:h-[500px] relative overflow-hidden">
              {bannerContent?.image_url ? (
                <Image 
                  src={bannerContent.image_url}
                  alt="CUBE 45" 
                  fill
                  priority
                  quality={100}
                  className="object-cover"
                  sizes="100vw"
                />
              ) : (
                <div className="w-full h-full bg-gray-200"></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent"></div>
              
              {/* 텍스트 오버레이 */}
              <div className="absolute inset-0 flex items-center">
                <div className="container mx-auto px-4 md:px-8">
                  <div className="text-white max-w-full md:max-w-2xl">
                    <h1 className="text-4xl md:text-7xl font-bold mb-2 md:mb-4 break-words">
                      {bannerContent?.title || ''}
                    </h1>	
                    <p className="text-sm md:text-lg mb-1 md:mb-2">
                      {bannerContent?.subtitle || ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* 하단 정보 바 */}
              <div className="absolute bottom-0 left-0 right-0 backdrop-blur-sm" style={{ backgroundColor: 'rgba(245, 230, 211, 0.6)' }}>
                <div className="container mx-auto px-4 md:px-8">
                  <div className="flex items-center justify-center py-2 md:py-4">
                    <div className="flex items-center space-x-3 md:space-x-8 text-xs md:text-xl">
                      <Link href="/intro" className="text-black hover:text-gray-700 cursor-pointer font-bold">
                        CUBE 45
                      </Link>
                      <span className="text-black">|</span>
                      <Link href="/location" className="text-black hover:text-gray-700 cursor-pointer">
                        배치도
                      </Link>
                      <span className="text-black">|</span>
                      <Link href="/tour" className="text-black hover:text-gray-700 cursor-pointer">
                        관광정보
                      </Link>
					  <span className="text-black">|</span>
                      <Link href="/Contact" className="text-black hover:text-gray-700 cursor-pointer">
                        오시는길
                      </Link>	
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Exclusive Cube of Joy 섹션 */}
          <div className="py-10 md:py-20">
            <div className="container mx-auto px-4 md:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16 items-center">
                {/* 왼쪽 텍스트 영역 - 왼쪽에서 슬라이드 인 */}
                <div ref={leftTextRef} className="slide-from-left">
                  <div className="mt-6 md:mt-12 mb-4 md:mb-8 relative">
                    <h2 className="text-2xl md:text-5xl font-light text-black leading-tight break-words">
                      {exclusiveCubeContent?.title?.split('\n').map((line, i) => (
                        <span key={i}>
                          {line}
                          {i < (exclusiveCubeContent?.title?.split('\n').length || 0) - 1 && <br/>}
                        </span>
                      )) || ''}
                    </h2>
                    <span className="hidden md:block absolute text-gray-500 text-base border-b border-gray-400 pb-1" 
                          style={{ top: '50%', right: '310px', transform: 'translateY(-50%)' }}>
                      in gapyeong
                    </span>
                    <span className="block md:hidden text-gray-500 text-sm border-b border-gray-400 pb-1 inline-block mt-2">
                      in gapyeong
                    </span>
                  </div>
                  
                  {/* 구분선 */}
                  <div className="border-t border-gray-300 my-10 md:my-20 mr-0 md:-mr-32"></div>
                  
                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <h3 className="text-lg md:text-2xl font-semibold text-black mb-2 md:mb-3">
                        {exclusiveCubeContent?.subtitle || ''}
                      </h3>
                      <p className="text-black leading-relaxed text-xs md:text-xl break-words">
                        {exclusiveCubeContent?.description?.split('\n').map((line, i) => (
                          <span key={i}>
                            {line}
                            {i < (exclusiveCubeContent?.description?.split('\n').length || 0) - 1 && <br/>}
                          </span>
                        )) || ''}
                      </p>
                    </div>
                  </div>

                  <Link href="/room/pool">
                    <button className="mt-6 md:mt-10 px-6 md:px-8 py-2 border border-gray-800 rounded-full text-gray-800 text-sm font-medium hover:bg-gray-100 transition-colors mx-auto md:ml-[180px] block md:inline-block">
                      Room
                    </button>
                  </Link>
                </div>

                {/* 오른쪽 이미지 영역 - 오른쪽에서 슬라이드 인 */}
                <div ref={rightImageRef} className="flex justify-center -mt-2 md:-mt-28 slide-from-right">
                  <div 
                    className="shadow-2xl overflow-hidden relative w-[320px] h-[240px] md:w-[640px] md:h-[480px] rounded-tl-[120px] rounded-bl-[120px] md:rounded-tl-[240px] md:rounded-bl-[240px] rounded-tr-none rounded-br-none"
                  >
                    {exclusiveImages.length > 0 ? (
                      exclusiveImages.map((img, index) => (
                        <Image 
                          key={index}
                          src={img}
                          alt="CUBE 45 Interior" 
                          fill
                          className={`object-cover transition-opacity duration-1000 ${
                            index === exclusiveCurrentImage ? 'opacity-100' : 'opacity-0'
                          }`}
                          style={{ position: 'absolute' }}
                          sizes="640px"
                        />
                      ))
                    ) : (
                      <div className="w-full h-full bg-gray-200"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* An Exceptional Retreat 섹션 */}
          <div className="py-16 md:py-32 pb-20 md:pb-80">
            <div className="container mx-auto px-4 md:px-8 overflow-hidden md:overflow-visible">
              {/* 모바일 레이아웃 */}
              <div className="block md:hidden space-y-8">
                <div ref={mobileTitleRef} className="slide-from-left">
                  <h2 className="text-2xl font-light text-black leading-tight">
                    {exceptionalRetreatContent?.title?.split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < (exceptionalRetreatContent?.title?.split('\n').length || 0) - 1 && <br/>}
                      </span>
                    )) || ''}
                  </h2>
                </div>

                <div ref={mobileImageRef} className="slide-from-bottom">
                  <div className="overflow-hidden shadow-lg relative w-[240px] h-[350px] mx-auto rounded-tl-[120px] rounded-tr-[120px] rounded-br-[130px] rounded-bl-[30px]">
                    {exceptionalImages.length > 0 ? (
                      exceptionalImages.map((img, index) => (
                        <Image 
                          key={index}
                          src={img}
                          alt="Villa Pool View" 
                          fill
                          className={`object-cover transition-opacity duration-1000 ${
                            index === exceptionalCurrentImage ? 'opacity-100' : 'opacity-0'
                          }`}
                          style={{ position: 'absolute' }}
                        />
                      ))
                    ) : (
                      <div className="w-full h-full bg-gray-200"></div>
                    )}
                  </div>
                </div>

                <div ref={mobileTextRef} className="slide-from-right">
                  <h3 className="text-lg font-semibold text-black mb-2">
                    {exceptionalRetreatContent?.subtitle || ''}
                  </h3>
                  <p className="text-black leading-relaxed text-xs">
                    {exceptionalRetreatContent?.description?.split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < (exceptionalRetreatContent?.description?.split('\n').length || 0) - 1 && <br/>}
                      </span>
                    )) || ''}
                  </p>
                </div>

                <div ref={mobileBtnRef} className="slide-from-right flex justify-center">
                  <Link href="/room/pool">
                    <button className="px-8 py-2 border border-gray-800 rounded-full text-gray-800 text-sm font-medium hover:bg-gray-100 transition-colors">
                      Room
                    </button>
                  </Link>
                </div>
              </div>

              {/* 데스크톱 레이아웃 - 원래대로 */}
              <div className="hidden md:flex items-center justify-center">
                <div className="relative">
                  {/* 중앙 이미지 - 아래에서 슬라이드 인 */}
                  <div ref={centerImageRef} 
                       className="overflow-hidden shadow-lg slide-from-bottom relative"
                       style={{
                         width: 'calc(16rem * 1.5)',
                         height: 'calc(22rem * 1.5)',
                         borderTopLeftRadius: '190px',
                         borderTopRightRadius: '190px',
                         borderBottomRightRadius: '180px',
                         borderBottomLeftRadius: '40px',
                         marginLeft: '-160px',
                         zIndex: 10	 
                       }}>
                    {exceptionalImages.length > 0 ? (
                      exceptionalImages.map((img, index) => (
                        <Image 
                          key={index}
                          src={img}
                          alt="Villa Pool View" 
                          fill
                          className={`object-cover transition-opacity duration-1000 ${
                            index === exceptionalCurrentImage ? 'opacity-100' : 'opacity-0'
                          }`}
                          style={{ position: 'absolute' }}
                          sizes="384px"
                        />
                      ))
                    ) : (
                      <div className="w-full h-full bg-gray-200"></div>
                    )}
                  </div>
                  
                  {/* 왼쪽 위 제목 - 왼쪽에서 슬라이드 인 */}
                  <div ref={leftTitleRef} className="absolute slide-from-left" style={{ left: '-600px', top: '-16px' }}>
                    <h2 className="text-4xl font-light text-black leading-tight">
                      {exceptionalRetreatContent?.title?.split('\n').map((line, i) => (
                        <span key={i}>
                          {line}
                          {i < (exceptionalRetreatContent?.title?.split('\n').length || 0) - 1 && <br/>}
                        </span>
                      )) || ''}
                    </h2>
                  </div>
                  
                  {/* 구분선 - 사진 뒤로 */}
                  <div className="absolute border-t border-gray-300" 
                       style={{ 
                         left: '-700px', 
                         right: '-800px', 
                         top: '50%', 
                         transform: 'translateY(-50%)',
                         zIndex: 5
                       }}>
                  </div>
                  
                  {/* 오른쪽 텍스트 - 오른쪽에서 슬라이드 인 */}
                  <div ref={rightTextRef} className="absolute left-80 top-102 w-96 whitespace-nowrap slide-from-right">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-2xl font-semibold text-black mb-3">
                          {exceptionalRetreatContent?.subtitle || ''}
                        </h3>
                        <p className="text-black leading-relaxed text-xl">
                          {exceptionalRetreatContent?.description?.split('\n').map((line, i) => (
                            <span key={i}>
                              {line}
                              {i < (exceptionalRetreatContent?.description?.split('\n').length || 0) - 1 && <br/>}
                            </span>
                          )) || ''}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 오른쪽 아래 Reservation 버튼 - 오른쪽에서 슬라이드 인 */}
                  <div ref={reservationBtnRef} className="absolute slide-from-right" style={{ right: '-500px', bottom: '-150px' }}>
                    <Link href="/room/pool">
                      <button className="px-8 py-2 border border-gray-800 rounded-full text-gray-800 text-sm font-medium hover:bg-gray-100 transition-colors">
                        Room
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <Footer />
      </div>
    </>
  )
}