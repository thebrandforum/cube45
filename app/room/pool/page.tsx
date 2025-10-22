'use client'
import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

// Room 인터페이스
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

// RoomContent 인터페이스 추가
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

export default function PoolVillaPage() {
  // 전체 객실 데이터 상태
  const [allRooms, setAllRooms] = useState<Room[]>([])
  const [contents, setContents] = useState<RoomContent[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // 콘텐츠 가져오기 헬퍼 함수
  const getContent = (sectionName: string): RoomContent | undefined => {
    return contents.find(c => c.section_name === sectionName)
  }

  // 데이터 조회
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Pool 페이지 콘텐츠 조회
        const { data: contentData, error: contentError } = await supabase
          .from('cube45_room_contents')
          .select('*')
          .eq('page_type', 'pool')
          .order('display_order')

        if (contentError) throw contentError
        setContents(contentData || [])

        // 2. 전체 객실 데이터 조회
        const { data: rooms, error: roomError } = await supabase
          .from('cube45_rooms')
          .select('*')

        if (roomError) throw roomError

        // 동별, 숫자별로 정렬
        const sortedRooms = rooms?.sort((a, b) => {
          // 먼저 동별로 정렬
          if (a.zone !== b.zone) {
            return a.zone.localeCompare(b.zone)
          }
          // 같은 동 내에서 숫자로 정렬
          const numA = parseInt(a.id.replace(/[A-Z]/g, ''))
          const numB = parseInt(b.id.replace(/[A-Z]/g, ''))
          return numA - numB
        }) || []

        setAllRooms(sortedRooms)
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
      <div className="pt-20 md:pt-28 bg-gray-50">
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
              <div className="container mx-auto px-6 md:px-8">
                <div className="flex items-center justify-center py-4 md:py-5">
                  <div className="flex items-center space-x-3 md:space-x-10 text-base md:text-xl">
                    <Link href="/room/pool" className="text-black hover:text-gray-700 cursor-pointer font-bold">
                      풀빌라옵션
                    </Link>
                    <span className="text-black">|</span>
                    <Link href="/room/a" className="text-black hover:text-gray-700 cursor-pointer">
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

        {/* 배치도 섹션 */}
        <div className="py-10 md:py-20">
          <div className="container mx-auto px-4 md:px-8">
            {/* 모바일 레이아웃 */}
            <div className="flex flex-col md:hidden gap-8">
              <div className="relative">
                <h2 className="text-3xl font-light mb-4 leading-tight whitespace-pre-wrap break-words text-black">
                  {getContent('title')?.content || 'Pool Villa Overview'}
                </h2>
                <div className="border-t border-gray-300 mt-4 mb-8"></div>
              </div>
              
              <div>
                <h3 className="text-lg font-bold mb-4 whitespace-pre-wrap break-words text-black">
                  {getContent('subtitle')?.content || '나에게 맞는 풀빌라, 바로 여기 CUBE 45 에서'}
                </h3>
                <p className="text-sm text-black leading-relaxed whitespace-pre-wrap break-words">
                  {getContent('description')?.content || 
                  `프라이빗한 휴식부터 단체로 함께 즐기는 공간까지,
CUBE 45 모든 객실의 상세 정보를 한눈에 확인하고 특별한 경험을 선택하세요`}
                </p>
              </div>
            </div>

            {/* 데스크톱 레이아웃 - 원래대로 */}
            <div className="hidden md:flex items-start gap-16">
              {/* 왼쪽 텍스트 - DB에서 가져온 제목 사용 */}
              <div className="w-1/3 relative">
                <h2 className="text-5xl font-light mb-4 leading-tight text-black">
                  {getContent('title')?.content || 'Pool Villa Overview'}
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
                <h3 className="text-xl font-bold mb-6 text-black">
                  {getContent('subtitle')?.content || '나에게 맞는 풀빌라, 바로 여기 CUBE 45 에서'}
                </h3>
                <p className="text-base text-black leading-relaxed whitespace-pre-line">
                  {getContent('description')?.content || 
                  `프라이빗한 휴식부터 단체로 함께 즐기는 공간까지,
CUBE 45 모든 객실의 상세 정보를 한눈에 확인하고 특별한 경험을 선택하세요`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 전체 객실 정보표 */}
        <div className="py-8 md:py-16 bg-white">
          <div className="container mx-auto px-2 md:px-8">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-xl md:text-3xl font-light mb-4 md:mb-8 text-center text-black">전체 객실 정보</h2>
              <div className="overflow-x-auto">
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
                    {allRooms.map((room) => (
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
            </div>
          </div>
        </div>
      </div>
		  
      <Footer />
    </div>
  )
}