'use client'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
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
  extra_data: {
    tag?: string
    description?: string
    link?: string  // 추가된 필드
  } | null
}

interface CafeItem {
  id: number
  section_name: string
  title: string
  image_url: string
  tag: string
  description: string
  link: string  // 추가된 필드
  display_order: number
}

export default function TourPage() {
  const [contents, setContents] = useState<PageContent[]>([])
  const [cafes, setCafes] = useState<CafeItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContents()
  }, [])

  const fetchContents = async () => {
    try {
      const { data, error } = await supabase
        .from('cube45_page_contents')
        .select('*')
        .eq('page_name', 'tour')
        .eq('is_active', true)
        .order('display_order')

      if (error) throw error
      
      setContents(data || [])
      
      // 카페 데이터만 필터링 (link 필드 추가)
      const cafeData = data?.filter(item => item.content_type === 'card').map(item => ({
        id: item.id,
        section_name: item.section_name,
        title: item.title || '',
        image_url: item.image_url || '',
        tag: item.extra_data?.tag || '',
        description: item.extra_data?.description || '',
        link: item.extra_data?.link || '',  // link 데이터 가져오기
        display_order: item.display_order
      })) || []
      
      setCafes(cafeData)
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const getContent = (section_name: string) => {
    return contents.find(c => c.section_name === section_name)
  }

  // 자세히보기 버튼 클릭 핸들러
  const handleDetailClick = (link: string) => {
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer')
    }
  }

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

  const bannerContent = getContent('banner')
  const tourIntroContent = getContent('tour_intro')

  return (
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
                    <Link href="/intro" className="text-black hover:text-gray-700 cursor-pointer">
                      CUBE 45
                    </Link>
                    <span className="text-black">|</span>
                    <Link href="/location" className="text-black hover:text-gray-700 cursor-pointer">
                      배치도
                    </Link>
                    <span className="text-black">|</span>
                    <Link href="/tour" className="text-black hover:text-gray-700 cursor-pointer font-bold">
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
        
        {/* 소개 섹션 */}
        <div className="py-10 md:py-20">
          <div className="container mx-auto px-4 md:px-8">
            {/* 모바일 레이아웃 */}
            <div className="flex flex-col md:hidden gap-8">
              <div className="relative">
                <h2 className="text-3xl font-light text-black mb-4 leading-tight">
                  {tourIntroContent?.title?.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < (tourIntroContent?.title?.split('\n').length || 0) - 1 && <br/>}
                    </span>
                  )) || ''}
                </h2>
                <div className="border-t border-gray-300 mt-4 mb-8"></div>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-black mb-4">
                  {tourIntroContent?.subtitle || ''}
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {tourIntroContent?.description?.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < (tourIntroContent?.description?.split('\n').length || 0) - 1 && <br/>}
                    </span>
                  )) || ''}
                </p>
              </div>
            </div>

            {/* 데스크톱 레이아웃 */}
            <div className="hidden md:flex items-start gap-16">
              {/* 왼쪽 텍스트 */}
              <div className="w-1/3 relative">
                <h2 className="text-5xl font-light text-black mb-4 leading-tight">
                  {tourIntroContent?.title?.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < (tourIntroContent?.title?.split('\n').length || 0) - 1 && <br/>}
                    </span>
                  )) || ''}
                </h2>
                {/* 구분선 */}
                <div className="absolute border-t border-gray-300" 
                     style={{ 
                       left: '-350px',
                       right: '0',
                       bottom: '-50px'
                     }}></div>
              </div>
              <div className="w-2/3 mt-16">
                <h3 className="text-xl font-bold text-black mb-6">
                  {tourIntroContent?.subtitle || ''}
                </h3>
                <p className="text-base text-gray-700 leading-relaxed">
                  {tourIntroContent?.description?.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < (tourIntroContent?.description?.split('\n').length || 0) - 1 && <br/>}
                    </span>
                  )) || ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 카페 목록 섹션 */}
        <div className="py-8 md:py-16">
          <div className="container mx-auto px-4 md:px-8">
            <div className="grid grid-cols-1">
              {cafes.length > 0 ? (
                cafes.map((cafe, index) => (
                  <div key={cafe.id}>
                    {/* 모바일 레이아웃 */}
                    <div className="flex flex-col md:hidden bg-white py-6">
                      {/* 이미지 */}
                      <div className="w-full mb-4">
                        {cafe.image_url ? (
                          <Image 
                            src={cafe.image_url}
                            alt={cafe.title}
                            width={400}
                            height={250}
                            className="w-full h-[200px] object-cover"
                          />
                        ) : (
                          <div className="w-full h-[200px] bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400">이미지 없음</span>
                          </div>
                        )}
                      </div>
                      
                      {/* 콘텐츠 */}
                      <div className="px-2">
                        <div className="mb-4 relative">
                          <p className="text-xs text-black mb-2">
                            {cafe.tag || ''}
                          </p>
                          <div className="absolute border-b border-black w-8"></div>
                        </div>
                        <h3 className="text-lg font-bold text-black mb-4 mt-6">
                          {cafe.title}
                        </h3>
                        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed mb-4">
                          {cafe.description}
                        </p>
                        <div className="flex justify-end">
                          {cafe.link ? (
                            <button 
                              onClick={() => handleDetailClick(cafe.link)}
                              className="px-4 py-1.5 bg-gray-800 text-white text-sm rounded-full hover:bg-gray-700 transition-colors"
                            >
                              자세히보기
                            </button>
                          ) : (
                            <button 
                              disabled
                              className="px-4 py-1.5 bg-gray-400 text-white text-sm rounded-full cursor-not-allowed"
                            >
                              자세히보기
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 데스크톱 레이아웃 */}
                    <div className="hidden md:flex bg-white py-8">
                      {/* 왼쪽 이미지 */}
                      <div className="w-1/3">
                        {cafe.image_url ? (
                          <Image 
                            src={cafe.image_url}
                            alt={cafe.title}
                            width={400}
                            height={300}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-[300px] bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400">이미지 없음</span>
                          </div>
                        )}
                      </div>
                      
                      {/* 오른쪽 콘텐츠 */}
                      <div className="w-2/3 px-8 flex flex-col justify-between">
                        <div>
                          <div className="mb-6 relative">
                            <p className="text-sm text-black mb-3">
                              {cafe.tag || ''}
                            </p>
                            <div className="absolute border-b border-black"
                                 style={{ 
                                   left: '0',
                                   right: '95%',
                                 }}>
                            </div>
                          </div>
                          <h3 className="text-xl font-bold text-black mb-6" style={{ marginTop: '30px' }}>
                            {cafe.title}
                          </h3>
                          <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                            {cafe.description}
                          </p>
                        </div>
                        <div className="mt-6 flex justify-end">
                          {cafe.link ? (
                            <button 
                              onClick={() => handleDetailClick(cafe.link)}
                              className="px-6 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors"
                            >
                              자세히보기
                            </button>
                          ) : (
                            <button 
                              disabled
                              className="px-6 py-2 bg-gray-400 text-white rounded-full cursor-not-allowed"
                            >
                              자세히보기
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* 카페 사이 구분선 */}
                    {index < cafes.length - 1 && (
                      <div className="border-b border-gray-300"></div>
                    )}
                  </div>
                ))
              ) : (
                // 카페 데이터가 없을 때 기본 표시
                <div className="text-center py-10 md:py-20">
                  <p className="text-gray-500">관광 정보가 준비 중입니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  )
}