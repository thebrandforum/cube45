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

export default function FacilitiesPage() {
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
        .eq('page_name', 'facilities')
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
        {/* 헤더 섹션 - 배너 데이터 사용 */}
        <div className="relative">
          <div className="h-[300px] md:h-[500px] relative overflow-hidden">
            <Image 
              src={bannerData?.image_url || "/images/cube45/background2.jpg"}
              alt="CUBE 45" 
              fill
              priority
              quality={100}
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent"></div>
          </div>
        </div>

        {/* 동적 섹션 렌더링 */}
        {sectionGroups.map((group, index) => (
          <section key={group.section.id} className="py-10 md:py-20 px-4 bg-gray-50">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8 md:mb-12">
                <div className="w-20 md:w-45 h-[1px] bg-gray-300 mx-auto mb-4 md:mb-6"></div>
                <h2 className="text-2xl md:text-4xl font-light mb-3 md:mb-4 text-black whitespace-pre-wrap break-words">
                  {group.section.title}
                </h2>
                {group.section.subtitle && (
                  <p className="text-base md:text-lg text-black mb-4 md:mb-6 font-bold whitespace-pre-wrap break-words">
                    {group.section.subtitle}
                  </p>
                )}
                {group.section.description && (
                  <p className="text-xs md:text-sm text-black max-w-2xl mx-auto leading-relaxed whitespace-pre-wrap break-words">
                    {group.section.description}
                  </p>
                )}
              </div>

              {/* 카드 렌더링 */}
              {group.cards.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
                  {group.cards.map((card) => (
                    <div key={card.id} className="bg-white overflow-hidden shadow-lg">
                      <div className="relative h-40 md:h-48">
                        {card.image_url ? (
                          <Image
                            src={card.image_url}
                            alt={card.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <img 
                            src="/images/facilities/facilities.jpg"
                            alt={card.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="p-4 md:p-6 text-center">
                        <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2 text-black whitespace-pre-wrap break-words">
                          {card.title}
                        </h3>
                        {card.subtitle && (
                          <p className="text-xs md:text-sm text-black whitespace-pre-wrap break-words">
                            {card.subtitle}
                          </p>
                        )}
                        {card.description && (
                          <p className="text-[10px] md:text-xs text-gray-600 mt-1 md:mt-2 whitespace-pre-wrap break-words">
                            {card.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* 푸터 */}
      <Footer />
    </div>
  )
}