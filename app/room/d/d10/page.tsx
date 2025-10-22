'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

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

export default function C19Page() {
  const pathname = usePathname()
  
  // D10 페이지 전용
  const roomId = 'D10'
  
  // 상태 관리
  const [currentImage, setCurrentImage] = useState(0)
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [contents, setContents] = useState<RoomContent[]>([])
  const [roomData, setRoomData] = useState<Room | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  // 콘텐츠 가져오기 헬퍼 함수
  const getContent = (sectionName: string): RoomContent | undefined => {
    return contents.find(c => c.section_name === sectionName)
  }

  // 이전 이미지로 이동
  const handlePrevImage = () => {
    setCurrentImage((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))
  }

  // 다음 이미지로 이동
  const handleNextImage = () => {
    setCurrentImage((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))
  }

  // 데이터 조회
  useEffect(() => {
    const fetchData = async () => {
      try {
        const upperRoomId = roomId.toUpperCase();
        const zone = upperRoomId[0].toLowerCase();

        // 1. 개별 객실 데이터 조회
        const { data: roomData, error: roomError } = await supabase
          .from('cube45_room_contents')
          .select('*')
          .eq('page_type', 'room')
          .eq('room_id', upperRoomId)
          .order('display_order')

        // 2. zone_default 데이터 조회
        const { data: defaultData, error: defaultError } = await supabase
          .from('cube45_room_contents')
          .select('*')
          .eq('page_type', `zone_default_${zone}`)
          .order('display_order')

        // 3. cube45_rooms 테이블에서 객실 정보 조회
        const { data: room, error: roomFetchError } = await supabase
          .from('cube45_rooms')
          .select('*')
          .eq('id', upperRoomId)
          .single()

        if (roomFetchError) throw roomFetchError
        setRoomData(room)

        // 4. 데이터 병합
        const mergedData: RoomContent[] = [];
        const addedSections = new Set();
        
        // 개별 객실 데이터 추가
        roomData?.forEach(item => {
          mergedData.push(item);
          addedSections.add(item.section_name);
        });
        
        // zone_default 데이터 중 없는 것만 추가
        defaultData?.forEach(item => {
          if (!addedSections.has(item.section_name)) {
            mergedData.push(item);
            addedSections.add(item.section_name);
          }
        });
        
        // display_order로 정렬
        mergedData.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        
        setContents(mergedData);

        // 갤러리 이미지 설정
        const galleryImgs = [];
        for (let i = 1; i <= 5; i++) {
          const galleryContent = mergedData.find(c => c.section_name === `gallery_${i}`);
          if (galleryContent?.image_url) {
            galleryImgs.push(galleryContent.image_url);
          }
        }
        setGalleryImages(galleryImgs.length > 0 ? galleryImgs : ['/images/room/aroom.jpg']);

      } catch (error) {
        console.error('데이터 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">데이터를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  const zone = 'D';

  return (
    <div className="min-h-screen bg-white">
      {/* 네비게이션 */}
      <Navigation />
      
      {/* 메인 콘텐츠 */}
      <div className="pt-28">
        {/* CUBE 45 헤더 섹션 */}
        <div className="relative">
          <div className="h-[300px] md:h-[400px] lg:h-[500px] relative overflow-hidden">
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
          </div>
        </div>
        
        {/* Zone 텍스트 */}
        <div className="flex items-center py-10 md:py-20 bg-gray-50">
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-black max-w-2xl mx-auto md:ml-64 text-center md:text-left">
              <h1 className="text-4xl md:text-6xl lg:text-7xl mb-2 md:mb-4 whitespace-pre-line break-words">{getContent('zone_text')?.content || ''}</h1>	
              <p className="text-xl md:text-2xl lg:text-3xl whitespace-pre-line break-words">{getContent('hashtag')?.content || ''}</p>
            </div>
          </div>
        </div>
		  
        {/* 객실명 텍스트 */}
        <div className="flex items-center bg-gray-50 pb-10 md:pb-0">
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-black max-w-2xl mx-auto md:ml-64 text-center md:text-left">
              <h1 className="text-4xl md:text-6xl lg:text-7xl whitespace-pre-line break-words">{getContent('room_name')?.content || ''}</h1>	
            </div>
          </div>
        </div> 
        
        {/* 이미지 슬라이더 섹션 */}
        <div className="py-10 bg-gray-50">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-5xl mx-auto relative">
              <div className="relative h-[300px] md:h-[400px] lg:h-[450px] overflow-hidden">
                <Image
                  src={galleryImages[currentImage] || "/images/room/aroom.jpg"}
                  alt={`객실 이미지 ${currentImage + 1}`}
                  fill
                  quality={100}
                  className="object-cover"
                  sizes="100vw"
                />
                
                {/* 왼쪽 화살표 버튼 */}
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 md:p-3 transition-all"
                  aria-label="이전 이미지"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* 오른쪽 화살표 버튼 */}
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 md:p-3 transition-all"
                  aria-label="다음 이미지"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* 하단 인디케이터 (점) */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                  {galleryImages.map((_, index) => (
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

        {/* 정보 섹션 */}
        <div className="py-10 md:py-20 bg-gray-50">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-5xl mx-auto">
              {/* 연결된 줄 */}
              <div className="mb-8 md:mb-12">
                <div className="border-t border-gray-400"></div>
              </div>
        
              {/* 기본정보 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 md:mb-16">
                <div>
                  <h3 className="text-lg font-medium mb-4 md:mb-0 text-black">기본정보</h3>
                </div>
                <div className="col-span-1 md:col-span-3 space-y-3">
                  {getContent('basic_type')?.content && (
                    <div className="whitespace-pre-line text-sm md:text-base break-words text-black">객실타입 : {getContent('basic_type')?.content}</div>
                  )}
                  {getContent('basic_room')?.content && (
                    <div className="whitespace-pre-line text-sm md:text-base break-words text-black">객실구성 : {getContent('basic_room')?.content}</div>
                  )}
                  {getContent('basic_size')?.content && (
                    <div className="whitespace-pre-line text-sm md:text-base break-words text-black">객실크기 : {getContent('basic_size')?.content}</div>
                  )}
                  {roomData && (
                    <div className="whitespace-pre-line text-sm md:text-base break-words text-black">기준 / 최대인원 : {roomData.standard_capacity} / {roomData.max_capacity}</div>
                  )}
                  {getContent('basic_pool')?.content && (
                    <div className="whitespace-pre-line text-sm md:text-base break-words text-black">수영장 : {getContent('basic_pool')?.content}</div>
                  )}
                </div>
              </div>
        
              {/* 구분선 */}
              <div className="mb-8 md:mb-12">
                <div className="border-t border-gray-400"></div>
              </div>
        
              {/* 어메니티 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 md:mb-16">
                <div>
                  <h3 className="text-lg font-medium mb-4 md:mb-0 text-black">어메니티</h3>
                </div>
                <div className="col-span-1 md:col-span-3 space-y-3">
                  {getContent('amenity')?.content && (
                    <div className="whitespace-pre-line text-sm md:text-base break-words text-black">{getContent('amenity')?.content}</div>
                  )}
                </div>
              </div>
        
              {/* 이용안내 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 md:mb-16">
                <div>
                  <h3 className="text-lg font-medium mb-4 md:mb-0 text-black">이용안내</h3>
                </div>
                <div className="col-span-1 md:col-span-3 space-y-3">
                  {getContent('guide')?.content && (
                    <div className="text-sm md:text-base text-black">
                      {getContent('guide')?.content?.split('\n').map((line, index) => (
                        <div key={index} className={`${line.startsWith('•') ? 'py-1' : 'pb-2'} break-words`}>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
        
              {/* 동별 바로가기 버튼들 */}
              <div className="flex flex-col items-center gap-8">
                {/* 첫째줄 - D동 바로가기 (가운데) */}
                <div className="flex justify-center">
                  <a href="/room/d" className="block">
                    <button 
                      className="px-10 md:px-16 py-4 md:py-6 rounded-full text-gray-800 hover:opacity-90 transition-opacity text-sm md:text-base"
                      style={{ backgroundColor: '#f5e6d3' }}
                    >
                      <span className="md:hidden">D동<br/>바로가기</span>
                      <span className="hidden md:inline">D동 바로가기</span>
                    </button>
                  </a>
                </div>
                
                {/* 둘째줄 - A,B,C동 바로가기 (3개 그리드) */}
                <div className="grid grid-cols-3 gap-4 md:gap-12">
                  <a href="/room/a" className="block">
                    <button 
                      className="px-6 md:px-16 py-4 md:py-6 rounded-full text-gray-800 hover:opacity-90 transition-opacity text-xs md:text-base"
                      style={{ backgroundColor: '#f5e6d3' }}
                    >
                      <span className="md:hidden">A동<br/>바로가기</span>
                      <span className="hidden md:inline">A동 바로가기</span>
                    </button>
                  </a>	
                  <a href="/room/b" className="block">
                    <button 
                      className="px-6 md:px-16 py-4 md:py-6 rounded-full text-gray-800 hover:opacity-90 transition-opacity text-xs md:text-base"
                      style={{ backgroundColor: '#f5e6d3' }}
                    >
                      <span className="md:hidden">B동<br/>바로가기</span>
                      <span className="hidden md:inline">B동 바로가기</span>
                    </button>
                  </a>		
                  <a href="/room/c" className="block">
                    <button 
                      className="px-6 md:px-16 py-4 md:py-6 rounded-full text-gray-800 hover:opacity-90 transition-opacity text-xs md:text-base"
                      style={{ backgroundColor: '#f5e6d3' }}
                    >
                      <span className="md:hidden">C동<br/>바로가기</span>
                      <span className="hidden md:inline">C동 바로가기</span>
                    </button>
                  </a>	
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  )
}