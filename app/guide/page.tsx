'use client'
import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface ExtraData {
  parent?: string
  [key: string]: string | undefined
}

interface VariousContent {
  id: number
  page_name: string
  section_name: string
  content_type: 'section' | 'card' | 'banner'
  title: string
  subtitle: string
  description: string
  image_url: string
  display_order: number
  is_active: boolean
  extra_data: ExtraData | null
}

interface SectionWithCards {
  section: VariousContent
  cards: VariousContent[]
}

export default function GuestInfoPage() {
  const [sectionGroups, setSectionGroups] = useState<SectionWithCards[]>([])
  const [bannerData, setBannerData] = useState<VariousContent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContents()
  }, [])

  const fetchContents = async () => {
    try {
      const { data, error } = await supabase
        .from('cube45_various_contents')
        .select('*')
        .eq('page_name', 'guide')
        .eq('is_active', true)
        .order('display_order')

      if (error) throw error

      // 배너 데이터 분리
      const banner = data?.find(item => item.content_type === 'banner') || null
      setBannerData(banner)

      // 섹션과 카드를 그룹화
      const sections = data?.filter(item => item.content_type === 'section') || []
      const groups = sections.map(section => ({
        section,
        cards: data?.filter(item => 
          item.content_type === 'card' && 
          item.extra_data?.parent === section.section_name
        ).sort((a, b) => a.display_order - b.display_order) || []
      }))
      
      setSectionGroups(groups)
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
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

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* 네비게이션 */}
      <Navigation />
      
      {/* 메인 콘텐츠 */}
      <div className="pt-20 md:pt-28">
        {/* CUBE 45 헤더 섹션 - 배너 데이터 사용 */}
        <div className="relative">
          <div className="h-[300px] md:h-[500px] relative overflow-hidden">
            {bannerData?.image_url ? (
              <Image 
                src={bannerData.image_url}
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
          </div>
        </div>
        
        {/* 이용안내 콘텐츠 */}
        <div className="py-10 md:py-20 bg-gray-50">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-6xl mx-auto">
              {/* 헤더 - 배너 데이터의 제목/부제목 사용 */}
              <div className="mb-8 md:mb-12">
                <p className="text-base md:text-xl text-black mb-1 md:mb-2"></p>
                <p className="text-base md:text-xl text-black mb-2 md:mb-4">
                  {bannerData?.title || ""}
                </p>
                <h1 className="text-3xl md:text-5xl font-light text-black mb-6 md:mb-8 whitespace-pre-wrap break-words">
                  {bannerData?.subtitle || ""}
                </h1>
                {/* 왼쪽 밑줄만 */}
                <div className="flex items-center">
                  <div className="w-32 md:w-96 border-t border-gray-300"></div>
                  <div className="px-2 md:px-4"></div>
                </div>
              </div>

              {/* 동적 섹션 렌더링 */}
              {sectionGroups.map((group, index) => (
                <div key={group.section.id}>
                  {/* 섹션 제목 */}
                  <div className={index > 0 ? 'mt-12 md:mt-20' : ''}>
                    {index > 0 && (
                      /* 섹션 구분선 */
                      <div className="flex items-center mb-12 md:mb-20">
                        <div className="w-32 md:w-96 border-t border-gray-300"></div>
                        <div className="px-2 md:px-4"></div>
                      </div>
                    )}
                    
                    <h2 className="text-lg md:text-2xl font-medium text-black mb-6 md:mb-8 whitespace-pre-wrap break-words">
                      {group.section.title}
                    </h2>
                    
                    <div className="space-y-6 md:space-y-8 text-black">
                      {/* 카드(항목) 렌더링 */}
                      {group.cards.map((card) => (
                        <div key={card.id}>
                          <h3 className="text-base md:text-lg font-medium text-black mb-2 md:mb-3 whitespace-pre-wrap break-words">
                            {card.title}
                          </h3>
                          {card.description && (
                            <div className="text-xs md:text-sm text-black space-y-1 md:space-y-2">
                              {card.description.split('\n').map((line, idx) => (
                                <div key={idx} className={`${line.startsWith('  ') ? 'ml-3 md:ml-4' : ''} whitespace-pre-wrap break-words`}>
                                  {line}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  )
}