'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import AdminNavigation from '@/components/admin/navigation'
import Image from 'next/image'

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
  area: string
  standard_capacity: string
  max_capacity: string
  rooms: string
  bathrooms: string
  fireplace: string
  pool: string
  pet_friendly: string
}

export default function RoomManagePage() {
  const [activeTab, setActiveTab] = useState<string>('pool')
  const [contents, setContents] = useState<RoomContent[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [editedRooms, setEditedRooms] = useState<Room[]>([])
  const [roomsChanged, setRoomsChanged] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [editedContents, setEditedContents] = useState<RoomContent[]>([])
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  const roomsByZone = {
    A: ['A3', 'A4', 'A5', 'A6', 'A7'],
    B: ['B9', 'B10', 'B11', 'B12'],
    C: ['C13', 'C14', 'C15', 'C16', 'C17', 'C18', 'C19', 'C20', 'C21', 'C22', 'C23', 'C24', 'C25'],
    D: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15']
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000)
  }

  const fetchContents = useCallback(async () => {
    setLoading(true)
    try {
      let contentQuery = supabase.from('cube45_room_contents').select('*')
      
      if (activeTab === 'pool') {
        contentQuery = contentQuery.eq('page_type', 'pool')
      } else if (selectedRoom) {
        const zone = selectedRoom[0].toLowerCase()
        
        const { data: roomData } = await supabase
          .from('cube45_room_contents')
          .select('*')
          .eq('page_type', 'room')
          .eq('room_id', selectedRoom)
          .order('display_order')
        
        const { data: defaultData } = await supabase
          .from('cube45_room_contents')
          .select('*')
          .eq('page_type', `zone_default_${zone}`)
          .order('display_order')
        
        const mergedData: RoomContent[] = []
        const addedSections = new Set<string>()
        
        roomData?.forEach(item => {
          mergedData.push(item)
          addedSections.add(item.section_name)
        })
        
        defaultData?.forEach(item => {
          if (!addedSections.has(item.section_name)) {
            mergedData.push(item)
            addedSections.add(item.section_name)
          }
        })
        
        mergedData.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        
        setContents(mergedData)
        setEditedContents(mergedData)
        setLoading(false)
        return
      } else {
        contentQuery = contentQuery.eq('page_type', `zone_${activeTab}`)
      }
      
      const { data: contentData, error: contentError } = await contentQuery.order('display_order')
      if (contentError) throw contentError
      
      setContents(contentData || [])
      setEditedContents(contentData || [])
      
      if (activeTab === 'pool') {
        const { data: roomData, error: roomError } = await supabase
          .from('cube45_rooms')
            .select('*')
          .order('zone, name')
        
        if (roomError) throw roomError
        setRooms(roomData || [])
        setEditedRooms(roomData || [])
        setRoomsChanged(false)
      }
    } catch (error) {
      console.error('데이터 조회 실패:', error)
      showToast('데이터를 불러오는데 실패했습니다.', 'error')
    } finally {
      setLoading(false)
    }
  }, [activeTab, selectedRoom])
  
  useEffect(() => {
    fetchContents()
  }, [fetchContents])

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `room-contents/${fileName}`

      const { error } = await supabase.storage
        .from('cube45-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('cube45-images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      showToast('이미지 업로드에 실패했습니다.', 'error')
      return null
    }
  }

  const handleLocalUpdate = (sectionName: string, field: 'content' | 'image_url', value: string) => {
    setEditedContents(prev => 
      prev.map(content => 
        content.section_name === sectionName 
          ? { ...content, [field]: value }
          : content
      )
    )
  }

  const handleSaveSection = async (sectionNames: string[]) => {
    setSavingSection(sectionNames[0])
    try {
      if (selectedRoom) {
        const zone = selectedRoom[0].toLowerCase()
        const updates = editedContents.filter(content => 
          sectionNames.includes(content.section_name)
        )
        
        const uniqueUpdatesMap = new Map()
        updates.forEach(content => {
          uniqueUpdatesMap.set(content.section_name, content)
        })
        const uniqueUpdates = Array.from(uniqueUpdatesMap.values())
        
        for (const content of uniqueUpdates) {
          if (content.page_type === `zone_default_${zone}`) {
            const { data: existingData } = await supabase
              .from('cube45_room_contents')
              .select('id')
              .eq('page_type', 'room')
              .eq('room_id', selectedRoom)
              .eq('section_name', content.section_name)
              .maybeSingle()
            
            if (existingData) {
              const { error } = await supabase
                .from('cube45_room_contents')
                .update({
                  content: content.content,
                  image_url: content.image_url
                })
                .eq('id', existingData.id)
              
              if (error) throw error
            } else {
              const insertData = {
                page_type: 'room',
                room_id: selectedRoom,
                section_name: content.section_name,
                content: content.content,
                image_url: content.image_url,
                display_order: content.display_order,
                is_active: true
              }
              
              const { error } = await supabase
                .from('cube45_room_contents')
                .insert(insertData)
              
              if (error) throw error
            }
          } else {
            const { error } = await supabase
              .from('cube45_room_contents')
              .update({
                content: content.content,
                image_url: content.image_url
              })
              .eq('id', content.id)
            
            if (error) throw error
          }
        }
      } else {
        const updates = editedContents.filter(content => 
          sectionNames.includes(content.section_name)
        )
        const updatePromises = updates.map(content => 
          supabase
            .from('cube45_room_contents')
            .update({
              content: content.content,
              image_url: content.image_url
            })
            .eq('id', content.id)
        )
        await Promise.all(updatePromises)
      }
      
      showToast('저장되었습니다.', 'success')
      fetchContents()
    } catch (error) {
      console.error('저장 실패:', error)
      showToast('저장에 실패했습니다.', 'error')
    } finally {
      setSavingSection(null)
    }
  }

  const handleImageUpload = async (sectionName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      showToast('파일 크기는 5MB 이하여야 합니다.', 'error')
      return
    }

    const url = await uploadImage(file)
    if (url) {
      handleLocalUpdate(sectionName, 'image_url', url)
    }
  }

  const handleRoomLocalUpdate = (roomId: string, field: string, value: string) => {
    setEditedRooms(prev => 
      prev.map(room => 
        room.id === roomId 
          ? { ...room, [field]: value }
          : room
      )
    )
    setRoomsChanged(true)
  }

  const handleRoomsSave = async () => {
    try {
      const updatePromises = editedRooms.map(room => 
        supabase
          .from('cube45_rooms')
          .update({
            name: room.name,
            type: room.type,
            area: room.area,
            standard_capacity: room.standard_capacity,
            max_capacity: room.max_capacity,
            rooms: room.rooms,
            bathrooms: room.bathrooms,
            fireplace: room.fireplace,
            pool: room.pool,
            pet_friendly: room.pet_friendly
          })
          .eq('id', room.id)
      )

      await Promise.all(updatePromises)
      
      showToast('저장되었습니다.', 'success')
      setRoomsChanged(false)
      fetchContents()
    } catch (error) {
      console.error('저장 실패:', error)
      showToast('저장에 실패했습니다.', 'error')
    }
  }
  
  const handleSingleRoomSave = async (room: Room) => {
    try {
      const { error } = await supabase
        .from('cube45_rooms')
        .update({
          name: room.name,
          type: room.type,
          area: room.area,
          standard_capacity: room.standard_capacity,
          max_capacity: room.max_capacity,
          rooms: room.rooms,
          bathrooms: room.bathrooms,
          fireplace: room.fireplace,
          pool: room.pool,
          pet_friendly: room.pet_friendly
        })
        .eq('id', room.id)
      
      if (error) throw error
      
      showToast(`${room.name} 저장되었습니다.`, 'success')
      fetchContents()
    } catch (error) {
      console.error('저장 실패:', error)
      showToast('저장에 실패했습니다.', 'error')
    }
  }

  const handleAddImage = async (sectionPrefix: string, file?: File) => {
    try {
      const existingNumbers = editedContents
        .filter(c => c.section_name.startsWith(sectionPrefix + '_'))
        .map(c => {
          const parts = c.section_name.split('_');
          return parseInt(parts[parts.length - 1]) || 0;
        })
        .filter(n => n >= 1 && n <= 10);
      
      let newNumber = 0;
      for (let i = 1; i <= 10; i++) {
        if (!existingNumbers.includes(i)) {
          newNumber = i;
          break;
        }
      }
      
      if (newNumber === 0) {
        showToast('최대 10개까지만 추가 가능합니다.', 'error');
        return;
      }
      
      const newSectionName = `${sectionPrefix}_${newNumber}`;
      
      let imageUrl = '/images/room/aroom.jpg';
      if (file) {
        const uploadedUrl = await uploadImage(file);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }
      
      const { data, error } = await supabase
        .from('cube45_room_contents')
        .insert({
          page_type: selectedRoom ? 'room' : `zone_${activeTab}`,
          room_id: selectedRoom,
          section_name: newSectionName,
          content: null,
          image_url: imageUrl,
          display_order: newNumber,
          is_active: true
        })
        .select()
        .single();
      
      if (error) {
        console.error('이미지 추가 실패:', error);
        showToast('이미지 추가에 실패했습니다.', 'error');
        return;
      }
      
      if (data) {
        setEditedContents([...editedContents, data]);
        showToast('이미지가 추가되었습니다.', 'success');
      }
    } catch (error) {
      console.error('이미지 추가 오류:', error);
      showToast('이미지 추가 중 오류가 발생했습니다.', 'error');
    }
  }
  
  const handleAddContent = async (sectionPrefix: string) => {
    try {
      const existingNumbers = editedContents
        .filter(c => c.section_name.startsWith(sectionPrefix + '_'))
        .map(c => {
          const parts = c.section_name.split('_');
          return parseInt(parts[parts.length - 1]) || 0;
        })
        .filter(n => n >= 1 && n <= 10);
      
      let newNumber = 0;
      for (let i = 1; i <= 10; i++) {
        if (!existingNumbers.includes(i)) {
          newNumber = i;
          break;
        }
      }
      
      if (newNumber === 0) {
        showToast('최대 10개까지만 추가 가능합니다.', 'error');
        return;
      }
      
      const newSectionName = `${sectionPrefix}_${newNumber}`;
      
      const { data, error } = await supabase
        .from('cube45_room_contents')
        .insert({
          page_type: selectedRoom ? 'room' : `zone_default_${selectedRoom?.[0].toLowerCase()}`,
          room_id: selectedRoom,
          section_name: newSectionName,
          content: '',
          image_url: null,
          display_order: newNumber + 10,
          is_active: true
        })
        .select()
        .single();
      
      if (error) {
        console.error('항목 추가 실패:', error);
        showToast('항목 추가에 실패했습니다.', 'error');
        return;
      }
      
      if (data) {
        setEditedContents([...editedContents, data]);
        showToast('항목이 추가되었습니다.', 'success');
      }
    } catch (error) {
      console.error('항목 추가 오류:', error);
      showToast('항목 추가 중 오류가 발생했습니다.', 'error');
    }
  }
  
  const handleAddImageWithFile = (sectionPrefix: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          showToast('파일 크기는 5MB 이하여야 합니다.', 'error');
          return;
        }
        await handleAddImage(sectionPrefix, file);
      }
    };
    input.click();
  }

  const handleDeleteImage = async (sectionName: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    
    try {
      const content = editedContents.find(c => c.section_name === sectionName)
      if (content?.id) {
        const { error } = await supabase
          .from('cube45_room_contents')
          .delete()
          .eq('id', content.id)
        
        if (error) throw error
      }
      
      setEditedContents(prev => prev.filter(c => c.section_name !== sectionName))
      showToast('삭제되었습니다.', 'success')
    } catch (error) {
      console.error('삭제 실패:', error)
      showToast('삭제에 실패했습니다.', 'error')
    }
  }

  const getContent = (sectionName: string): RoomContent | undefined => {
    return editedContents.find(c => c.section_name === sectionName)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminNavigation />
      
      <main className="flex-1 mt-14 md:mt-0 md:ml-48">
        {/* 토스트 메시지 */}
        {toast.show && (
          <div className={`fixed top-4 right-4 z-50 px-3 md:px-6 py-2 md:py-3 rounded-lg shadow-lg transition-all transform ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white text-xs md:text-base`}>
            {toast.message}
          </div>
        )}

        {/* 헤더 */}
        <div className="bg-white border-b px-3 md:px-8 py-3 md:py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-base md:text-2xl font-bold text-gray-900">객실 콘텐츠 관리</h1>
              <p className="mt-0.5 text-[10px] md:text-sm text-gray-500">Pool, 동별, 개별 객실 페이지</p>
            </div>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="bg-white border-b px-2 md:px-8 overflow-x-auto">
          <nav className="flex space-x-2 md:space-x-8">
            <button
              onClick={() => {
                setActiveTab('pool')
                setSelectedRoom(null)
              }}
              className={`py-2 md:py-4 px-1 border-b-2 font-medium text-[10px] md:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'pool'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              전체
            </button>
            {['a', 'b', 'c', 'd'].map(zone => (
              <button
                key={zone}
                onClick={() => {
                  setActiveTab(zone)
                  setSelectedRoom(null)
                }}
                className={`py-2 md:py-4 px-1 border-b-2 font-medium text-[10px] md:text-sm transition-colors whitespace-nowrap ${
                  activeTab === zone
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {zone.toUpperCase()}동
              </button>
            ))}
          </nav>
        </div>

        <div className="p-2 md:p-8 space-y-3 md:space-y-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600 text-black">로딩 중...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Pool 페이지 관리 */}
              {activeTab === 'pool' && (
                <>
                  {/* 배너 섹션 */}
                  <div className="bg-white rounded-lg shadow p-3 md:p-6">
                    <div className="flex justify-between items-center mb-3 md:mb-4">
                      <h2 className="text-sm md:text-xl font-semibold text-black">배너 섹션</h2>
                      <button
                        onClick={() => handleSaveSection(['banner', 'title', 'subtitle', 'description'])}
                        disabled={savingSection === 'banner'}
                        className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {savingSection === 'banner' ? '저장 중...' : '저장'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
                      <div>
                        <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">배경 이미지</label>
                        <div className="relative">
                          <div className="w-full h-24 md:h-48 bg-gray-100 rounded-lg overflow-hidden relative">
                            {getContent('banner')?.image_url ? (
                              <Image
                                src={getContent('banner')?.image_url || ''}
                                alt="배너 이미지"
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <span className="text-[10px] md:text-sm">이미지 없음</span>
                              </div>
                            )}
                          </div>
                          <label className="absolute bottom-1 right-1 md:bottom-4 md:right-4 bg-white px-2 md:px-4 py-0.5 md:py-2 rounded shadow cursor-pointer hover:bg-gray-50">
                            <span className="text-[10px] md:text-sm font-medium text-gray-700">변경</span>
                            <input
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={(e) => handleImageUpload('banner', e)}
                            />
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2 md:space-y-4">
                        <div>
                          <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">제목</label>
                          <textarea
                            value={getContent('title')?.content || ''}
                            onChange={(e) => handleLocalUpdate('title', 'content', e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">부제목</label>
                          <textarea
                            value={getContent('subtitle')?.content || ''}
                            onChange={(e) => handleLocalUpdate('subtitle', 'content', e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">설명</label>
                          <textarea
                            value={getContent('description')?.content || ''}
                            onChange={(e) => handleLocalUpdate('description', 'content', e.target.value)}
                            rows={3}
                            className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 객실 정보 테이블 - 모바일에서는 카드 형태 */}
                  <div className="bg-white rounded-lg shadow p-3 md:p-6">
                    <div className="flex justify-between items-center mb-3 md:mb-4">
                      <h2 className="text-sm md:text-xl font-semibold text-black">전체 객실 정보</h2>
                      <button
                        onClick={handleRoomsSave}
                        disabled={!roomsChanged}
                        className={`px-2 md:px-4 py-1 md:py-2 rounded text-[10px] md:text-sm transition-colors ${
                          roomsChanged 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {roomsChanged ? '저장' : '저장됨'}
                      </button>
                    </div>
                    
                    {/* 모바일 카드 뷰 */}
                    <div className="md:hidden space-y-3">
                      {editedRooms.map((room) => {
                        const originalRoom = rooms.find(r => r.id === room.id)
                        const isChanged = JSON.stringify(room) !== JSON.stringify(originalRoom)
                        
                        return (
                          <div key={room.id} className="border border-gray-200 rounded-lg p-4">
                            {/* 객실명과 저장 버튼 */}
                            <div className="flex justify-between items-center mb-3">
                              <h3 className="font-bold text-sm text-black">{room.name}</h3>
                              <button
                                onClick={() => handleSingleRoomSave(room)}
                                disabled={!isChanged}
                                className={`px-3 py-1 rounded text-xs ${
                                  isChanged 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                {isChanged ? '저장' : '저장됨'}
                              </button>
                            </div>
                            
                            {/* 3x3 그리드 레이아웃 */}
                            <div className="grid grid-cols-3 gap-2">
                              {/* 첫 번째 줄 */}
                              <div>
                                <label className="block text-[9px] text-gray-600 mb-0.5">타입</label>
                                <input
                                  value={room.type}
                                  onChange={(e) => handleRoomLocalUpdate(room.id, 'type', e.target.value)}
                                  className={`w-full px-1.5 py-1 text-[11px] border rounded text-black ${
                                    room.type !== originalRoom?.type ? 'bg-yellow-50 border-yellow-400' : ''
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-gray-600 mb-0.5">면적</label>
                                <input
                                  value={room.area}
                                  onChange={(e) => handleRoomLocalUpdate(room.id, 'area', e.target.value)}
                                  className={`w-full px-1.5 py-1 text-[11px] border rounded text-black ${
                                    room.area !== originalRoom?.area ? 'bg-yellow-50 border-yellow-400' : ''
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-gray-600 mb-0.5">기준인원</label>
                                <input
                                  value={room.standard_capacity}
                                  onChange={(e) => handleRoomLocalUpdate(room.id, 'standard_capacity', e.target.value)}
                                  className={`w-full px-1.5 py-1 text-[11px] border rounded text-black text-center ${
                                    room.standard_capacity !== originalRoom?.standard_capacity ? 'bg-yellow-50 border-yellow-400' : ''
                                  }`}
                                />
                              </div>
                              
                              {/* 두 번째 줄 */}
                              <div>
                                <label className="block text-[9px] text-gray-600 mb-0.5">최대인원</label>
                                <input
                                  value={room.max_capacity}
                                  onChange={(e) => handleRoomLocalUpdate(room.id, 'max_capacity', e.target.value)}
                                  className={`w-full px-1.5 py-1 text-[11px] border rounded text-black text-center ${
                                    room.max_capacity !== originalRoom?.max_capacity ? 'bg-yellow-50 border-yellow-400' : ''
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-gray-600 mb-0.5">룸</label>
                                <input
                                  value={room.rooms}
                                  onChange={(e) => handleRoomLocalUpdate(room.id, 'rooms', e.target.value)}
                                  className={`w-full px-1.5 py-1 text-[11px] border rounded text-black text-center ${
                                    room.rooms !== originalRoom?.rooms ? 'bg-yellow-50 border-yellow-400' : ''
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-gray-600 mb-0.5">화장실</label>
                                <input
                                  value={room.bathrooms}
                                  onChange={(e) => handleRoomLocalUpdate(room.id, 'bathrooms', e.target.value)}
                                  className={`w-full px-1.5 py-1 text-[11px] border rounded text-black text-center ${
                                    room.bathrooms !== originalRoom?.bathrooms ? 'bg-yellow-50 border-yellow-400' : ''
                                  }`}
                                />
                              </div>
                              
                              {/* 세 번째 줄 */}
                              <div>
                                <label className="block text-[9px] text-gray-600 mb-0.5">벽난로</label>
                                <input
                                  value={room.fireplace}
                                  onChange={(e) => handleRoomLocalUpdate(room.id, 'fireplace', e.target.value)}
                                  className={`w-full px-1.5 py-1 text-[11px] border rounded text-black text-center ${
                                    room.fireplace !== originalRoom?.fireplace ? 'bg-yellow-50 border-yellow-400' : ''
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-gray-600 mb-0.5">수영장</label>
                                <input
                                  value={room.pool}
                                  onChange={(e) => handleRoomLocalUpdate(room.id, 'pool', e.target.value)}
                                  className={`w-full px-1.5 py-1 text-[11px] border rounded text-black text-center ${
                                    room.pool !== originalRoom?.pool ? 'bg-yellow-50 border-yellow-400' : ''
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-gray-600 mb-0.5">애견</label>
                                <input
                                  value={room.pet_friendly}
                                  onChange={(e) => handleRoomLocalUpdate(room.id, 'pet_friendly', e.target.value)}
                                  className={`w-full px-1.5 py-1 text-[11px] border rounded text-black text-center ${
                                    room.pet_friendly !== originalRoom?.pet_friendly ? 'bg-yellow-50 border-yellow-400' : ''
                                  }`}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* 데스크톱 테이블 뷰 */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-black">객실명</th>
                            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-black">객실타입</th>
                            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-black">객실면적</th>
                            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-black">기준인원</th>
                            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-black">최대인원</th>
                            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-black">룸</th>
                            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-black">화장실</th>
                            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-black">벽난로</th>
                            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-black">수영장</th>
                            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-black">애견동반</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editedRooms.map((room) => {
                            const isChanged = JSON.stringify(room) !== JSON.stringify(rooms.find(r => r.id === room.id))
                            return (
                              <tr key={room.id} className={isChanged ? 'bg-yellow-50' : ''}>
                                <td className="border border-gray-300 p-1">
                                  <textarea
                                    value={room.name}
                                    onChange={(e) => handleRoomLocalUpdate(room.id, 'name', e.target.value)}
                                    rows={1}
                                    className="w-full px-2 py-1 text-sm text-center border border-gray-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none hover:bg-gray-50 text-black"
                                  />
                                </td>
                                <td className="border border-gray-300 p-1">
                                  <textarea
                                    value={room.type}
                                    onChange={(e) => handleRoomLocalUpdate(room.id, 'type', e.target.value)}
                                    rows={1}
                                    className="w-full px-2 py-1 text-sm text-center border border-gray-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none hover:bg-gray-50 text-black"
                                  />
                                </td>
                                <td className="border border-gray-300 p-1">
                                  <textarea
                                    value={room.area}
                                    onChange={(e) => handleRoomLocalUpdate(room.id, 'area', e.target.value)}
                                    rows={1}
                                    className="w-full px-2 py-1 text-sm text-center border border-gray-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none hover:bg-gray-50 text-black"
                                  />
                                </td>
                                <td className="border border-gray-300 p-1">
                                  <textarea
                                    value={room.standard_capacity}
                                    onChange={(e) => handleRoomLocalUpdate(room.id, 'standard_capacity', e.target.value)}
                                    rows={1}
                                    className="w-full px-2 py-1 text-sm text-center border border-gray-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none hover:bg-gray-50 text-black"
                                  />
                                </td>
                                <td className="border border-gray-300 p-1">
                                  <textarea
                                    value={room.max_capacity}
                                    onChange={(e) => handleRoomLocalUpdate(room.id, 'max_capacity', e.target.value)}
                                    rows={1}
                                    className="w-full px-2 py-1 text-sm text-center border border-gray-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none hover:bg-gray-50 text-black"
                                  />
                                </td>
                                <td className="border border-gray-300 p-1">
                                  <textarea
                                    value={room.rooms}
                                    onChange={(e) => handleRoomLocalUpdate(room.id, 'rooms', e.target.value)}
                                    rows={1}
                                    className="w-full px-2 py-1 text-sm text-center border border-gray-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none hover:bg-gray-50 text-black"
                                  />
                                </td>
                                <td className="border border-gray-300 p-1">
                                  <textarea
                                    value={room.bathrooms}
                                    onChange={(e) => handleRoomLocalUpdate(room.id, 'bathrooms', e.target.value)}
                                    rows={1}
                                    className="w-full px-2 py-1 text-sm text-center border border-gray-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none hover:bg-gray-50 text-black"
                                  />
                                </td>
                                <td className="border border-gray-300 p-1">
                                  <textarea
                                    value={room.fireplace}
                                    onChange={(e) => handleRoomLocalUpdate(room.id, 'fireplace', e.target.value)}
                                    rows={1}
                                    className="w-full px-2 py-1 text-sm text-center border border-gray-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none hover:bg-gray-50 text-black"
                                  />
                                </td>
                                <td className="border border-gray-300 p-1">
                                  <textarea
                                    value={room.pool}
                                    onChange={(e) => handleRoomLocalUpdate(room.id, 'pool', e.target.value)}
                                    rows={1}
                                    className="w-full px-2 py-1 text-sm text-center border border-gray-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none hover:bg-gray-50 text-black"
                                  />
                                </td>
                                <td className="border border-gray-300 p-1">
                                  <textarea
                                    value={room.pet_friendly}
                                    onChange={(e) => handleRoomLocalUpdate(room.id, 'pet_friendly', e.target.value)}
                                    rows={1}
                                    className="w-full px-2 py-1 text-sm text-center border border-gray-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none hover:bg-gray-50 text-black"
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* 동별 페이지 관리 */}
              {activeTab !== 'pool' && !selectedRoom && (
                <>
                  {/* 배너 섹션 */}
                  <div className="bg-white rounded-lg shadow p-3 md:p-6">
                    <div className="flex justify-between items-center mb-3 md:mb-4">
                      <h2 className="text-sm md:text-xl font-semibold text-black">{activeTab.toUpperCase()}동 배너</h2>
                      <button
                        onClick={() => handleSaveSection(['banner', 'title', 'subtitle'])}
                        disabled={savingSection === 'banner'}
                        className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {savingSection === 'banner' ? '저장 중...' : '저장'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
                      <div>
                        <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">배경 이미지</label>
                        <div className="relative">
                          <div className="w-full h-24 md:h-48 bg-gray-100 rounded-lg overflow-hidden relative">
                            {getContent('banner')?.image_url ? (
                              <Image
                                src={getContent('banner')?.image_url || ''}
                                alt="배너 이미지"
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <span className="text-[10px] md:text-sm">이미지 없음</span>
                              </div>
                            )}
                          </div>
                          <label className="absolute bottom-1 right-1 md:bottom-4 md:right-4 bg-white px-2 md:px-4 py-0.5 md:py-2 rounded shadow cursor-pointer hover:bg-gray-50">
                            <span className="text-[10px] md:text-sm font-medium text-gray-700">변경</span>
                            <input
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={(e) => handleImageUpload('banner', e)}
                            />
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2 md:space-y-4">
                        <div>
                          <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">제목</label>
                          <textarea
                            value={getContent('title')?.content || ''}
                            onChange={(e) => handleLocalUpdate('title', 'content', e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">부제목</label>
                          <textarea
                            value={getContent('subtitle')?.content || ''}
                            onChange={(e) => handleLocalUpdate('subtitle', 'content', e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 슬라이더 이미지 섹션 */}
                  <div className="bg-white rounded-lg shadow p-3 md:p-6">
                    <div className="flex justify-between items-center mb-3 md:mb-4">
                      <h2 className="text-sm md:text-xl font-semibold text-black">슬라이더 이미지</h2>
                      <div className="space-x-1 md:space-x-2">
                        <button
                          onClick={() => handleAddImageWithFile('slider')}
                          className="px-2 md:px-4 py-1 md:py-2 bg-green-600 text-white rounded text-[10px] md:text-sm hover:bg-green-700"
                        >
                          추가
                        </button>
                        <button
                          onClick={() => handleSaveSection(['slider_1', 'slider_2', 'slider_3', 'slider_4', 'slider_5', 'slider_6', 'slider_7', 'slider_8', 'slider_9', 'slider_10'])}
                          disabled={savingSection === 'slider_1'}
                          className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          {savingSection === 'slider_1' ? '저장 중...' : '저장'}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-4">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
                        const content = getContent(`slider_${num}`)
                        return content ? (
                          <div key={num} className="relative">
                            <div className="w-full h-16 md:h-32 bg-gray-100 rounded overflow-hidden relative">
                              <Image
                                src={content.image_url || '/images/room/aroom.jpg'}
                                alt={`슬라이더 ${num}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <label className="block w-full text-center px-1 py-0.5 md:px-2 md:py-1 mt-1 md:mt-2 bg-gray-200 text-[10px] md:text-sm rounded cursor-pointer hover:bg-gray-300">
                              변경
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(`slider_${num}`, e)}
                              />
                            </label>
                            <button
                              onClick={() => handleDeleteImage(`slider_${num}`)}
                              className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 md:w-6 md:h-6 flex items-center justify-center hover:bg-red-600 text-[10px] md:text-base"
                            >
                              ×
                            </button>
                          </div>
                        ) : null
                      })}
                    </div>
                  </div>

                  {/* Information 섹션 */}
                  <div className="bg-white rounded-lg shadow p-3 md:p-6">
                    <div className="flex justify-between items-center mb-3 md:mb-4">
                      <h2 className="text-sm md:text-xl font-semibold text-black">Information</h2>
                      <button
                        onClick={() => handleSaveSection(['info_checkin', 'info_pet', 'info_pool'])}
                        disabled={savingSection === 'info_checkin'}
                        className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {savingSection === 'info_checkin' ? '저장 중...' : '저장'}
                      </button>
                    </div>
                    <div className="space-y-2 md:space-y-4">
                      <div>
                        <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">체크인/체크아웃</label>
                        <textarea
                          value={getContent('info_checkin')?.content || ''}
                          onChange={(e) => handleLocalUpdate('info_checkin', 'content', e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">애견동반</label>
                        <textarea
                          value={getContent('info_pet')?.content || ''}
                          onChange={(e) => handleLocalUpdate('info_pet', 'content', e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">수영장</label>
                        <textarea
                          value={getContent('info_pool')?.content || ''}
                          onChange={(e) => handleLocalUpdate('info_pool', 'content', e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 개별 객실 목록 */}
                  <div className="bg-white rounded-lg shadow p-3 md:p-6">
                    <h2 className="text-sm md:text-xl font-semibold mb-3 md:mb-6 text-black">개별 객실 관리</h2>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-4">
                      {roomsByZone[activeTab.toUpperCase() as keyof typeof roomsByZone]?.map(roomId => (
                        <button
                          key={roomId}
                          onClick={() => setSelectedRoom(roomId)}
                          className="p-2 md:p-4 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <div className="text-xs md:text-lg font-medium text-black">{roomId}호</div>
                          <div className="text-[10px] md:text-sm text-gray-500">편집</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 개별 객실 편집 */}
              {selectedRoom && (
                <>
                  <div className="bg-white rounded-lg shadow p-3 md:p-6">
                    <div className="flex items-center justify-between mb-3 md:mb-6">
                      <h2 className="text-sm md:text-xl font-semibold text-black">{selectedRoom}호 편집</h2>
                      <button
                        onClick={() => setSelectedRoom(null)}
                        className="px-2 md:px-4 py-1 md:py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-[10px] md:text-sm"
                      >
                        목록으로
                      </button>
                    </div>

                    {/* 배너 및 기본 정보 */}
                    <div className="space-y-4 md:space-y-6">
                      <div>
                        <h3 className="text-xs md:text-lg font-medium mb-2 md:mb-4 text-black">배너 및 기본 정보</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                          <div>
                            <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">배너 이미지</label>
                            <div className="w-full h-20 md:h-32 bg-gray-100 rounded overflow-hidden relative">
                              <Image
                                src={getContent('banner')?.image_url || '/images/room/aroom.jpg'}
                                alt="배너"
                                fill
                                className="object-cover"
                              />
                              <label className="absolute bottom-1 right-1 md:bottom-2 md:right-2 bg-white px-2 py-0.5 md:px-3 md:py-1 rounded shadow cursor-pointer hover:bg-gray-50">
                                <span className="text-[10px] md:text-xs">변경</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload('banner', e)}
                                />
                              </label>
                            </div>
                          </div>
                          <div className="space-y-1 md:space-y-2">
                            <div>
                              <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Zone 텍스트</label>
                              <textarea
                                value={getContent('zone_text')?.content || ''}
                                onChange={(e) => handleLocalUpdate('zone_text', 'content', e.target.value)}
                                rows={1}
                                className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">해시태그</label>
                              <textarea
                                value={getContent('hashtag')?.content || ''}
                                onChange={(e) => handleLocalUpdate('hashtag', 'content', e.target.value)}
                                rows={2}
                                className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">객실명</label>
                              <textarea
                                value={getContent('room_name')?.content || ''}
                                onChange={(e) => handleLocalUpdate('room_name', 'content', e.target.value)}
                                rows={1}
                                className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 md:mt-4 flex justify-end">
                          <button
                            onClick={() => handleSaveSection(['banner', 'zone_text', 'hashtag', 'room_name'])}
                            className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700"
                          >
                            저장
                          </button>
                        </div>
                      </div>

                      {/* 갤러리 이미지 */}
                      <div>
                        <h3 className="text-xs md:text-lg font-medium mb-2 md:mb-4 text-black">갤러리 이미지</h3>
                        <div className="flex justify-between items-center mb-2 md:mb-4">
                          <span className="text-[10px] md:text-sm text-gray-500">최대 5개</span>
                          <div className="space-x-1 md:space-x-2">
                            <button
                              onClick={() => handleAddImage('gallery')}
                              className="px-2 md:px-4 py-1 md:py-2 bg-green-600 text-white rounded text-[10px] md:text-sm hover:bg-green-700"
                            >
                              추가
                            </button>
                            <button
                              onClick={() => handleSaveSection(['gallery_1', 'gallery_2', 'gallery_3', 'gallery_4', 'gallery_5'])}
                              className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700"
                            >
                              저장
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-4">
                          {[1, 2, 3, 4, 5].map(num => {
                            const content = getContent(`gallery_${num}`)
                            return content ? (
                              <div key={num} className="relative">
                                <div className="w-full h-16 md:h-24 bg-gray-100 rounded overflow-hidden relative">
                                  <Image
                                    src={content.image_url || '/images/room/aroom.jpg'}
                                    alt={`갤러리 ${num}`}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <label className="block w-full text-center px-1 py-0.5 md:px-2 md:py-1 mt-1 md:mt-2 bg-gray-200 text-[10px] md:text-sm rounded cursor-pointer hover:bg-gray-300">
                                  변경
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(`gallery_${num}`, e)}
                                  />
                                </label>
                                <button
                                  onClick={() => handleDeleteImage(`gallery_${num}`)}
                                  className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 md:w-6 md:h-6 flex items-center justify-center hover:bg-red-600 text-[10px] md:text-base"
                                >
                                  ×
                                </button>
                              </div>
                            ) : null
                          })}
                        </div>
                      </div>

                      {/* 어메니티 섹션 */}
                      <div>
                        <div className="flex justify-between items-center mb-2 md:mb-4">
                          <h3 className="text-xs md:text-lg font-medium text-black">어메니티</h3>
                          <button
                            onClick={() => handleSaveSection(['amenity'])}
                            className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700"
                          >
                            저장
                          </button>
                        </div>
                        <textarea
                          value={getContent('amenity')?.content || ''}
                          onChange={(e) => handleLocalUpdate('amenity', 'content', e.target.value)}
                          rows={5}
                          className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                          placeholder="어메니티 내용을 입력하세요 (줄바꿈으로 구분)"
                        />
                      </div>

                      {/* 이용안내 섹션 */}
                      <div>
                        <div className="flex justify-between items-center mb-2 md:mb-4">
                          <h3 className="text-xs md:text-lg font-medium text-black">이용안내</h3>
                          <button
                            onClick={() => handleSaveSection(['guide'])}
                            className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700"
                          >
                            저장
                          </button>
                        </div>
                        <textarea
                          value={getContent('guide')?.content || ''}
                          onChange={(e) => handleLocalUpdate('guide', 'content', e.target.value)}
                          rows={12}
                          className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                          placeholder="이용안내 내용을 입력하세요 (줄바꿈으로 구분)"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}