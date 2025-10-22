'use client'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation as SwiperNavigation, Autoplay, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { useState, useEffect, useRef } from 'react'
import Footer from '@/components/Footer'
import Navigation from '@/components/Navigation'
import OffersSection from '@/components/OffersSection'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ContactSection from '@/components/ContactSection'

// 타입 정의
interface ZoneSummary {
  zone: string
  minArea: number
  maxArea: number
  minCapacity: number
  maxCapacity: number
}

interface SlideData {
  id: number
  image_url: string
  title?: string
  subtitle?: string
}

interface Cube45Data {
  topText: string
  mainTitle: string
  bottomText: string
  imageUrl: string
}

interface VillaImage {
  A: string
  B: string
  C: string
  D: string
}

interface IndoorPoolData {
  title: string
  subtitle: string
  imageUrl: string
}

interface ContactData {
  reservation: {
    phone: string
    description: string
    backgroundImage: string
  }
  onsite: {
    phone: string
    backgroundImage: string
  }
}

export default function Home() {
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [nights, setNights] = useState(1)
  const [isVisible, setIsVisible] = useState(false)
  const cube45Ref = useRef(null)
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)

  // Supabase에서 가져올 데이터 상태
  const [zoneSummaries, setZoneSummaries] = useState<Record<string, ZoneSummary>>({})
  const [sliderData, setSliderData] = useState<SlideData[]>([])
  const [cube45Data, setCube45Data] = useState<Cube45Data>({
    topText: '',
    mainTitle: '',
    bottomText: '',
    imageUrl: ''
  })
  const [villaImages, setVillaImages] = useState<VillaImage>({
    A: '',
    B: '',
    C: '',
    D: ''
  })
  const [indoorPoolData, setIndoorPoolData] = useState<IndoorPoolData>({
    title: '',
    subtitle: '',
    imageUrl: ''
  })
  const [contactData, setContactData] = useState<ContactData>({
    reservation: {
      phone: '',
      description: '',
      backgroundImage: ''
    },
    onsite: {
      phone: '',
      backgroundImage: ''
    }
  })
  const [loading, setLoading] = useState(true)

  // 모든 데이터 가져오기
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // 1. 모든 main_contents 데이터 한번에 가져오기
        const { data: mainContents, error: mainError } = await supabase
          .from('cube45_main_contents')
          .select('*')
          .eq('is_active', true)

        if (mainError) throw mainError

        // 2. 슬라이더 데이터
        const sliders = mainContents?.filter(item => item.section_type === 'slider')
          .sort((a, b) => a.display_order - b.display_order)
          .map(slide => ({
            id: slide.id,
            image_url: slide.image_url,
            title: slide.title,
            subtitle: slide.subtitle
          })) || []

        // 슬라이드 복제 (루프 효과)
        const duplicatedSlides = [...sliders, ...sliders.map(slide => ({
          ...slide,
          id: slide.id + 1000
        }))]
        setSliderData(duplicatedSlides)

        // 3. CUBE 45 섹션
        const cube45Content = mainContents?.find(item => item.section_type === 'cube45')
        if (cube45Content) {
          setCube45Data({
            topText: cube45Content.subtitle || '',
            mainTitle: cube45Content.title || '',
            bottomText: cube45Content.description || '',
            imageUrl: cube45Content.image_url || ''
          })
        }

        // 4. 풀빌라 이미지
        const villaA = mainContents?.find(item => item.section_type === 'villa_A')
        const villaB = mainContents?.find(item => item.section_type === 'villa_B')
        const villaC = mainContents?.find(item => item.section_type === 'villa_C')
        const villaD = mainContents?.find(item => item.section_type === 'villa_D')
        
        setVillaImages({
          A: villaA?.image_url || '',
          B: villaB?.image_url || '',
          C: villaC?.image_url || '',
          D: villaD?.image_url || ''
        })

        // 5. INDOOR POOL
        const indoorPool = mainContents?.find(item => item.section_type === 'indoor_pool')
        if (indoorPool) {
          setIndoorPoolData({
            title: indoorPool.title || '',
            subtitle: indoorPool.subtitle || '',
            imageUrl: indoorPool.image_url || ''
          })
        }

        // 6. 문의 정보
        const contactReservation = mainContents?.find(item => item.section_type === 'contact_reservation')
        const contactOnsite = mainContents?.find(item => item.section_type === 'contact_onsite')
        
        if (contactReservation || contactOnsite) {
          setContactData({
            reservation: {
              phone: contactReservation?.title || '',
              description: contactReservation?.description || '',
              backgroundImage: contactReservation?.image_url || ''
            },
            onsite: {
              phone: contactOnsite?.title || '',
              backgroundImage: contactOnsite?.image_url || ''
            }
          })
        }

        // 7. 동별 정보 가져오기
        const { data: rooms, error: roomsError } = await supabase
          .from('cube45_rooms')
          .select('zone, area, standard_capacity, max_capacity')

        if (roomsError) throw roomsError

        // 동별로 그룹화하고 min/max 계산
        const summaries: Record<string, ZoneSummary> = {}
        
        rooms?.forEach(room => {
          const area = parseInt(room.area.replace('평', ''))
          const standardCap = parseInt(room.standard_capacity.replace('명', ''))
          const maxCap = parseInt(room.max_capacity.replace('명', ''))

          if (!summaries[room.zone]) {
            summaries[room.zone] = {
              zone: room.zone,
              minArea: area,
              maxArea: area,
              minCapacity: standardCap,
              maxCapacity: maxCap
            }
          } else {
            summaries[room.zone].minArea = Math.min(summaries[room.zone].minArea, area)
            summaries[room.zone].maxArea = Math.max(summaries[room.zone].maxArea, area)
            summaries[room.zone].minCapacity = Math.min(summaries[room.zone].minCapacity, standardCap)
            summaries[room.zone].maxCapacity = Math.max(summaries[room.zone].maxCapacity, maxCap)
          }
        })

        setZoneSummaries(summaries)
      } catch (error) {
        console.error('데이터 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [])

  // 박수 계산
  useEffect(() => {
    if (checkIn && checkOut) {
      const start = new Date(checkIn)
      const end = new Date(checkOut)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      setNights(diffDays > 0 ? diffDays : 1)
    }
  }, [checkIn, checkOut])

  // CUBE 45 애니메이션 스크롤 감지
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.1 }
    )

    const currentRef = cube45Ref.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [])

  // 동별 정보 표시 헬퍼 함수
  const getZoneDisplay = (zone: string) => {
    const summary = zoneSummaries[zone]
    if (!summary) return { area: '', capacity: '' }
    
    const area = summary.minArea === summary.maxArea 
      ? `${summary.minArea}평` 
      : `${summary.minArea}~${summary.maxArea}평`
    
    const capacity = `${summary.minCapacity}~${summary.maxCapacity}명`
    
    return { area, capacity }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-lg text-black">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pt-20 md:pt-28">
      {/* 네비게이션 */}
      <Navigation />
      
      {/* 3분할 메인 슬라이더 - 전체 너비 적용 */}
      <div className="w-full">
        <div className="h-[400px] md:h-[600px] relative overflow-hidden mt-8 md:mt-[50px]">
          {sliderData.length > 0 ? (
            <Swiper
              modules={[SwiperNavigation, Autoplay]}
              spaceBetween={0}
              slidesPerView={2}
              centeredSlides={true}
              navigation={{
                nextEl: '.swiper-button-next-custom',
                prevEl: '.swiper-button-prev-custom',
              }}
              autoplay={{ 
                delay: 5000, 
                disableOnInteraction: false 
              }}
              loop={true}
              watchSlidesProgress={true}
              breakpoints={{
                640: {
                  slidesPerView: 2,
                  spaceBetween: 0,
                },
                768: {
                  slidesPerView: 2,
                  spaceBetween: 0,
                },
                1024: {
                  slidesPerView: 2,
                  spaceBetween: 0,
                },
                1280: {
                  slidesPerView: 2,
                  spaceBetween: 0,
                },
              }}
              className="h-full"
            >
              {sliderData.map((slide) => (
                <SwiperSlide key={slide.id}>
                  <div className="relative w-full h-full">
                    <img 
                      src={slide.image_url} 
                      alt={slide.title || `Slide ${slide.id}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 text-white">
                      {slide.title && <h3 className="text-xl md:text-3xl font-bold mb-1 md:mb-2">{slide.title}</h3>}
                      {slide.subtitle && <p className="text-sm md:text-lg">{slide.subtitle}</p>}
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-black">슬라이더 이미지가 없습니다.</p>
            </div>
          )}

          {/* 커스텀 네비게이션 버튼 */}
          <button className="swiper-button-prev-custom absolute left-4 md:left-10 top-1/2 -translate-y-1/2 z-10 bg-white/20 backdrop-blur-sm text-white p-2 md:p-4 rounded-full hover:bg-white/30 transition-colors">
            <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button className="swiper-button-next-custom absolute right-4 md:right-10 top-1/2 -translate-y-1/2 z-10 bg-white/20 backdrop-blur-sm text-white p-2 md:p-4 rounded-full hover:bg-white/30 transition-colors">
            <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

    

      {/* POOL VILLA 섹션 */}
      <main className="container mx-auto px-4 py-8 md:py-16">
        <h2 className="text-2xl md:text-4xl font-bold text-center text-black mb-6 md:mb-12">POOL VILLA</h2>
        
        {/* 모바일: 슬라이더 */}
        <div className="md:hidden relative">
          <Swiper
            modules={[Pagination]}
            spaceBetween={10}
            slidesPerView={2}
            pagination={{ clickable: true }}
            loop={true}
            className="pool-villa-swiper"
          >
            <SwiperSlide>
              <div className="bg-white overflow-hidden cursor-pointer">
                <div className="h-32 overflow-hidden">
                  {villaImages.A && (
                    <img 
                      src={villaImages.A}
                      alt="풀빌라 A동"
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                    />
                  )}
                </div>
                <div className="p-2">
                  <h3 className="text-xs font-semibold text-black mb-2">풀빌라 A동</h3>
                </div>
                <div className="border-t border-gray-300 pt-2 px-2 pb-2">
                  <div className="flex gap-4 justify-center">
                    <div className="text-center">
                      <span className="inline-block bg-gray-100 px-2 py-1 rounded text-sm font-medium text-gray-600">크기</span>
                      <p className="font-bold text-sm text-gray-800 mt-1">{getZoneDisplay('A').area}</p>
                    </div>
                    <div className="text-center">
                      <span className="inline-block bg-gray-100 px-2 py-1 rounded text-sm font-medium text-gray-600">인원</span>
                      <p className="font-bold text-sm text-gray-800 mt-1">{getZoneDisplay('A').capacity}</p>
                    </div>
                  </div>
                </div>
              </div>
            </SwiperSlide>

            <SwiperSlide>
              <div className="bg-white overflow-hidden cursor-pointer">
                <div className="h-32 overflow-hidden">
                  {villaImages.B && (
                    <img 
                      src={villaImages.B}
                      alt="풀빌라 B동"
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                    />
                  )}
                </div>
                <div className="p-2">
                  <h3 className="text-xs font-semibold text-black mb-2">풀빌라 B동</h3>
                </div>
                <div className="border-t border-gray-300 pt-2 px-2 pb-2">
                  <div className="flex gap-4 justify-center">
                    <div className="text-center">
                      <span className="inline-block bg-gray-100 px-2 py-1 rounded text-sm font-medium text-gray-600">크기</span>
                      <p className="font-bold text-sm text-gray-800 mt-1">{getZoneDisplay('B').area}</p>
                    </div>
                    <div className="text-center">
                      <span className="inline-block bg-gray-100 px-2 py-1 rounded text-sm font-medium text-gray-600">인원</span>
                      <p className="font-bold text-sm text-gray-800 mt-1">{getZoneDisplay('B').capacity}</p>
                    </div>
                  </div>
                </div>
              </div>
            </SwiperSlide>

            <SwiperSlide>
              <div className="bg-white overflow-hidden cursor-pointer">
                <div className="h-32 overflow-hidden">
                  {villaImages.C && (
                    <img 
                      src={villaImages.C}
                      alt="풀빌라 C동"
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                    />
                  )}
                </div>
                <div className="p-2">
                  <h3 className="text-xs font-semibold text-black mb-2">풀빌라 C동</h3>
                </div>
                <div className="border-t border-gray-300 pt-2 px-2 pb-2">
                  <div className="flex gap-4 justify-center">
                    <div className="text-center">
                      <span className="inline-block bg-gray-100 px-2 py-1 rounded text-sm font-medium text-gray-600">크기</span>
                      <p className="font-bold text-sm text-gray-800 mt-1">{getZoneDisplay('C').area}</p>
                    </div>
                    <div className="text-center">
                      <span className="inline-block bg-gray-100 px-2 py-1 rounded text-sm font-medium text-gray-600">인원</span>
                      <p className="font-bold text-sm text-gray-800 mt-1">{getZoneDisplay('C').capacity}</p>
                    </div>
                  </div>
                </div>
              </div>
            </SwiperSlide>

            <SwiperSlide>
              <div className="bg-white overflow-hidden cursor-pointer">
                <div className="h-32 overflow-hidden">
                  {villaImages.D && (
                    <img 
                      src={villaImages.D}
                      alt="풀빌라 D동"
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                    />
                  )}
                </div>
                <div className="p-2">
                  <h3 className="text-xs font-semibold text-black mb-2">풀빌라 D동</h3>
                </div>
                <div className="border-t border-gray-300 pt-2 px-2 pb-2">
                  <div className="flex gap-4 justify-center">
                    <div className="text-center">
                      <span className="inline-block bg-gray-100 px-2 py-1 rounded text-sm font-medium text-gray-600">크기</span>
                      <p className="font-bold text-sm text-gray-800 mt-1">{getZoneDisplay('D').area}</p>
                    </div>
                    <div className="text-center">
                      <span className="inline-block bg-gray-100 px-2 py-1 rounded text-sm font-medium text-gray-600">인원</span>
                      <p className="font-bold text-sm text-gray-800 mt-1">{getZoneDisplay('D').capacity}</p>
                    </div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          </Swiper>

          {/* 모바일 화살표 */}
          <button 
            onClick={() => {
              const swiperElement = document.querySelector('.pool-villa-swiper') as HTMLElement & { swiper: { slidePrev: () => void } }
              if (swiperElement?.swiper) {
                swiperElement.swiper.slidePrev()
              }
            }}
            className="absolute left-0 top-[35%] -translate-y-1/2 z-10 bg-white/80 text-gray-800 p-1.5 rounded-full shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            onClick={() => {
              const swiperElement = document.querySelector('.pool-villa-swiper') as HTMLElement & { swiper: { slideNext: () => void } }
              if (swiperElement?.swiper) {
                swiperElement.swiper.slideNext()
              }
            }}
            className="absolute right-0 top-[35%] -translate-y-1/2 z-10 bg-white/80 text-gray-800 p-1.5 rounded-full shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 데스크탑: 기존 그리드 레이아웃 */}
        <div className="hidden md:flex gap-2 md:gap-4">
          <div className="bg-white overflow-hidden cursor-pointer flex-1">
            <div className="h-32 sm:h-48 md:h-80 overflow-hidden">
              {villaImages.A && (
                <img 
                  src={villaImages.A}
                  alt="풀빌라 A동"
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                />
              )}
            </div>
            <div className="p-2 md:p-4">
              <h3 className="text-xs sm:text-sm md:text-xl font-semibold text-black mb-2 md:mb-4">풀빌라 A동</h3>
            </div>
          </div>

          <div className="bg-white overflow-hidden cursor-pointer flex-1">
            <div className="h-32 sm:h-48 md:h-80 overflow-hidden">
              {villaImages.B && (
                <img 
                  src={villaImages.B}
                  alt="풀빌라 B동"
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                />
              )}
            </div>
            <div className="p-2 md:p-4">
              <h3 className="text-xs sm:text-sm md:text-xl font-semibold text-black mb-2 md:mb-4">풀빌라 B동</h3>
            </div>
          </div>

          <div className="bg-white overflow-hidden cursor-pointer flex-1">
            <div className="h-32 sm:h-48 md:h-80 overflow-hidden">
              {villaImages.C && (
                <img 
                  src={villaImages.C}
                  alt="풀빌라 C동"
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                />
              )}
            </div>
            <div className="p-2 md:p-4">
              <h3 className="text-xs sm:text-sm md:text-xl font-semibold text-black mb-2 md:mb-4">풀빌라 C동</h3>
            </div>
          </div>

          <div className="bg-white overflow-hidden cursor-pointer flex-1">
            <div className="h-32 sm:h-48 md:h-80 overflow-hidden">
              {villaImages.D && (
                <img 
                  src={villaImages.D}
                  alt="풀빌라 D동"
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                />
              )}
            </div>
            <div className="p-2 md:p-4">
              <h3 className="text-xs sm:text-sm md:text-xl font-semibold text-black mb-2 md:mb-4">풀빌라 D동</h3>
            </div>
          </div>
        </div>
        
        {/* 데스크탑에서만 표시되는 구분선과 정보 영역 */}
        <div className="hidden md:block">
          <div className="border-t border-gray-300"></div>
          
          <div className="flex gap-2 md:gap-4">
            <div className="pt-2 md:pt-4 px-2 md:px-4 flex-1">
              <div className="hidden sm:flex items-center">
                <div className="flex-1 text-center">
                  <span className="inline-block bg-gray-100 px-4 py-2 rounded text-base font-medium text-gray-600 mb-2">크기</span>
                  <p className="font-bold text-xl text-gray-800">{getZoneDisplay('A').area}</p>
                </div>
                <div className="flex-1 text-center">
                  <span className="inline-block bg-gray-100 px-4 py-2 rounded text-base font-medium text-gray-600 mb-2">인원</span>
                  <p className="font-bold text-xl text-gray-800">{getZoneDisplay('A').capacity}</p>
                </div>
              </div>
            </div>

            <div className="border-l border-gray-300 my-2 md:my-4"></div>

            <div className="pt-2 md:pt-4 px-2 md:px-4 flex-1">
              <div className="hidden sm:flex items-center">
                <div className="flex-1 text-center">
                  <span className="inline-block bg-gray-100 px-4 py-2 rounded text-base font-medium text-gray-600 mb-2">크기</span>
                  <p className="font-bold text-xl text-gray-800">{getZoneDisplay('B').area}</p>
                </div>
                <div className="flex-1 text-center">
                  <span className="inline-block bg-gray-100 px-4 py-2 rounded text-base font-medium text-gray-600 mb-2">인원</span>
                  <p className="font-bold text-xl text-gray-800">{getZoneDisplay('B').capacity}</p>
                </div>
              </div>
            </div>

            <div className="border-l border-gray-300 my-2 md:my-4"></div>

            <div className="pt-2 md:pt-4 px-2 md:px-4 flex-1">
              <div className="hidden sm:flex items-center">
                <div className="flex-1 text-center">
                  <span className="inline-block bg-gray-100 px-4 py-2 rounded text-base font-medium text-gray-600 mb-2">크기</span>
                  <p className="font-bold text-xl text-gray-800">{getZoneDisplay('C').area}</p>
                </div>
                <div className="flex-1 text-center">
                  <span className="inline-block bg-gray-100 px-4 py-2 rounded text-base font-medium text-gray-600 mb-2">인원</span>
                  <p className="font-bold text-xl text-gray-800">{getZoneDisplay('C').capacity}</p>
                </div>
              </div>
            </div>

            <div className="border-l border-gray-300 my-2 md:my-4"></div>

            <div className="pt-2 md:pt-4 px-2 md:px-4 flex-1">
              <div className="hidden sm:flex items-center">
                <div className="flex-1 text-center">
                  <span className="inline-block bg-gray-100 px-4 py-2 rounded text-base font-medium text-gray-600 mb-2">크기</span>
                  <p className="font-bold text-xl text-gray-800">{getZoneDisplay('D').area}</p>
                </div>
                <div className="flex-1 text-center">
                  <span className="inline-block bg-gray-100 px-4 py-2 rounded text-base font-medium text-gray-600 mb-2">인원</span>
                  <p className="font-bold text-xl text-gray-800">{getZoneDisplay('D').capacity}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Exclusive Cube 섹션 */}
        <div ref={cube45Ref} className="mt-10 md:mt-20 relative h-[300px] md:h-[400px]">
          {cube45Data.imageUrl && (
            <img 
              src={cube45Data.imageUrl}
              alt="CUBE 45 Pool"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0">
            <div className="h-full flex items-center">
              <div className="container mx-auto px-4">
                <div className="text-right text-white" style={{ marginRight: '20px' }}>
                  <p className={`mb-1 md:mb-2 whitespace-pre-line ${isVisible ? 'animate-fade-up' : ''} text-base sm:text-xl md:text-[2rem]`} 
                    style={{ 
                      textShadow: '2px 2px 4px rgba(0,0,0,1)',
                      color: 'white',
                    }}>{cube45Data.topText}</p>
                  <h2 className={`font-bold mb-3 md:mb-6 whitespace-pre-line ${isVisible ? 'animate-fade-up-delay-1' : ''} text-2xl sm:text-3xl md:text-[5rem]`} 
                    style={{ 
                      textShadow: '2px 2px 3px rgba(0,0,0,0.8)',
                    }}>{cube45Data.mainTitle}</h2>
                  <p className={`whitespace-pre-line ${isVisible ? 'animate-fade-up-delay-2' : ''} text-base sm:text-xl md:text-[2rem]`} 
                    style={{ 
                      textShadow: '2px 2px 4px rgba(0,0,0,1)',
                      color: 'white',
                    }}>{cube45Data.bottomText}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* OFFERS 섹션 */}
        <OffersSection />

        {/* INDOOR POOL 섹션 */}
        <div className="pt-8 md:pt-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-black mb-6 md:mb-12">INDOOR POOL</h2>
          <div className="flex">
            <div className="w-1/3 flex items-center justify-center" style={{ backgroundColor: '#f5e6d3' }}>
              <div className="p-4 md:p-8">
                <h3 className="text-xs md:text-2xl font-semibold text-black mb-1 md:mb-2 whitespace-pre-line">{indoorPoolData.title}</h3>
                <div className="text-[10px] md:text-base text-gray-600 mb-2 md:mb-4 whitespace-pre-line">
                  {indoorPoolData.subtitle}
                </div>
                <Link href="/reservation">
                  <button className="border border-gray-800 text-gray-800 px-2 md:px-6 py-1 md:py-2 text-[10px] md:text-base rounded-md hover:bg-gray-100 transition-colors">
                    예약하기
                  </button>
                </Link>
              </div>
            </div>
            <div className="w-2/3">
              {indoorPoolData.imageUrl && (
                <img 
                  src={indoorPoolData.imageUrl}
                  alt="Indoor Pool"
                  className="w-full h-48 md:h-96 object-cover"
                />
              )}
            </div>
          </div>
        </div>

        {/* Contact 섹션 */}
        <ContactSection />
      </main>
      
      {/* 예약문의/현장문의 섹션 */}
      <div className="flex">
        <div className="w-1/2 relative h-64 md:h-96 bg-cover bg-center" style={{ backgroundImage: contactData.reservation.backgroundImage ? `url(${contactData.reservation.backgroundImage})` : 'none' }}>
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative z-10 p-4 md:p-12 text-white h-full">
            <div className="h-[30px] md:h-[60px]">
              <h3 className="text-xs md:text-2xl pb-1 md:pb-2 border-b border-white">예약문의</h3>
            </div>
            <div className="mt-2 md:mt-6">
              <p className="text-base md:text-4xl font-bold mb-1 md:mb-4">{contactData.reservation.phone}</p>
              <div className="text-[9px] md:text-base whitespace-pre-line">
                {contactData.reservation.description.replace(/\|/g, '\n')}
              </div>
            </div>
          </div>
        </div>
        
        <div className="w-1/2 relative h-64 md:h-96 bg-cover bg-center" style={{ backgroundImage: contactData.onsite.backgroundImage ? `url(${contactData.onsite.backgroundImage})` : 'none' }}>
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative z-10 p-4 md:p-12 text-white h-full">
            <div className="h-[30px] md:h-[60px]">
              <h3 className="text-xs md:text-2xl pb-1 md:pb-2 border-b border-white">현장문의</h3>
            </div>
            <div className="mt-2 md:mt-6">
              <p className="text-base md:text-4xl font-bold">{contactData.onsite.phone}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* 모든 스타일 통합 */}
      <style jsx global>{`
        /* 메인 슬라이더 스타일 */
        .swiper-slide {
          opacity: 0.4;
          transform: scale(0.9);
          transition: all 0.3s ease;
        }
        
        .swiper-slide-active {
          opacity: 1;
          transform: scale(1);
        }
        
        .swiper-slide-prev,
        .swiper-slide-next {
          opacity: 0.6;
          transform: scale(0.95);
        }

        /* POOL VILLA 슬라이더 페이지네이션 */
        .pool-villa-swiper .swiper-pagination {
          position: static;
          margin-top: 16px;
        }
        .pool-villa-swiper .swiper-pagination-bullet {
          background: #7d6f5d;
        }
        .pool-villa-swiper .swiper-pagination-bullet-active {
          background: #3E2B2C;
        }

        /* CUBE 45 애니메이션 */
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-up {
          animation: fadeUp 0.8s ease-out forwards;
        }
        
        .animate-fade-up-delay-1 {
          animation: fadeUp 0.8s ease-out 0.2s forwards;
        }
        
        .animate-fade-up-delay-2 {
          animation: fadeUp 0.8s ease-out 0.4s forwards;
        }
      `}</style>
      
      <Footer />
    </div>
  )
}