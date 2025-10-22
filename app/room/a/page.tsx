'use client'
import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

// 인터페이스 정의
interface Room {
  id: string
  name: string
  zone: string
  type: string
  pool: string
  rooms: string | number
  bathrooms: string | number
  standard_capacity: string | number
  max_capacity: string | number
  area: string | number
  pet_friendly: string
  current_price: number
  fireplace: string
}

interface Summary {
  zone: string
  areaRange: string | number
  standardCapacityRange: string | number
  maxCapacityRange: string | number
  roomCount: number
}

interface RoomContent {
  id: number
  page_type: string
  room_id: string | null
  section_name: string
  content: string | null
  image_url: string | null
  display_order: number
  is_active: boolean
}

export default function AZonePage() {
  // 상태 관리
  const [currentImage, setCurrentImage] = useState(0)
  const [sliderImages, setSliderImages] = useState<string[]>([])
  const [aRooms, setARooms] = useState<Room[]>([])
  const [aSummary, setASummary] = useState<Summary | null>(null)
  const [contents, setContents] = useState<RoomContent[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // 콘텐츠 가져오기 헬퍼 함수
  const getContent = (sectionName: string): RoomContent | undefined => {
    return contents.find(c => c.section_name === sectionName)
  }

  // 이전 이미지로 이동
  const handlePrevImage = () => {
    setCurrentImage((prev) => (prev === 0 ? sliderImages.length - 1 : prev - 1))
  }
  
  // 다음 이미지로 이동
  const handleNextImage = () => {
    setCurrentImage((prev) => (prev === sliderImages.length - 1 ? 0 : prev + 1))
  }
  
  // 자동 슬라이드 효과 추가
  useEffect(() => {
    if (sliderImages.length > 1) {
      const interval = setInterval(() => {
        handleNextImage()
      }, 2000) // 2초마다 실행
  
      return () => clearInterval(interval) // 컴포넌트 언마운트 시 인터벌 정리
    }
  }, [currentImage, sliderImages.length]) // dependencies 추가

  // 데이터 조회
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. A동 콘텐츠 조회
        const { data: contentData, error: contentError } = await supabase
          .from('cube45_room_contents')
          .select('*')
          .eq('page_type', 'zone_a')
          .order('display_order')

        if (contentError) throw contentError
        setContents(contentData || [])

        // 슬라이더 이미지 설정
        const sliderImgs = []
        for (let i = 1; i <= 5; i++) {
          const sliderContent = contentData?.find(c => c.section_name === `slider_${i}`)
          if (sliderContent?.image_url) {
            sliderImgs.push(sliderContent.image_url)
          }
        }
        setSliderImages(sliderImgs.length > 0 ? sliderImgs : ['/images/room/aroom.jpg'])

        // 2. A동 객실 데이터 조회
        const { data: rooms, error: roomError } = await supabase
          .from('cube45_rooms')
          .select('*')
          .eq('zone', 'A')

        if (roomError) throw roomError

        // 숫자 기준으로 정렬
        const sortedRooms = rooms?.sort((a, b) => {
          const numA = parseInt(a.id.replace('A', ''))
          const numB = parseInt(b.id.replace('A', ''))
          return numA - numB
        }) || []

        setARooms(sortedRooms)

        // 요약 정보 계산
        if (rooms && rooms.length > 0) {
          const areas = [...new Set(rooms.map(room => room.area))].sort()
          const standardCapacities = [...new Set(rooms.map(room => room.standard_capacity))]
            .sort((a, b) => parseInt(a) - parseInt(b))
          const maxCapacities = [...new Set(rooms.map(room => room.max_capacity))]
            .sort((a, b) => parseInt(a) - parseInt(b))

          setASummary({
            zone: 'A',
            areaRange: areas.length === 1 ? areas[0] : `${areas[0]} ~ ${areas[areas.length - 1]}`,
            standardCapacityRange: standardCapacities.length === 1 ? standardCapacities[0] : `${standardCapacities[0]} ~ ${standardCapacities[standardCapacities.length - 1]}`,
            maxCapacityRange: maxCapacities.length === 1 ? maxCapacities[0] : `${maxCapacities[0]} ~ ${maxCapacities[maxCapacities.length - 1]}`,
            roomCount: rooms.length
          })
        }
      } catch (error) {
        console.error('데이터 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-black">데이터를 불러오는 중...</div>
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
        {/* CUBE 45 헤더 섹션 */}
        <div className="relative">
          <div className="h-[300px] md:h-[500px] relative overflow-hidden">
            <Image 
              src={getContent('banner')?.image_url || "/images/cube45/background2.jpg"}
              alt="CUBE 45" 
              fill
              priority
              quality={100}
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent"></div>
            
            {/* 하단 정보 바 */}
            <div className="absolute bottom-0 left-0 right-0 backdrop-blur-sm" style={{ backgroundColor: 'rgba(245, 230, 211, 0.6)' }}>
              <div className="container mx-auto px-4 md:px-8">
                <div className="flex items-center justify-center py-3 md:py-4">
                  <div className="flex items-center space-x-2 md:space-x-8 text-base md:text-xl">
                    <Link href="/room/pool" className="text-black hover:text-gray-700 cursor-pointer">
                      풀빌라옵션
                    </Link>
                    <span className="text-black">|</span>
                    <Link href="/room/a" className="text-black hover:text-gray-700 cursor-pointer font-bold">
                      A동
                    </Link>
                    <span className="text-black">|</span>
                    <Link href="/room/b" className="text-black hover:text-gray-700 cursor-pointer">
                      B동
                    </Link>
                    <span className="text-black">|</span>  
                    <Link href="/room/c" className="text-black hover:text-gray-700 cursor-pointer">
                      C동
                    </Link>
                    <span className="text-black">|</span>  
                    <Link href="/room/d" className="text-black hover:text-gray-700 cursor-pointer">
                      D동
                    </Link>  
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 이미지 슬라이더 섹션 */}
        <div className="py-10 md:py-20 bg-gray-50">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-6xl mx-auto relative">
              <div className="relative h-[300px] md:h-[450px] overflow-hidden">
                {sliderImages.map((image, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                      currentImage === index ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <Image
                      src={image || "/images/room/aroom.jpg"}
                      alt={`A동 이미지 ${index + 1}`}
                      fill
                      quality={100}
                      className="object-cover"
                      sizes="100vw"
                    />
                  </div>
                ))}
                              
                {/* 왼쪽 화살표 버튼 */}
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 md:p-3 transition-all"
                  aria-label="이전 이미지"
                >
                  <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* 오른쪽 화살표 버튼 */}
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 md:p-3 transition-all"
                  aria-label="다음 이미지"
                >
                  <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* 하단 인디케이터 (점) */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                  {sliderImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImage(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        currentImage === index ? 'bg-white w-8' : 'bg-white/50'
                      }`}
                      aria-label={`이미지 ${index + 1}로 이동`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* A동 정보 섹션 */}
        <div className="py-10 md:py-20 bg-gray-50">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-6xl mx-auto">
              {/* 헤더 */}
              <div className="mb-8 md:mb-12">
                <p className="text-lg md:text-2xl text-black mb-1 md:mb-2 whitespace-pre-wrap break-words">{getContent('title')?.content || 'CUBE45'}</p>
                <h1 className="text-3xl md:text-6xl font-light mb-2 md:mb-4 whitespace-pre-wrap break-words text-black">{getContent('subtitle')?.content || 'URBAN POOL STAY'}</h1>
                {/* 중간이 끊긴 밑줄 */}
                <div className="flex items-center">
                  <div className="flex-1 border-t border-gray-400"></div>
                  <div className="px-2 md:px-4"></div>
                  <div className="flex-1 border-t border-gray-400"></div>
                </div>
              </div>

              {/* A Zone Overview와 Information - 모바일도 좌우 배치 */}
              <div className="grid grid-cols-2 gap-4 md:gap-16 mb-8 md:mb-16">
                {/* 왼쪽 전체 영역 - A Zone Overview */}
                <div className="grid grid-cols-2 gap-2 md:gap-8">
                  {/* 왼쪽 - 제목 */}
                  <div>
                    <h3 className="text-[11px] md:text-lg font-medium text-black">A Zone</h3>
                    <h3 className="text-[11px] md:text-lg font-medium text-black">Overview</h3>  
                  </div>
                  {/* 오른쪽 - 내용 */}
                  <div className="space-y-1 md:space-y-3 text-[10px] md:text-base">
                    <div>
                      <span className="text-black">객실크기</span><br />
                      <span className="text-black">• {aSummary?.areaRange || '로딩중...'}</span>
                    </div>
                    <div>
                      <span className="text-black">기준인원</span><br />
                      <span className="text-black">• {aSummary?.standardCapacityRange || '로딩중...'}</span>
                    </div>
                    <div>
                      <span className="text-black">최대인원</span><br />
                      <span className="text-black">• {aSummary?.maxCapacityRange || '로딩중...'}</span>
                    </div>
                  </div>
                </div>

                {/* 오른쪽 전체 영역 - Information */}
                <div className="grid grid-cols-2 gap-2 md:gap-8">
                  {/* 왼쪽 - 제목 */}
                  <div>
                    <h3 className="text-[11px] md:text-lg font-medium text-black">Information</h3>
                  </div>
                  {/* 오른쪽 - 내용 */}
                  <div className="space-y-1 md:space-y-3 text-[10px] md:text-base">
                    <div>
                      <span className="text-black">체크인/체크아웃</span><br />
                      <span className="whitespace-pre-wrap break-words text-black">• {getContent('info_checkin')?.content || '체크인 15시/체크아웃 11시'}</span>
                    </div>
                    <div>
                      <span className="text-black">애견동반</span><br />
                      <span className="whitespace-pre-wrap break-words text-black">• {getContent('info_pet')?.content || '불가능'}</span>
                    </div>
                    <div>
                      <span className="text-black">수영장</span><br />
                      <span className="whitespace-pre-wrap break-words text-black">• {getContent('info_pool')?.content || '실내 혹은 야외 수영장'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 객실 정보 표 */}
              <div className="mb-8 md:mb-12 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm font-medium whitespace-nowrap text-black">객실명</th>
                      <th className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm font-medium whitespace-nowrap text-black">객실타입</th>
                      <th className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm font-medium whitespace-nowrap text-black">객실면적</th>
                      <th className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm font-medium whitespace-nowrap text-black">기준인원</th>
                      <th className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm font-medium whitespace-nowrap text-black">최대인원</th>
                      <th className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm font-medium whitespace-nowrap text-black">룸</th>
                      <th className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm font-medium whitespace-nowrap text-black">화장실</th>
                      <th className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm font-medium whitespace-nowrap text-black">벽난로</th>
                      <th className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm font-medium whitespace-nowrap text-black">수영장</th>
                      <th className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm font-medium whitespace-nowrap text-black">애견동반</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aRooms.map((room) => (
                      <tr key={room.id}>
                        <td className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm whitespace-nowrap text-black">{room.name}</td>
                        <td className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm whitespace-nowrap text-black">{room.type}</td>
                        <td className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm whitespace-nowrap text-black">{room.area}</td>
                        <td className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm whitespace-nowrap text-black">{room.standard_capacity}</td>
                        <td className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm whitespace-nowrap text-black">{room.max_capacity}</td>
                        <td className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm whitespace-nowrap text-black">{room.rooms}</td>
                        <td className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm whitespace-nowrap text-black">{room.bathrooms}</td>
                        <td className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm whitespace-nowrap text-black">{room.fireplace}</td>
                        <td className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm whitespace-nowrap text-black">{room.pool}</td>
                        <td className="border border-gray-300 px-1 py-1 md:px-4 md:py-3 text-center text-[8px] md:text-sm whitespace-nowrap text-black">{room.pet_friendly}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 모바일: 객실 선택 버튼들 - 3개씩 배치 */}
              <div className="block md:hidden">
                <div className="grid grid-cols-3 gap-2">
                  {aRooms.map((room) => (
                    <a key={room.id} href={`/room/a/${room.id.toLowerCase()}`} className="block">
                      <button 
                        className="w-full px-2 py-3 rounded-full text-black hover:opacity-90 transition-opacity text-xs"
                        style={{ backgroundColor: '#f5e6d3' }}
                      >
                        {room.name}<br />
                        <span className="text-[10px]">풀빌라 독채</span>
                      </button>
                    </a>
                  ))}
                </div>
              </div>

              {/* 데스크톱: 객실 선택 버튼들 - 원본 배치 유지 */}
              <div className="hidden md:flex flex-col gap-8">
                {/* 첫 번째 줄 - A3, A4, A5, A6 */}
                <div className="flex justify-center gap-12">
                  {aRooms.slice(0, 4).map((room) => (
                    <a key={room.id} href={`/room/a/${room.id.toLowerCase()}`} className="block">
                      <button 
                        className="px-16 py-6 rounded-full text-black hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: '#f5e6d3' }}
                      >
                        {room.name}<br />
                        <span className="text-sm">풀빌라 독채</span>
                      </button>
                    </a>
                  ))}
                </div>
                
                {/* 두 번째 줄 - A7만 (있을 경우) */}
                {aRooms.length > 4 && (
                  <div className="flex justify-start w-full">
                    {aRooms.slice(4).map((room) => (
                      <a key={room.id} href={`/room/a/${room.id.toLowerCase()}`} className="block" style={{ marginLeft: 'calc(50% - 468px)' }}>
                        <button 
                          className="px-16 py-6 rounded-full text-black hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: '#f5e6d3' }}
                        >
                          {room.name}<br />
                          <span className="text-sm">풀빌라 독채</span>
                        </button>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  )
}