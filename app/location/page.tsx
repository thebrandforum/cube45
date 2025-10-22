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
  extra_data: Record<string, string | undefined> | null
}

export default function LocationPage() {
  const [contents, setContents] = useState<PageContent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContents()
  }, [])

  const fetchContents = async () => {
    try {
      const { data, error } = await supabase
        .from('cube45_page_contents')
        .select('*')
        .eq('page_name', 'location')
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
  const layoutTextContent = getContent('layout_text')
  const layoutImageContent = getContent('layout_image')

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
                    <Link href="/location" className="text-black hover:text-gray-700 cursor-pointer font-bold">
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

        {/* 배치도 섹션 */}
        <div className="py-10 md:py-20">
          <div className="container mx-auto px-4 md:px-8">
            {/* 모바일 레이아웃 */}
            <div className="flex flex-col md:hidden gap-8">
              <div className="relative">
                <h2 className="text-3xl font-light text-black mb-4 leading-tight">
                  {layoutTextContent?.title?.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < (layoutTextContent?.title?.split('\n').length || 0) - 1 && <br/>}
                    </span>
                  )) || ''}
                </h2>
                <div className="border-t border-gray-300 mt-4 mb-8"></div>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-black mb-4">
                  {layoutTextContent?.subtitle || ''}
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {layoutTextContent?.description?.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < (layoutTextContent?.description?.split('\n').length || 0) - 1 && <br/>}
                    </span>
                  )) || ''}
                </p>
              </div>
            </div>

            {/* 데스크톱 레이아웃 - 원래대로 */}
            <div className="hidden md:flex items-start gap-16">
              {/* 왼쪽 텍스트 */}
              <div className="w-1/3 relative">
                <h2 className="text-5xl font-light text-black mb-4 leading-tight">
                  {layoutTextContent?.title?.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < (layoutTextContent?.title?.split('\n').length || 0) - 1 && <br/>}
                    </span>
                  )) || ''}
                </h2>
                {/* 구분선 - LAYOUT 텍스트 바로 아래, 왼쪽으로 더 연장 */}
                <div className="absolute border-t border-gray-300" 
                     style={{ 
                       left: '-350px',
                       right: '0',
                       bottom: '-50px'
                     }}></div>
              </div>
              
              <div className="w-2/3 mt-16">
                <h3 className="text-xl font-bold text-black mb-6">
                  {layoutTextContent?.subtitle || ''}
                </h3>
                <p className="text-base text-gray-700 leading-relaxed">
                  {layoutTextContent?.description?.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < (layoutTextContent?.description?.split('\n').length || 0) - 1 && <br/>}
                    </span>
                  )) || ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
		  
      {/* 배치도 이미지 */}
      <div className="py-4 md:py-16" style={{ width: '90%', margin: '0 auto' }}>
        {layoutImageContent?.image_url ? (
          <Image 
            src={layoutImageContent.image_url}
            alt="CUBE 45 배치도"
            width={1920}
            height={1080}
            className="w-full h-auto object-contain md:object-cover"
          />
        ) : (
          <div className="w-full h-[400px] bg-gray-200"></div>
        )}
      </div>
      
      <Footer />
    </div>
  )
}