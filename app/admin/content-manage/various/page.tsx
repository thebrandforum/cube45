'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import AdminNavigation from '@/components/admin/navigation'
import Image from 'next/image'

// TypeScript 타입 정의
interface ExtraData {
  parent?: string
  number?: string
  koreanTitle?: string
  [key: string]: string | undefined
}

interface VariousContent {
  id: number
  page_name: string
  section_name: string
  content_type: 'section' | 'card' | 'banner' | 'offer'
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

export default function VariousContentsManage() {
  const [activeTab, setActiveTab] = useState<'facilities' | 'guide' | 'special'>('facilities')
  const [contents, setContents] = useState<VariousContent[]>([])
  const [sectionGroups, setSectionGroups] = useState<SectionWithCards[]>([])
  const [loading, setLoading] = useState(true)
  
  // 편집 상태
  const [editingSection, setEditingSection] = useState<number | null>(null)
  const [editingCard, setEditingCard] = useState<number | null>(null)
  const [addingSection, setAddingSection] = useState(false)
  const [addingCard, setAddingCard] = useState<string | null>(null)
  
  // 새 항목 상태
  const [newSection, setNewSection] = useState<Partial<VariousContent>>({
    title: '',
    subtitle: '',
    description: '',
    image_url: ''
  })
  const [newCard, setNewCard] = useState<Partial<VariousContent>>({
    title: '',
    subtitle: '',
    description: '',
    image_url: ''
  })
  
  // 배너 데이터 state 추가
  const [bannerData, setBannerData] = useState({
    facilities: { image_url: '' },
    guide: { image_url: '', title: '', subtitle: '' },
    special: { image_url: '' }
  })
  
  // 토스트 메시지
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  })

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000)
  }

  // 데이터 가져오기
  const fetchContents = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('cube45_various_contents')
        .select('*')
        .eq('page_name', activeTab)
        .order('display_order')
      
      if (error) throw error
      
      setContents(data || [])
      
      // 부대시설과 이용안내는 섹션-카드 구조로 그룹화
      if (activeTab === 'facilities' || activeTab === 'guide') {
        const sections = data?.filter(item => item.content_type === 'section') || []
        const groups = sections.map(section => ({
          section,
          cards: data?.filter(item => 
            item.content_type === 'card' && 
            item.extra_data?.parent === section.section_name
          ) || []
        }))
        setSectionGroups(groups)
      }
      
      // 배너 데이터 조회 추가
      const { data: bannerDataResult } = await supabase
        .from('cube45_various_contents')
        .select('*')
        .eq('page_name', activeTab)
        .eq('content_type', 'banner')
        .maybeSingle()
      
      if (bannerDataResult) {
        setBannerData(prev => ({
          ...prev,
          [activeTab]: {
            image_url: bannerDataResult.image_url || '',
            title: bannerDataResult.title || '',
            subtitle: bannerDataResult.subtitle || ''
          }
        }))
      }
      
    } catch (error) {
      console.error('데이터 로드 실패:', error)
      showToast('데이터를 불러오는데 실패했습니다.', 'error')
    } finally {
      setLoading(false)
    }
  }, [activeTab])
  
  useEffect(() => {
    fetchContents()
  }, [fetchContents])

  // 이미지 업로드
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `various-contents/${fileName}`

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

  // 섹션 추가
  const handleAddSection = async () => {
    try {
      const newSectionName = `section_${Date.now()}`
      const newOrder = sectionGroups.length + 1
      
      const { error } = await supabase
        .from('cube45_various_contents')
        .insert({
          page_name: activeTab,
          section_name: newSectionName,
          content_type: 'section',
          title: newSection.title || '새 섹션',
          subtitle: newSection.subtitle || '',
          description: newSection.description || '',
          image_url: newSection.image_url || '',
          display_order: newOrder,
          is_active: true
        })

      if (error) throw error
      
      showToast('섹션이 추가되었습니다.', 'success')
      setAddingSection(false)
      setNewSection({ title: '', subtitle: '', description: '', image_url: '' })
      fetchContents()
    } catch (error) {
      console.error('섹션 추가 실패:', error)
      showToast('섹션 추가에 실패했습니다.', 'error')
    }
  }

  // 섹션 수정
  const handleUpdateSection = async (section: VariousContent) => {
    try {
      const { error } = await supabase
        .from('cube45_various_contents')
        .update({
          title: section.title,
          subtitle: section.subtitle,
          description: section.description,
          image_url: section.image_url
        })
        .eq('id', section.id)

      if (error) throw error
      
      showToast('섹션이 수정되었습니다.', 'success')
      setEditingSection(null)
      fetchContents()
    } catch (error) {
      console.error('섹션 수정 실패:', error)
      showToast('섹션 수정에 실패했습니다.', 'error')
    }
  }

  // 섹션 삭제
  const handleDeleteSection = async (sectionId: number, sectionName: string) => {
    if (!confirm('섹션과 관련된 모든 카드가 삭제됩니다. 정말 삭제하시겠습니까?')) return
    
    try {
      // 먼저 관련 카드들 찾기
      const { data: cardsToDelete } = await supabase
        .from('cube45_various_contents')
        .select('id')
        .eq('page_name', activeTab)
        .eq('content_type', 'card')

      // extra_data에서 parent가 sectionName인 카드들 필터링
      const cardIds = cardsToDelete?.filter(card => {
        const content = contents.find(c => c.id === card.id)
        return content?.extra_data?.parent === sectionName
      }).map(card => card.id) || []

      // 카드들 삭제
      if (cardIds.length > 0) {
        const { error: cardsError } = await supabase
          .from('cube45_various_contents')
          .delete()
          .in('id', cardIds)

        if (cardsError) throw cardsError
      }

      // 섹션 삭제
      const { error: sectionError } = await supabase
        .from('cube45_various_contents')
        .delete()
        .eq('id', sectionId)

      if (sectionError) throw sectionError
      
      showToast('섹션이 삭제되었습니다.', 'success')
      fetchContents()
    } catch (error) {
      console.error('섹션 삭제 실패:', error)
      showToast('섹션 삭제에 실패했습니다.', 'error')
    }
  }

  // 카드 추가
  const handleAddCard = async (parentSection: string) => {
    try {
      const newSectionName = `${parentSection}_card_${Date.now()}`
      const cardsCount = contents.filter(c => c.extra_data?.parent === parentSection).length
      const newOrder = contents.filter(c => c.content_type === 'section').length + cardsCount + 1
      
      const { error } = await supabase
        .from('cube45_various_contents')
        .insert({
          page_name: activeTab,
          section_name: newSectionName,
          content_type: 'card',
          title: newCard.title || '새 카드',
          subtitle: newCard.subtitle || '',
          description: newCard.description || '',
          image_url: newCard.image_url || '',
          display_order: newOrder,
          is_active: true,
          extra_data: { parent: parentSection }
        })

      if (error) throw error
      
      showToast('카드가 추가되었습니다.', 'success')
      setAddingCard(null)
      setNewCard({ title: '', subtitle: '', description: '', image_url: '' })
      fetchContents()
    } catch (error) {
      console.error('카드 추가 실패:', error)
      showToast('카드 추가에 실패했습니다.', 'error')
    }
  }

  // 카드 수정
  const handleUpdateCard = async (card: VariousContent) => {
    try {
      const { error } = await supabase
        .from('cube45_various_contents')
        .update({
          title: card.title,
          subtitle: card.subtitle,
          description: card.description,
          image_url: card.image_url,
		  extra_data: card.extra_data	
        })
        .eq('id', card.id)

      if (error) throw error
      
      showToast('카드가 수정되었습니다.', 'success')
      setEditingCard(null)
      fetchContents()
    } catch (error) {
      console.error('카드 수정 실패:', error)
      showToast('카드 수정에 실패했습니다.', 'error')
    }
  }

  // 카드 삭제
  const handleDeleteCard = async (cardId: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    
    try {
      const { error } = await supabase
        .from('cube45_various_contents')
        .delete()
        .eq('id', cardId)

      if (error) throw error
      
      showToast('카드가 삭제되었습니다.', 'success')
      fetchContents()
    } catch (error) {
      console.error('카드 삭제 실패:', error)
      showToast('카드 삭제에 실패했습니다.', 'error')
    }
  }
  
  const handleSaveBanner = async () => {
    try {
      // 1. 현재 탭의 배너 데이터 가져오기
      const currentBanner = bannerData[activeTab as keyof typeof bannerData]
      
      // 2. DB에 이미 배너가 있는지 확인
      const { data: existingBanner } = await supabase
        .from('cube45_various_contents')
        .select('id')
        .eq('page_name', activeTab)
        .eq('content_type', 'banner')
        .maybeSingle()  // 없어도 에러 안나게
      
      // 3. 업데이트할 데이터 준비 (타입 명시)
      const updateData: {
        image_url: string
        title: string
        subtitle: string
      } = {
        image_url: currentBanner.image_url,
        title: '',
        subtitle: ''
      }
      
      // guide 탭일 때만 제목/부제목 설정
      if (activeTab === 'guide' && 'title' in currentBanner && 'subtitle' in currentBanner) {
        updateData.title = currentBanner.title
        updateData.subtitle = currentBanner.subtitle
      }
      
      if (existingBanner) {
        // 3-1. 있으면 UPDATE
        const { error } = await supabase
          .from('cube45_various_contents')
          .update(updateData)
          .eq('id', existingBanner.id)
        
        if (error) throw error
      } else {
        // 3-2. 없으면 INSERT
        const { error } = await supabase
          .from('cube45_various_contents')
          .insert({
            page_name: activeTab,
            section_name: 'banner',
            content_type: 'banner',  // 중요: content_type을 'banner'로
            ...updateData,
            description: '',
            display_order: 0,  // 배너는 항상 최상단
            is_active: true
          })
        
        if (error) throw error
      }
      
      showToast('배너가 저장되었습니다.', 'success')
    } catch (error) {
      console.error('배너 저장 실패:', error)
      showToast('배너 저장에 실패했습니다.', 'error')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600 text-black">로딩 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminNavigation />
      
      {/* 토스트 메시지 */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-3 md:px-6 py-2 md:py-3 rounded-lg shadow-lg transition-all transform ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white text-xs md:text-base`}>
          {toast.message}
        </div>
      )}

      <main className="flex-1 mt-14 md:mt-0 md:ml-48">
        {/* 헤더 */}
        <div className="bg-white border-b px-3 md:px-8 py-3 md:py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-base md:text-2xl font-bold text-gray-900">콘텐츠 관리</h1>
              <p className="mt-0.5 text-[10px] md:text-sm text-gray-500">부대시설, 이용안내, 스페셜 오퍼 페이지의 콘텐츠를 관리합니다</p>
            </div>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="bg-white border-b px-2 md:px-8 overflow-x-auto">
          <nav className="flex space-x-2 md:space-x-8">
            <button
              onClick={() => setActiveTab('facilities')}
              className={`py-2 md:py-4 px-1 border-b-2 font-medium text-[10px] md:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'facilities'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              부대시설
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`py-2 md:py-4 px-1 border-b-2 font-medium text-[10px] md:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'guide'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              이용안내
            </button>
            <button
              onClick={() => setActiveTab('special')}
              className={`py-2 md:py-4 px-1 border-b-2 font-medium text-[10px] md:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'special'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              스페셜 오퍼
            </button>
          </nav>
        </div>

        <div className="p-2 md:p-8 space-y-3 md:space-y-8">
          {/* 부대시설 탭 */}
          {activeTab === 'facilities' && (
            <>
              {/* 배너 섹션 */}
              <div className="bg-white rounded-lg shadow p-3 md:p-6 mb-3 md:mb-6">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h2 className="text-sm md:text-xl font-semibold text-black">배너 이미지</h2>
                  <button
                    onClick={handleSaveBanner}
                    className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded-md text-[10px] md:text-sm hover:bg-blue-700"
                  >
                    저장
                  </button>
                </div>
                <div className="w-full">
                  <div className="relative h-32 md:h-64 bg-gray-100 rounded-lg overflow-hidden">
                    {bannerData.facilities.image_url ? (
                      <Image
                        src={bannerData.facilities.image_url}
                        alt="배너"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">
                        <span className="text-[10px] md:text-sm">이미지를 업로드해주세요</span>
                      </div>
                    )}
                    <label className="absolute bottom-1 right-1 md:bottom-4 md:right-4 bg-white px-2 md:px-4 py-0.5 md:py-2 rounded-md shadow-lg cursor-pointer hover:bg-gray-50">
                      <span className="text-[10px] md:text-sm font-medium text-gray-700">이미지 변경</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const url = await uploadImage(file)
                            if (url) {
                              setBannerData(prev => ({
                                ...prev,
                                facilities: { ...prev.facilities, image_url: url }
                              }))
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
          
              {/* 섹션 추가 버튼 */}
              <div className="flex justify-end">
                <button
                  onClick={() => setAddingSection(true)}
                  className="px-2 md:px-4 py-1 md:py-2 bg-green-600 text-white rounded-md text-[10px] md:text-sm hover:bg-green-700"
                >
                  새 섹션 추가
                </button>
              </div>

              {/* 섹션 추가 폼 */}
              {addingSection && (
                <div className="bg-white rounded-lg shadow p-3 md:p-6">
                  <h3 className="text-sm md:text-lg font-semibold mb-3 md:mb-4 text-black">새 섹션 추가</h3>
                  <div className="space-y-3 md:space-y-4">
                    <div>
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">제목</label>
                      <textarea
                        value={newSection.title}
                        onChange={(e) => setNewSection({...newSection, title: e.target.value})}
                        rows={2}
                        placeholder="섹션 제목"
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded-md resize-none text-[11px] md:text-base text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">부제목</label>
                      <textarea
                        value={newSection.subtitle}
                        onChange={(e) => setNewSection({...newSection, subtitle: e.target.value})}
                        rows={2}
                        placeholder="섹션 부제목"
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded-md resize-none text-[11px] md:text-base text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">설명</label>
                      <textarea
                        value={newSection.description}
                        onChange={(e) => setNewSection({...newSection, description: e.target.value})}
                        rows={4}
                        placeholder="섹션 설명"
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded-md text-[11px] md:text-base text-black"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddSection}
                        className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700"
                      >
                        추가
                      </button>
                      <button
                        onClick={() => {
                          setAddingSection(false)
                          setNewSection({ title: '', subtitle: '', description: '', image_url: '' })
                        }}
                        className="px-2 md:px-4 py-1 md:py-2 bg-gray-300 text-gray-700 rounded text-[10px] md:text-sm hover:bg-gray-400"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 섹션 목록 */}
              {sectionGroups.map((group) => (
                <div key={group.section.id} className="bg-white rounded-lg shadow p-3 md:p-6">
                  {/* 섹션 헤더 */}
                  <div className="flex justify-between items-center mb-3 md:mb-4">
                    <h2 className="text-sm md:text-xl font-semibold text-black">{group.section.title}</h2>
                    <div className="flex gap-1 md:gap-2">
                      <button
                        onClick={() => setAddingCard(group.section.section_name)}
                        className="px-2 md:px-3 py-1 md:py-1.5 bg-green-600 text-white rounded text-[10px] md:text-sm hover:bg-green-700"
                      >
                        카드 추가
                      </button>
                      <button
                        onClick={() => handleUpdateSection(group.section)}
                        className="px-2 md:px-3 py-1 md:py-1.5 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700"
                      >
                        섹션 저장
                      </button>
                      <button
                        onClick={() => handleDeleteSection(group.section.id, group.section.section_name)}
                        className="px-2 md:px-3 py-1 md:py-1.5 bg-red-600 text-white rounded text-[10px] md:text-sm hover:bg-red-700"
                      >
                        섹션 삭제
                      </button>
                    </div>
                  </div>

                  {/* 섹션 편집 폼 - 항상 표시 */}
                  <div className="mb-3 md:mb-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-3 md:space-y-4">
                        <div>
                          <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">제목</label>
                          <textarea
                            value={group.section.title}
                            onChange={(e) => {
                              const updated = sectionGroups.map(g => 
                                g.section.id === group.section.id 
                                  ? {...g, section: {...g.section, title: e.target.value}}
                                  : g
                              )
                              setSectionGroups(updated)
                            }}
                            rows={2}
                            className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded-md resize-none text-[11px] md:text-base text-black"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">부제목</label>
                          <textarea
                            value={group.section.subtitle}
                            onChange={(e) => {
                              const updated = sectionGroups.map(g => 
                                g.section.id === group.section.id 
                                  ? {...g, section: {...g.section, subtitle: e.target.value}}
                                  : g
                              )
                              setSectionGroups(updated)
                            }}
                            rows={2}
                            className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded-md resize-none text-[11px] md:text-base text-black"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">설명</label>
                        <textarea
                          value={group.section.description}
                          onChange={(e) => {
                            const updated = sectionGroups.map(g => 
                              g.section.id === group.section.id 
                                ? {...g, section: {...g.section, description: e.target.value}}
                                : g
                            )
                            setSectionGroups(updated)
                          }}
                          rows={6}
                          className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded-md text-[11px] md:text-base text-black"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 카드 추가 폼 */}
                  {addingCard === group.section.section_name && (
                    <div className="p-3 md:p-4 mb-3 md:mb-4 bg-blue-50 rounded-lg">
                      <h3 className="font-semibold mb-2 md:mb-3 text-xs md:text-base text-black">새 카드 추가</h3>
                      <div className="space-y-2 md:space-y-3">
                        <div>
                          <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1">제목</label>
                          <textarea
                            value={newCard.title}
                            onChange={(e) => setNewCard({...newCard, title: e.target.value})}
                            rows={2}
                            placeholder="카드 제목"
                            className="w-full px-2 py-1 md:px-3 md:py-2 border rounded resize-none text-[11px] md:text-base text-black"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1">부제목</label>
                          <textarea
                            value={newCard.subtitle}
                            onChange={(e) => setNewCard({...newCard, subtitle: e.target.value})}
                            rows={2}
                            placeholder="카드 부제목"
                            className="w-full px-2 py-1 md:px-3 md:py-2 border rounded resize-none text-[11px] md:text-base text-black"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1">이미지</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                const url = await uploadImage(file)
                                if (url) {
                                  setNewCard({...newCard, image_url: url})
                                  showToast('이미지가 업로드되었습니다.', 'success')
                                }
                              }
                            }}
                            className="w-full px-2 py-1 md:px-3 md:py-2 border rounded text-[11px] md:text-sm text-black"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddCard(group.section.section_name)}
                            className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700"
                          >
                            추가
                          </button>
                          <button
                            onClick={() => {
                              setAddingCard(null)
                              setNewCard({ title: '', subtitle: '', description: '', image_url: '' })
                            }}
                            className="px-2 md:px-4 py-1 md:py-2 bg-gray-300 text-gray-700 rounded text-[10px] md:text-sm hover:bg-gray-400"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 카드 목록 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    {group.cards.map((card) => (
                      <div key={card.id} className="rounded-lg overflow-hidden shadow">
                        <div className="h-24 md:h-40 bg-gray-100 relative">
                          {card.image_url ? (
                            <Image
                              src={card.image_url}
                              alt={card.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <span className="text-[10px] md:text-sm">이미지 없음</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-2 md:p-4">
                          {editingCard === card.id ? (
                            <div className="space-y-1 md:space-y-2">
                              <textarea
                                value={card.title}
                                onChange={(e) => {
                                  const updatedGroups = sectionGroups.map(g => ({
                                    ...g,
                                    cards: g.cards.map(c => 
                                      c.id === card.id ? {...c, title: e.target.value} : c
                                    )
                                  }))
                                  setSectionGroups(updatedGroups)
                                }}
                                rows={2}
                                className="w-full px-1 py-0.5 md:px-2 md:py-1 border rounded text-[10px] md:text-sm resize-none text-black"
                                placeholder="제목"
                              />
                              <textarea
                                value={card.subtitle}
                                onChange={(e) => {
                                  const updatedGroups = sectionGroups.map(g => ({
                                    ...g,
                                    cards: g.cards.map(c => 
                                      c.id === card.id ? {...c, subtitle: e.target.value} : c
                                    )
                                  }))
                                  setSectionGroups(updatedGroups)
                                }}
                                rows={2}
                                className="w-full px-1 py-0.5 md:px-2 md:py-1 border rounded text-[10px] md:text-sm resize-none text-black"
                                placeholder="부제목"
                              />
                              <label className="block">
                                <span className="text-[10px] md:text-xs text-gray-500">이미지 변경</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                      const url = await uploadImage(file)
                                      if (url) {
                                        const updatedGroups = sectionGroups.map(g => ({
                                          ...g,
                                          cards: g.cards.map(c => 
                                            c.id === card.id ? {...c, image_url: url} : c
                                          )
                                        }))
                                        setSectionGroups(updatedGroups)
                                        showToast('이미지가 업로드되었습니다.', 'success')
                                      }
                                    }
                                  }}
                                  className="w-full text-[10px] md:text-xs"
                                />
                              </label>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    const updatedCard = sectionGroups
                                      .flatMap(g => g.cards)
                                      .find(c => c.id === card.id)
                                    if (updatedCard) handleUpdateCard(updatedCard)
                                  }}
                                  className="px-1.5 py-0.5 md:px-2 md:py-1 bg-blue-500 text-white rounded text-[10px] md:text-xs hover:bg-blue-600"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCard(null)
                                    fetchContents()
                                  }}
                                  className="px-1.5 py-0.5 md:px-2 md:py-1 bg-gray-300 text-gray-700 rounded text-[10px] md:text-xs hover:bg-gray-400"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h3 className="font-semibold text-[11px] md:text-sm mb-1 text-black">{card.title}</h3>
                              <p className="text-[10px] md:text-xs text-gray-600 mb-2">{card.subtitle}</p>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setEditingCard(card.id)}
                                  className="px-1.5 py-0.5 md:px-2 md:py-1 bg-blue-500 text-white rounded text-[10px] md:text-xs hover:bg-blue-600"
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => handleDeleteCard(card.id)}
                                  className="px-1.5 py-0.5 md:px-2 md:py-1 bg-red-500 text-white rounded text-[10px] md:text-xs hover:bg-red-600"
                                >
                                  삭제
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* 이용안내 탭 */}
          {activeTab === 'guide' && (
            <>
              {/* 배너 섹션 */}
              <div className="bg-white rounded-lg shadow p-3 md:p-6 mb-3 md:mb-6">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h2 className="text-sm md:text-xl font-semibold text-black">배너 섹션</h2>
                  <button
                    onClick={handleSaveBanner}
                    className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded-md text-[10px] md:text-sm hover:bg-blue-700"
                  >
                    저장
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
                  <div>
                    <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">배경 이미지</label>
                    <div className="relative h-24 md:h-48 bg-gray-100 rounded-lg overflow-hidden">
                      {bannerData.guide.image_url ? (
                        <Image
                          src={bannerData.guide.image_url}
                          alt="배너"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">
                          <span className="text-[10px] md:text-sm">이미지 없음</span>
                        </div>
                      )}
                      <label className="absolute bottom-1 right-1 md:bottom-4 md:right-4 bg-white px-2 md:px-4 py-0.5 md:py-2 rounded-md shadow-lg cursor-pointer hover:bg-gray-50">
                        <span className="text-[10px] md:text-sm font-medium text-gray-700">이미지 변경</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const url = await uploadImage(file)
                              if (url) {
                                setBannerData(prev => ({
                                  ...prev,
                                  guide: { ...prev.guide, image_url: url }
                                }))
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    <div>
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">제목</label>
                      <textarea
                        value={bannerData.guide.title || ''}
                        onChange={(e) => setBannerData(prev => ({
                          ...prev,
                          guide: { ...prev.guide, title: e.target.value }
                        }))}
                        rows={2}
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded-md text-[11px] md:text-base text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">부제목</label>
                      <textarea
                        value={bannerData.guide.subtitle || ''}
                        onChange={(e) => setBannerData(prev => ({
                          ...prev,
                          guide: { ...prev.guide, subtitle: e.target.value }
                        }))}
                        rows={2}
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded-md text-[11px] md:text-base text-black"
                      />
                    </div>
                  </div>
                </div>
              </div>
          
              {/* 섹션 추가 버튼 */}
              <div className="flex justify-end">
                <button
                  onClick={() => setAddingSection(true)}
                  className="px-2 md:px-4 py-1 md:py-2 bg-green-600 text-white rounded-md text-[10px] md:text-sm hover:bg-green-700"
                >
                  새 섹션 추가
                </button>
              </div>

              {/* 섹션 추가 폼 */}
              {addingSection && (
                <div className="bg-white rounded-lg shadow p-3 md:p-6">
                  <h3 className="text-sm md:text-lg font-semibold mb-3 md:mb-4 text-black">새 섹션 추가</h3>
                  <div className="space-y-3 md:space-y-4">
                    <div>
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">섹션 제목</label>
                      <textarea
                        value={newSection.title}
                        onChange={(e) => setNewSection({...newSection, title: e.target.value})}
                        rows={2}
                        placeholder="예: 이용안내, 취소 환불규정"
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded-md resize-none text-[11px] md:text-base text-black"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddSection}
                        className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700"
                      >
                        추가
                      </button>
                      <button
                        onClick={() => {
                          setAddingSection(false)
                          setNewSection({ title: '', subtitle: '', description: '', image_url: '' })
                        }}
                        className="px-2 md:px-4 py-1 md:py-2 bg-gray-300 text-gray-700 rounded text-[10px] md:text-sm hover:bg-gray-400"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 섹션 목록 */}
              {sectionGroups.map((group) => (
                <div key={group.section.id} className="bg-white rounded-lg shadow p-3 md:p-6">
                  {/* 섹션 헤더 */}
                  <div className="flex justify-between items-center mb-3 md:mb-4">
                    {editingSection === group.section.id ? (
                      <textarea
                        value={group.section.title}
                        onChange={(e) => {
                          const updated = sectionGroups.map(g => 
                            g.section.id === group.section.id 
                              ? {...g, section: {...g.section, title: e.target.value}}
                              : g
                          )
                          setSectionGroups(updated)
                        }}
                        rows={1}
                        className="text-sm md:text-xl font-semibold px-2 py-1 border rounded resize-none text-black"
                      />
                    ) : (
                      <h2 className="text-sm md:text-xl font-semibold text-black">{group.section.title}</h2>
                    )}
                    <div className="flex gap-1 md:gap-2">
                      <button
                        onClick={() => setAddingCard(group.section.section_name)}
                        className="px-2 md:px-3 py-1 md:py-1.5 bg-green-600 text-white rounded text-[10px] md:text-sm hover:bg-green-700"
                      >
                        항목 추가
                      </button>
                      {editingSection === group.section.id ? (
                        <>
                          <button
                            onClick={() => handleUpdateSection(group.section)}
                            className="px-2 md:px-3 py-1 md:py-1.5 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => {
                              setEditingSection(null)
                              fetchContents()
                            }}
                            className="px-2 md:px-3 py-1 md:py-1.5 bg-gray-500 text-white rounded text-[10px] md:text-sm hover:bg-gray-600"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingSection(group.section.id)}
                            className="px-2 md:px-3 py-1 md:py-1.5 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700"
                          >
                            섹션 수정
                          </button>
                          <button
                            onClick={() => handleDeleteSection(group.section.id, group.section.section_name)}
                            className="px-2 md:px-3 py-1 md:py-1.5 bg-red-600 text-white rounded text-[10px] md:text-sm hover:bg-red-700"
                          >
                            섹션 삭제
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 항목 추가 폼 */}
                  {addingCard === group.section.section_name && (
                    <div className="border rounded-lg p-3 md:p-4 mb-3 md:mb-4 bg-blue-50">
                      <h3 className="font-semibold mb-2 md:mb-3 text-xs md:text-base text-black">새 항목 추가</h3>
                      <div className="space-y-2 md:space-y-3">
                        <div>
                          <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1">제목</label>
                          <textarea
                            value={newCard.title}
                            onChange={(e) => setNewCard({...newCard, title: e.target.value})}
                            rows={2}
                            placeholder="예: 애견입실, 수영장"
                            className="w-full px-2 py-1 md:px-3 md:py-2 border rounded resize-none text-[11px] md:text-base text-black"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1">내용</label>
                          <textarea
                            value={newCard.description}
                            onChange={(e) => setNewCard({...newCard, description: e.target.value})}
                            rows={6}
                            placeholder="내용을 입력하세요 (엔터로 줄바꿈)"
                            className="w-full px-2 py-1 md:px-3 md:py-2 border rounded text-[11px] md:text-base text-black"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddCard(group.section.section_name)}
                            className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700"
                          >
                            추가
                          </button>
                          <button
                            onClick={() => {
                              setAddingCard(null)
                              setNewCard({ title: '', subtitle: '', description: '', image_url: '' })
                            }}
                            className="px-2 md:px-4 py-1 md:py-2 bg-gray-300 text-gray-700 rounded text-[10px] md:text-sm hover:bg-gray-400"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 항목 목록 */}
                  <div className="space-y-3 md:space-y-4">
                    {group.cards.map((card) => (
                      <div key={card.id} className="p-3 md:p-4 bg-white rounded-lg shadow">
                        {editingCard === card.id ? (
                          <div className="space-y-2 md:space-y-3">
                            <div>
                              <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1">제목</label>
                              <textarea
                                value={card.title}
                                onChange={(e) => {
                                  const updatedGroups = sectionGroups.map(g => ({
                                    ...g,
                                    cards: g.cards.map(c => 
                                      c.id === card.id ? {...c, title: e.target.value} : c
                                    )
                                  }))
                                  setSectionGroups(updatedGroups)
                                }}
                                rows={2}
                                className="w-full px-2 py-1 md:px-3 md:py-2 border rounded resize-none text-[11px] md:text-base text-black"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1">내용</label>
                              <textarea
                                value={card.description}
                                onChange={(e) => {
                                  const updatedGroups = sectionGroups.map(g => ({
                                    ...g,
                                    cards: g.cards.map(c => 
                                      c.id === card.id ? {...c, description: e.target.value} : c
                                    )
                                  }))
                                  setSectionGroups(updatedGroups)
                                }}
                                rows={8}
                                className="w-full px-2 py-1 md:px-3 md:py-2 border rounded text-[11px] md:text-base text-black"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const updatedCard = sectionGroups
                                    .flatMap(g => g.cards)
                                    .find(c => c.id === card.id)
                                  if (updatedCard) handleUpdateCard(updatedCard)
                                }}
                                className="px-2 md:px-3 py-1 md:py-1.5 bg-blue-500 text-white rounded text-[10px] md:text-sm hover:bg-blue-600"
                              >
                                저장
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCard(null)
                                  fetchContents()
                                }}
                                className="px-2 md:px-3 py-1 md:py-1.5 bg-gray-300 text-gray-700 rounded text-[10px] md:text-sm hover:bg-gray-400"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2 text-black">{card.title}</h3>
                            <p className="text-gray-700 whitespace-pre-wrap mb-2 md:mb-3 text-[11px] md:text-base">{card.description}</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingCard(card.id)}
                                className="px-2 md:px-3 py-1 md:py-1.5 bg-blue-500 text-white rounded text-[10px] md:text-sm hover:bg-blue-600"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDeleteCard(card.id)}
                                className="px-2 md:px-3 py-1 md:py-1.5 bg-red-500 text-white rounded text-[10px] md:text-sm hover:bg-red-600"
                              >
                                삭제
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* 스페셜 오퍼 탭 */}
          {activeTab === 'special' && (
            <>
              {/* 배너 섹션 */}
              <div className="bg-white rounded-lg shadow p-3 md:p-6 mb-3 md:mb-6">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h2 className="text-sm md:text-xl font-semibold text-black">배너 이미지</h2>
                  <button
                    onClick={handleSaveBanner}
                    className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded-md text-[10px] md:text-sm hover:bg-blue-700"
                  >
                    저장
                  </button>
                </div>
                <div className="w-full">
                  <div className="relative h-32 md:h-64 bg-gray-100 rounded-lg overflow-hidden">
                    {bannerData.special.image_url ? (
                      <Image
                        src={bannerData.special.image_url}
                        alt="배너"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">
                        <span className="text-[10px] md:text-sm">이미지를 업로드해주세요</span>
                      </div>
                    )}
                    <label className="absolute bottom-1 right-1 md:bottom-4 md:right-4 bg-white px-2 md:px-4 py-0.5 md:py-2 rounded-md shadow-lg cursor-pointer hover:bg-gray-50">
                      <span className="text-[10px] md:text-sm font-medium text-gray-700">이미지 변경</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const url = await uploadImage(file)
                            if (url) {
                              setBannerData(prev => ({
                                ...prev,
                                special: { ...prev.special, image_url: url }
                              }))
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
          
              {/* 기존 오퍼 관리 섹션 */}
              <div className="bg-white rounded-lg shadow p-3 md:p-6">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h2 className="text-sm md:text-xl font-semibold text-black">스페셜 오퍼 (OFFERS)</h2>
                  <button
                    onClick={() => setAddingCard('offers')}
                    className="px-2 md:px-4 py-1 md:py-2 bg-green-600 text-white rounded-md text-[10px] md:text-sm hover:bg-green-700"
                  >
                    오퍼 추가
                  </button>
                </div>

                {/* 오퍼 추가 폼 */}
                {addingCard === 'offers' && (
                  <div className="border rounded-lg p-3 md:p-4 mb-3 md:mb-4 bg-blue-50">
                    <h3 className="font-semibold mb-2 md:mb-3 text-xs md:text-base text-black">새 오퍼 추가</h3>
                    <div className="space-y-2 md:space-y-3">
                      <div>
                        <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1">영문 제목</label>
                        <textarea
                          value={newCard.title}
                          onChange={(e) => setNewCard({...newCard, title: e.target.value})}
                          rows={2}
                          placeholder="예: Special Package"
                          className="w-full px-2 py-1 md:px-3 md:py-2 border rounded resize-none text-[11px] md:text-base text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1">한글 제목</label>
                        <textarea
                          value={newCard.subtitle}
                          onChange={(e) => setNewCard({...newCard, subtitle: e.target.value})}
                          rows={2}
                          placeholder="예: 스페셜 패키지"
                          className="w-full px-2 py-1 md:px-3 md:py-2 border rounded resize-none text-[11px] md:text-base text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1">설명</label>
                        <textarea
                          value={newCard.description}
                          onChange={(e) => setNewCard({...newCard, description: e.target.value})}
                          rows={3}
                          placeholder="오퍼 설명"
                          className="w-full px-2 py-1 md:px-3 md:py-2 border rounded text-[11px] md:text-base text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1">이미지</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const url = await uploadImage(file)
                              if (url) {
                                setNewCard({...newCard, image_url: url})
                                showToast('이미지가 업로드되었습니다.', 'success')
                              }
                            }
                          }}
                          className="w-full px-2 py-1 md:px-3 md:py-2 border rounded text-[11px] md:text-sm text-black"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            try {
                              const newOrder = contents.length + 1
                              const { error } = await supabase
                                .from('cube45_various_contents')
                                .insert({
                                  page_name: 'special',
                                  section_name: `offer_${Date.now()}`,
                                  content_type: 'offer',
                                  title: 'CUBE 45 Private Pool Villa',
                                  subtitle: newCard.title || '새 오퍼',
                                  description: newCard.description || '',
                                  image_url: newCard.image_url || '',
                                  display_order: newOrder,
                                  is_active: true,
                                  extra_data: {
                                    number: String(newOrder).padStart(2, '0'),
                                    koreanTitle: newCard.subtitle || ''
                                  }
                                })
                              if (error) throw error
                              showToast('오퍼가 추가되었습니다.', 'success')
                              setAddingCard(null)
                              setNewCard({ title: '', subtitle: '', description: '', image_url: '' })
                              fetchContents()
                            } catch (error) {
                              showToast('추가에 실패했습니다.', 'error')
                            }
                          }}
                          className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700"
                        >
                          추가
                        </button>
                        <button
                          onClick={() => {
                            setAddingCard(null)
                            setNewCard({ title: '', subtitle: '', description: '', image_url: '' })
                          }}
                          className="px-2 md:px-4 py-1 md:py-2 bg-gray-300 text-gray-700 rounded text-[10px] md:text-sm hover:bg-gray-400"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 오퍼 목록 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {contents
                    .filter(item => item.content_type === 'offer')  // 배너 제외하고 오퍼만 필터링
                    .map((offer, index) => (
                    <div key={offer.id} className="rounded-lg overflow-hidden shadow">
                      <div className="h-24 md:h-48 bg-gray-100 relative">
                        {offer.image_url ? (
                          <Image
                            src={offer.image_url}
                            alt={offer.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span className="text-[10px] md:text-sm">이미지 없음</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-2 md:p-4">
                        {editingCard === offer.id ? (
                          <div className="space-y-1 md:space-y-2">
                            <textarea
                              value={offer.title}
                              onChange={(e) => {
                                const updated = contents.map(c => 
                                  c.id === offer.id ? {...c, title: e.target.value} : c
                                )
                                setContents(updated)
                              }}
                              rows={2}
                              className="w-full px-1 py-0.5 md:px-2 md:py-1 border rounded text-[10px] md:text-sm resize-none text-black"
                              placeholder="메인 타이틀 (예: CUBE 45 Private Pool Villa)"
                            />
                            <textarea
                              value={offer.subtitle}
                              onChange={(e) => {
                                const updated = contents.map(c => 
                                  c.id === offer.id ? {...c, subtitle: e.target.value} : c
                                )
                                setContents(updated)
                              }}
                              rows={2}
                              className="w-full px-1 py-0.5 md:px-2 md:py-1 border rounded text-[10px] md:text-sm resize-none text-black"
                              placeholder="영문 제목 (예: Special Package)"
                            />
                            <textarea
                              value={offer.extra_data?.koreanTitle || ''}
                              onChange={(e) => {
                                const updated = contents.map(c => 
                                  c.id === offer.id ? {
                                    ...c,
                                    extra_data: {
                                      ...c.extra_data,
                                      koreanTitle: e.target.value,
                                      number: c.extra_data?.number || String(index + 1).padStart(2, '0')
                                    }
                                  } : c
                                )
                                setContents(updated)
                              }}
                              rows={2}
                              className="w-full px-1 py-0.5 md:px-2 md:py-1 border rounded text-[10px] md:text-sm resize-none text-black"
                              placeholder="한글 제목 (예: 스페셜 패키지)"
                            />
                            <label className="block">
                              <span className="text-[10px] md:text-xs text-gray-500">이미지 변경</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    const url = await uploadImage(file)
                                    if (url) {
                                      const updated = contents.map(c => 
                                        c.id === offer.id ? {...c, image_url: url} : c
                                      )
                                      setContents(updated)
                                      showToast('이미지가 업로드되었습니다.', 'success')
                                    }
                                  }
                                }}
                                className="w-full text-[10px] md:text-xs"
                              />
                            </label>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  const updatedOffer = contents.find(c => c.id === offer.id)
                                  if (updatedOffer) handleUpdateCard(updatedOffer)
                                }}
                                className="px-1.5 py-0.5 md:px-2 md:py-1 bg-blue-500 text-white rounded text-[10px] md:text-xs hover:bg-blue-600"
                              >
                                저장
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCard(null)
                                  fetchContents()
                                }}
                                className="px-1.5 py-0.5 md:px-2 md:py-1 bg-gray-300 text-gray-700 rounded text-[10px] md:text-xs hover:bg-gray-400"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-[10px] md:text-xs text-gray-500 mb-1">{offer.extra_data?.number || `#${String(index + 1).padStart(2, '0')}`}</div>
                            <h3 className="font-semibold text-[11px] md:text-sm mb-1 text-black">{offer.title}</h3>
                            <p className="text-[10px] md:text-xs text-gray-600 mb-1">{offer.subtitle}</p>
                            <p className="text-[10px] md:text-xs text-gray-500 mb-2">{offer.extra_data?.koreanTitle}</p>
                            <div className="flex gap-1">
                              <button
                                onClick={() => setEditingCard(offer.id)}
                                className="px-1.5 py-0.5 md:px-2 md:py-1 bg-blue-500 text-white rounded text-[10px] md:text-xs hover:bg-blue-600"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDeleteCard(offer.id)}
                                className="px-1.5 py-0.5 md:px-2 md:py-1 bg-red-500 text-white rounded text-[10px] md:text-xs hover:bg-red-600"
                              >
                                삭제
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}