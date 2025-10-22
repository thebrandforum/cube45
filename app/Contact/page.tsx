'use client'
import { useState, useEffect } from 'react'
import Footer from '@/components/Footer'
import Navigation from '@/components/Navigation'
import ContactSection from '@/components/ContactSection'
import Image from 'next/image'
import Link from 'next/link'
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
  extra_data: Record<string, unknown> | null
}

export default function ContactPage() {
  const [contents, setContents] = useState<PageContent[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchContents()
  }, [])
  
  const fetchContents = async () => {
    try {
      const { data, error } = await supabase
        .from('cube45_page_contents')  // 통합 테이블 사용
        .select('*')
        .eq('page_name', 'contact')
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
  
  const getContent = (section_name: string) => {
    return contents.find(c => c.section_name === section_name)
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
  
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* 네비게이션 */}
      <Navigation />
      
      {/* 메인 콘텐츠 */}
      <div className="pt-20 md:pt-28">
        {/* CUBE 45 헤더 섹션 - 다른 페이지와 동일한 구조 */}
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
                    <Link href="/tour" className="text-black hover:text-gray-700 cursor-pointer">
                      관광정보
                    </Link>
                    <span className="text-black">|</span>
                    <Link href="/Contact" className="text-black hover:text-gray-700 cursor-pointer font-bold">
                      오시는길
                    </Link>	
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Contact 섹션 - 메인 컨텐츠 */}
        <div className="py-10 md:py-20">
          <ContactSection />
        </div>
      </div>
      
      <Footer />
    </div>
  )
}