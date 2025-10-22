'use client'
import { useState, useEffect } from 'react'
import Footer from '@/components/Footer'
import Navigation from '@/components/Navigation'
import OffersSection from '@/components/OffersSection'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface BannerData {
  id: number
  page_name: string
  section_name: string
  content_type: string
  title: string
  subtitle: string
  description: string
  image_url: string
  display_order: number
  is_active: boolean
  extra_data: Record<string, unknown> | null
}

export default function ReservationGuidePage() {
  const [bannerData, setBannerData] = useState<BannerData | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchBanner()
  }, [])
  
  const fetchBanner = async () => {
    try {
      const { data, error } = await supabase
        .from('cube45_various_contents')
        .select('*')
        .eq('page_name', 'special')
        .eq('is_active', true)
        .order('display_order')
      
      if (error) throw error
      
      // 배너 데이터 찾기
      const banner = data?.find(item => item.content_type === 'banner') || null
      setBannerData(banner)
    } catch (error) {
      console.error('배너 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-white">
      {/* 네비게이션 */}
      <Navigation />
      
      {/* 메인 콘텐츠 */}
      <div className="pt-20 md:pt-28">
        {/* 배너 섹션 - 반응형 높이만 추가 */}
        {!loading && bannerData && bannerData.image_url && (
          <div className="relative h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden">
            <Image
              src={bannerData.image_url}
              alt="Special Offers Banner"
              fill
              priority
              quality={100}
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent"></div>
          </div>
        )}
        
        {/* 로딩 중 배너 플레이스홀더 */}
        {loading && (
          <div className="h-[300px] md:h-[400px] lg:h-[500px] bg-gray-100 animate-pulse"></div>
        )}
        
        {/* OFFERS 섹션 - 컴포넌트로 대체 */}
        <OffersSection />
      </div>
      
      <Footer />
    </div>
  )
}