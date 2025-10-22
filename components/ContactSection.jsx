'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ContactSection() {
  const [contactData, setContactData] = useState({})
  
  // DB에서 데이터 가져오기
  useEffect(() => {
    fetchContactData()
  }, [])
  
  const fetchContactData = async () => {
    try {
      const { data, error } = await supabase
        .from('cube45_page_contents')
        .select('*')
        .eq('page_name', 'contact')
        .eq('is_active', true)
      
      if (error) throw error
      
      const dataMap = {}
      data?.forEach(item => {
        dataMap[item.section_name] = item
      })
      setContactData(dataMap)
    } catch (error) {
      console.error('Contact 데이터 로드 실패:', error)
    }
  }
  
  // DB 데이터 기반으로 링크 열기
  const openKakaoMap = () => {
    const kakaoLink = contactData.kakao_link?.extra_data?.link || 'https://map.kakao.com/link/map/CUBE45,37.597520,127.537014'
    window.open(kakaoLink, '_blank')
  }
  
  const openNaverMap = () => {
    const naverLink = contactData.naver_link?.extra_data?.link || 'https://map.naver.com/v5/search/경기도 가평군 설악면 국수터길 13-1'
    window.open(naverLink, '_blank')
  }
  
  return (
    <div className="py-16 bg-white">
      <h2 className="text-3xl font-bold text-center text-black mb-12">
        {contactData.banner?.title || 'CONTACT US'}
      </h2>
      
      <div className="container mx-auto px-4 flex flex-col md:flex-row gap-6 md:gap-10">
        {/* 왼쪽 정보 영역 */}
        <div className="w-full md:w-[45%] bg-white">
          <img 
            src={contactData.left_image?.image_url || '/images/main/contact.jpg'}
            alt="CUBE45 x LX22 Contact Information"
            className="w-full object-contain"
          />
          
          <div className="flex justify-center md:justify-start gap-4 pt-6 pb-4 bg-white mt-2">
            <button 
              onClick={openKakaoMap}
              className="bg-[#0084FF] text-white px-4 py-2 md:px-6 md:py-3 text-xs md:text-base font-semibold hover:bg-[#0074E4] transition-all hover:shadow-lg rounded-full flex items-center gap-1 md:gap-2"
            >
              <svg className="w-3 h-3 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 384 512">
                <path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z"/>
              </svg>
              {contactData.kakao_link?.title || '카카오맵 바로가기'}
            </button>
            <button 
              onClick={openNaverMap}
              className="bg-[#03C75A] text-white px-4 py-2 md:px-6 md:py-3 text-xs md:text-base font-semibold hover:bg-[#02B350] transition-all hover:shadow-lg rounded-full flex items-center gap-1 md:gap-2"
            >
              <svg className="w-3 h-3 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 384 512">
                <path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z"/>
              </svg>
              {contactData.naver_link?.title || '네이버지도 바로가기'}
            </button>
          </div>
        </div>
        
        {/* 오른쪽 지도 영역 - 이미지만 표시 */}
        <div className="w-full md:w-[55%] h-[350px] md:h-[500px]">
          {contactData.map_image?.image_url ? (
            <img 
              src={contactData.map_image.image_url}
              alt="지도"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400">지도 이미지를 업로드해주세요</span>
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        @media (max-width: 768px) {
          button {
            padding: 8px 16px;
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  )
}