'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import AdminNavigation from '@/components/admin/navigation'
import Image from 'next/image'

interface ExtraData {
  tag?: string
  description?: string
  [key: string]: string | undefined
}

interface PageContent {
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
  extra_data: ExtraData | null
}

interface CafeItem {
  id: number
  section_name: string
  title: string
  image_url: string
  tag: string
  description: string
  link: string  
  display_order: number
}

export default function PageContentsManage() {
  const [activeTab, setActiveTab] = useState<'intro' | 'location' | 'tour' | 'contact'>('intro')
  const [contents, setContents] = useState<PageContent[]>([])
  const [cafes, setCafes] = useState<CafeItem[]>([])
  const [editedContents, setEditedContents] = useState<PageContent[]>([])
  const [loading, setLoading] = useState(true)
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [editingCafe, setEditingCafe] = useState<string | null>(null)
  const [addingCafe, setAddingCafe] = useState(false)
  const [exclusiveImages, setExclusiveImages] = useState<string[]>([])
  const [exceptionalImages, setExceptionalImages] = useState<string[]>([])
  const [newCafe, setNewCafe] = useState<CafeItem>({
    id: 0,
    section_name: '',
    title: '',
    image_url: '',
    tag: '',
    description: '',
	link: '',  
    display_order: 0
  })
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  })

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000)
  }

  const fetchContents = useCallback(async () => {
    setLoading(true)
    try {
      // 모든 탭이 같은 테이블 사용
      const { data, error } = await supabase
        .from('cube45_page_contents')
        .select('*')
        .eq('page_name', activeTab)
        .order('display_order')
  
      if (error) throw error
      
      setContents(data || [])
      setEditedContents(data || [])
      
      if (activeTab === 'tour') {
        const cafeData = data?.filter(item => item.content_type === 'card').map(item => ({
          id: item.id,
          section_name: item.section_name,
          title: item.title,
          image_url: item.image_url,
          tag: item.extra_data?.tag || '',
          description: item.extra_data?.description || '',
          link: item.extra_data?.link || '',  
          display_order: item.display_order
        })) || []
        setCafes(cafeData)
      }
      
      // Exclusive Cube 이미지들 로드
      if (activeTab === 'intro') {
        const exclusiveImgs = []
        for (let i = 1; i <= 5; i++) {
          const imgContent = data?.find(c => c.section_name === `exclusive_cube_image_${i}`)
          if (imgContent?.image_url) {
            exclusiveImgs.push(imgContent.image_url)
          }
        }
        setExclusiveImages(exclusiveImgs)
  
        // Exceptional Retreat 이미지들 로드
        const exceptionalImgs = []
        for (let i = 1; i <= 5; i++) {
          const imgContent = data?.find(c => c.section_name === `exceptional_retreat_image_${i}`)
          if (imgContent?.image_url) {
            exceptionalImgs.push(imgContent.image_url)
          }
        }
        setExceptionalImages(exceptionalImgs)
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

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `page-contents/${fileName}`

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

  const handleLocalUpdate = (section_name: string, field: string, value: string) => {
    console.log('handleLocalUpdate 호출 - section:', section_name, 'field:', field, 'value:', value)
    
    const existingContent = editedContents.find(c => c.section_name === section_name)
    
    if (!existingContent) {
      console.log('섹션이 없어서 새로 추가:', section_name)
      
      // 기본 contents에서 찾아보기
      const originalContent = contents.find(c => c.section_name === section_name)
      
      if (originalContent) {
        // 기존 데이터에 새 값만 업데이트해서 추가
        setEditedContents(prev => [...prev, {
          ...originalContent,
          [field]: value
        }])
      } else {
        console.error('원본 데이터에도 해당 섹션이 없음:', section_name)
      }
      return
    }
    
    // 기존 로직
    setEditedContents(prev => 
      prev.map(content => 
        content.section_name === section_name 
          ? { ...content, [field]: value }
          : content
      )
    )
  }
  
  const handleAddExtraImage = async (sectionPrefix: string) => {
    // 파일 선택 창 열기
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      // 파일 크기 체크
      if (file.size > 5 * 1024 * 1024) {
        showToast('파일 크기는 5MB 이하여야 합니다.', 'error')
        return
      }
      
      try {
        // 이미지 먼저 업로드
        const url = await uploadImage(file)
        if (!url) return
        
        // 현재 있는 추가 이미지 번호 확인
        const existingNumbers = []
        for (let i = 2; i <= 5; i++) {
          if (getContent(`${sectionPrefix}_${i}`)) {
            existingNumbers.push(i)
          }
        }
        
        // 빈 번호 찾기
        let newNumber = 0
        for (let i = 2; i <= 5; i++) {
          if (!existingNumbers.includes(i)) {
            newNumber = i
            break
          }
        }
        
        if (newNumber === 0) {
          showToast('최대 5개까지만 추가 가능합니다.', 'error')
          return
        }
        
        // DB에 새 이미지 추가 (업로드한 URL과 함께)
        const { error } = await supabase
          .from('cube45_page_contents')
          .insert({
            page_name: activeTab,
            section_name: `${sectionPrefix}_${newNumber}`,
            content_type: 'image',
            image_url: url,  // ← 업로드한 이미지 URL 사용
            display_order: newNumber,
            is_active: true
          })
        
        if (error) throw error
        fetchContents()
        showToast('이미지가 추가되었습니다.', 'success')
      } catch (error) {
        console.error('이미지 추가 실패:', error)
        showToast('이미지 추가에 실패했습니다.', 'error')
      }
    }
    
    // 파일 선택 창 열기
    input.click()
  }
  
  const handleDeleteExtraImage = async (sectionName: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    
    try {
      // 메인 이미지 삭제 시 번호 당기기
      if (sectionName === 'exclusive_cube_image' || sectionName === 'exceptional_retreat_image') {
        const prefix = sectionName.replace('_image', '')
        
        // 2~5번 이미지들 확인
        const images = []
        for (let i = 2; i <= 5; i++) {
          const img = getContent(`${prefix}_image_${i}`)
          if (img?.image_url) {
            images.push({ num: i, url: img.image_url })
          }
        }
        
        if (images.length > 0) {
          // 2번 이미지를 메인으로
          await supabase
            .from('cube45_page_contents')
            .update({ image_url: images[0].url })
            .eq('page_name', activeTab)
            .eq('section_name', sectionName)
          
          // 나머지 이미지들 번호 당기기
          for (let i = 0; i < images.length - 1; i++) {
            await supabase
              .from('cube45_page_contents')
              .update({ image_url: images[i + 1].url })
              .eq('page_name', activeTab)
              .eq('section_name', `${prefix}_image_${i + 2}`)
          }
          
          // 마지막 이미지 위치 삭제
          await supabase
            .from('cube45_page_contents')
            .delete()
            .eq('page_name', activeTab)
            .eq('section_name', `${prefix}_image_${images.length + 1}`)
        } else {
          // 추가 이미지가 없으면 메인 이미지만 null로
          await supabase
            .from('cube45_page_contents')
            .update({ image_url: null })
            .eq('page_name', activeTab)
            .eq('section_name', sectionName)
        }
      } 
      // 추가 이미지 삭제 시
      else {
        await supabase
          .from('cube45_page_contents')
          .delete()
          .eq('page_name', activeTab)
          .eq('section_name', sectionName)
      }
      
      fetchContents()
      showToast('이미지가 삭제되었습니다.', 'success')
    } catch (error) {
      console.error('이미지 삭제 실패:', error)
      showToast('이미지 삭제에 실패했습니다.', 'error')
    }
  }
  
  const handleSaveSection = async (sectionNames: string[]) => {
    setSavingSection(sectionNames[0])
    
    try {
      const updates = editedContents.filter(content => 
        sectionNames.includes(content.section_name)
      )
      
      if (updates.length === 0) {
        showToast('저장할 데이터가 없습니다.', 'error')
        setSavingSection(null)
        return
      }
  
      // 모든 탭이 같은 테이블 사용
      const updatePromises = updates.map(content => {
        const updateData: {
          title: string | null;
          subtitle: string | null;
          description: string | null;
          image_url: string | null;
          extra_data?: ExtraData | null;
        } = {
          title: content.title || null,
          subtitle: content.subtitle || null,
          description: content.description || null,
          image_url: content.image_url || null
        }
        
        // contact 페이지의 링크들은 extra_data에 저장
        if (activeTab === 'contact' && (content.section_name === 'kakao_link' || content.section_name === 'naver_link')) {
          updateData.extra_data = content.extra_data
        }
        
        return supabase
          .from('cube45_page_contents')
          .update(updateData)
          .eq('id', content.id)
      })
      
      const results = await Promise.all(updatePromises)
      
      showToast('저장되었습니다.', 'success')
      fetchContents()
    } catch (error) {
      console.error('저장 실패:', error)
      showToast('저장에 실패했습니다.', 'error')
    } finally {
      setSavingSection(null)
    }
  }

  const handleImageUpload = async (section_name: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    console.log('1. 파일 선택됨:', file?.name, 'section:', section_name)
    
    if (!file) return
  
    if (file.size > 5 * 1024 * 1024) {
      showToast('파일 크기는 5MB 이하여야 합니다.', 'error')
      return
    }
  
    console.log('2. 이미지 업로드 시작')
    const url = await uploadImage(file)
    console.log('3. 업로드된 URL:', url)
    
    if (url) {
      console.log('4. handleLocalUpdate 호출 - section:', section_name, 'url:', url)
      handleLocalUpdate(section_name, 'image_url', url)
      
      // 현재 editedContents 상태 확인
      console.log('5. 업데이트 후 editedContents:', editedContents.find(c => c.section_name === section_name))
    }
  }

  const handleCafeUpdate = async (section_name: string, updates: Partial<CafeItem>) => {
    try {
      const updateData: Record<string, string | ExtraData> = {}
      
      if (updates.title !== undefined) updateData.title = updates.title
      if (updates.image_url !== undefined) updateData.image_url = updates.image_url
      if (updates.tag !== undefined || updates.description !== undefined || updates.link !== undefined) {
        const currentCafe = cafes.find(c => c.section_name === section_name)
        updateData.extra_data = {
          tag: updates.tag !== undefined ? updates.tag : currentCafe?.tag,
          description: updates.description !== undefined ? updates.description : currentCafe?.description,
          link: updates.link !== undefined ? updates.link : currentCafe?.link
        }
      }

      const { error } = await supabase
        .from('cube45_page_contents')
        .update(updateData)
        .eq('page_name', 'tour')
        .eq('section_name', section_name)

      if (error) throw error
      
      showToast('저장되었습니다.', 'success')
      fetchContents()
    } catch (error) {
      console.error('카페 업데이트 실패:', error)
      showToast('저장에 실패했습니다.', 'error')
    }
  }
  
  const handleAddCafe = async () => {
    try {
      const newSectionName = `cafe_${Date.now()}`
      const newOrder = cafes.length + 1
      
      const { error } = await supabase
        .from('cube45_page_contents')
        .insert({
          page_name: 'tour',
          section_name: newSectionName,
          content_type: 'card',
          title: newCafe.title || '새 카페',
          image_url: newCafe.image_url || '',
          display_order: newOrder,
          is_active: true,
          extra_data: {
            tag: newCafe.tag || '#Cafe',
            description: newCafe.description || '설명을 입력하세요',
            link: newCafe.link || ''
          }
        })

      if (error) throw error
      
      showToast('추가되었습니다.', 'success')
      setAddingCafe(false)
      setNewCafe({
        id: 0,
        section_name: '',
        title: '',
        image_url: '',
        tag: '',
        description: '',
		link: '',  
        display_order: 0
      })
      fetchContents()
    } catch (error) {
      console.error('카페 추가 실패:', error)
      showToast('카페 추가에 실패했습니다.', 'error')
    }
  }

  const handleDeleteCafe = async (section_name: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    
    try {
      const { error } = await supabase
        .from('cube45_page_contents')
        .delete()
        .eq('page_name', 'tour')
        .eq('section_name', section_name)

      if (error) throw error
      
      showToast('카페가 삭제되었습니다.', 'success')
      fetchContents()
    } catch (error) {
      console.error('카페 삭제 실패:', error)
      showToast('카페 삭제에 실패했습니다.', 'error')
    }
  }

  const handleCafeImageUpload = async (section_name: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      showToast('파일 크기는 5MB 이하여야 합니다.', 'error')
      return
    }

    const url = await uploadImage(file)
    if (url) {
      handleCafeUpdate(section_name, { image_url: url })
    }
  }

  const getContent = (section_name: string) => {
    return editedContents.find(c => c.section_name === section_name)
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
              <h1 className="text-base md:text-2xl font-bold text-gray-900">CUBE45 관리</h1>
              <p className="mt-0.5 text-[10px] md:text-sm text-gray-500">CUBE45, 배치도, 관광정보 페이지 콘텐츠</p>
            </div>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="bg-white border-b px-2 md:px-8 overflow-x-auto">
          <nav className="flex space-x-2 md:space-x-8">
            <button
              onClick={() => setActiveTab('intro')}
              className={`py-2 md:py-4 px-1 border-b-2 font-medium text-[10px] md:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'intro'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              CUBE45
            </button>
            <button
              onClick={() => setActiveTab('location')}
              className={`py-2 md:py-4 px-1 border-b-2 font-medium text-[10px] md:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'location'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              배치도
            </button>
            <button
              onClick={() => setActiveTab('tour')}
              className={`py-2 md:py-4 px-1 border-b-2 font-medium text-[10px] md:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'tour'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              관광정보
            </button>
			<button
              onClick={() => setActiveTab('contact')}
              className={`py-2 md:py-4 px-1 border-b-2 font-medium text-[10px] md:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'contact'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              오시는길
            </button>  
          </nav>
        </div>

        <div className="p-2 md:p-8 space-y-3 md:space-y-8">
          {/* INTRO 탭 콘텐츠 */}
          {activeTab === 'intro' && (
            <>
              {/* 배너 섹션 */}
              <div className="bg-white rounded-lg shadow p-3 md:p-6">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h2 className="text-sm md:text-xl font-semibold text-black">배너 섹션</h2>
                  <button
                    onClick={() => handleSaveSection(['banner'])}
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
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">메인 타이틀</label>
                      <textarea
                        value={getContent('banner')?.title || ''}
                        onChange={(e) => handleLocalUpdate('banner', 'title', e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded resize-none text-[11px] md:text-base text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">서브 타이틀</label>
                      <textarea
                        value={getContent('banner')?.subtitle || ''}
                        onChange={(e) => handleLocalUpdate('banner', 'subtitle', e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded resize-none text-[11px] md:text-base text-black"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Exclusive Cube 섹션 */}
              <div className="bg-white rounded-lg shadow p-3 md:p-6">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h2 className="text-sm md:text-xl font-semibold text-black">Exclusive Cube</h2>
                  <button
                    onClick={() => handleSaveSection([
                      'exclusive_cube', 
                      'exclusive_cube_image_1',
                      'exclusive_cube_image_2',
                      'exclusive_cube_image_3',
                      'exclusive_cube_image_4',
                      'exclusive_cube_image_5'
                    ])}
                    disabled={savingSection === 'exclusive_cube'}
                    className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingSection === 'exclusive_cube' ? '저장 중...' : '저장'}
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
                  <div className="space-y-2 md:space-y-4">
                    <div>
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">제목</label>
                      <textarea
                        value={getContent('exclusive_cube')?.title || ''}
                        onChange={(e) => handleLocalUpdate('exclusive_cube', 'title', e.target.value)}
                        rows={3}
                        placeholder="Exclusive&#10;Cube of Joy"
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded resize-none text-[11px] md:text-base text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">부제목</label>
                      <textarea
                        value={getContent('exclusive_cube')?.subtitle || ''}
                        onChange={(e) => handleLocalUpdate('exclusive_cube', 'subtitle', e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded resize-none text-[11px] md:text-base text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">설명</label>
                      <textarea
                        value={getContent('exclusive_cube')?.description || ''}
                        onChange={(e) => handleLocalUpdate('exclusive_cube', 'description', e.target.value)}
                        rows={4}
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700">이미지</label>
                      <button
                        onClick={() => handleAddExtraImage('exclusive_cube_image')}
                        className="px-2 py-1 bg-green-600 text-white rounded text-[10px] hover:bg-green-700"
                      >
                        이미지 추가
                      </button>
                    </div>
                    
                    <div className="relative mb-2">
                      <div className="w-full h-32 md:h-64 bg-gray-100 rounded-lg overflow-hidden relative">
                        {getContent('exclusive_cube_image')?.image_url ? (
                          <Image
                            src={getContent('exclusive_cube_image')?.image_url || ''}
                            alt="Exclusive Cube 메인 이미지"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span className="text-[10px] md:text-sm">메인 이미지</span>
                          </div>
                        )}
                      </div>
                      {/* 삭제 버튼 추가 */}
                      {getContent('exclusive_cube_image')?.image_url && (
                        <button
                          onClick={() => handleDeleteExtraImage('exclusive_cube_image')}
                          className="absolute top-1 right-1 md:top-2 md:right-2 bg-red-500 text-white rounded-full w-6 h-6 md:w-8 md:h-8 text-sm md:text-base hover:bg-red-600"
                        >
                          ×
                        </button>
                      )}
                      <label className="absolute bottom-1 right-1 md:bottom-4 md:right-4 bg-white px-2 md:px-4 py-0.5 md:py-2 rounded shadow cursor-pointer hover:bg-gray-50">
                        <span className="text-[10px] md:text-sm font-medium text-gray-700">변경</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={(e) => handleImageUpload('exclusive_cube_image', e)}
                        />
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[2, 3, 4, 5].map((num) => {
                        const imageContent = getContent(`exclusive_cube_image_${num}`)
                        if (!imageContent) return null
                        
                        return (
                          <div key={num} className="relative">
                            <div className="w-full h-20 md:h-24 bg-gray-100 rounded-lg overflow-hidden relative">
                              {imageContent.image_url ? (
                                <Image
                                  src={imageContent.image_url}
                                  alt={`추가 이미지 ${num}`}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <span className="text-[10px]">이미지 {num}</span>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteExtraImage(`exclusive_cube_image_${num}`)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                            >
                              ×
                            </button>
                            <label className="absolute bottom-1 left-1 bg-white px-1 py-0.5 rounded shadow cursor-pointer text-[8px]">
                              변경
                              <input
                                type="file"
                                className="sr-only"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(`exclusive_cube_image_${num}`, e)}
                              />
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Exceptional Retreat 섹션 */}
              <div className="bg-white rounded-lg shadow p-3 md:p-6">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h2 className="text-sm md:text-xl font-semibold text-black">Exceptional Retreat</h2>
                  <button
                    onClick={() => handleSaveSection([
                      'exceptional_retreat',
                      'exceptional_retreat_image_1',
                      'exceptional_retreat_image_2',
                      'exceptional_retreat_image_3',
                      'exceptional_retreat_image_4',
                      'exceptional_retreat_image_5'
                    ])}
                    disabled={savingSection === 'exceptional_retreat'}
                    className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingSection === 'exceptional_retreat' ? '저장 중...' : '저장'}
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
                  <div className="space-y-2 md:space-y-4">
                    <div>
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">제목</label>
                      <textarea
                        value={getContent('exceptional_retreat')?.title || ''}
                        onChange={(e) => handleLocalUpdate('exceptional_retreat', 'title', e.target.value)}
                        rows={4}
                        placeholder="An Exceptional&#10;Retreat"
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded resize-none text-[11px] md:text-base text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">부제목</label>
                      <textarea
                        value={getContent('exceptional_retreat')?.subtitle || ''}
                        onChange={(e) => handleLocalUpdate('exceptional_retreat', 'subtitle', e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded resize-none text-[11px] md:text-base text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">설명</label>
                      <textarea
                        value={getContent('exceptional_retreat')?.description || ''}
                        onChange={(e) => handleLocalUpdate('exceptional_retreat', 'description', e.target.value)}
                        rows={4}
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700">이미지</label>
                      <button
                        onClick={() => handleAddExtraImage('exceptional_retreat_image')}
                        className="px-2 py-1 bg-green-600 text-white rounded text-[10px] hover:bg-green-700"
                      >
                        이미지 추가
                      </button>
                    </div>
                    
                    <div className="relative mb-2">
                      <div className="w-full h-32 md:h-64 bg-gray-100 rounded-lg overflow-hidden relative">
                        {getContent('exceptional_retreat_image')?.image_url ? (
                          <Image
                            src={getContent('exceptional_retreat_image')?.image_url || ''}
                            alt="Exceptional Retreat 메인 이미지"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span className="text-[10px] md:text-sm">메인 이미지</span>
                          </div>
                        )}
                      </div>
                      {/* 삭제 버튼 추가 */}
                      {getContent('exceptional_retreat_image')?.image_url && (
                        <button
                          onClick={() => handleDeleteExtraImage('exceptional_retreat_image')}
                          className="absolute top-1 right-1 md:top-2 md:right-2 bg-red-500 text-white rounded-full w-6 h-6 md:w-8 md:h-8 text-sm md:text-base hover:bg-red-600"
                        >
                          ×
                        </button>
                      )}
                      <label className="absolute bottom-1 right-1 md:bottom-4 md:right-4 bg-white px-2 md:px-4 py-0.5 md:py-2 rounded shadow cursor-pointer hover:bg-gray-50">
                        <span className="text-[10px] md:text-sm font-medium text-gray-700">변경</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={(e) => handleImageUpload('exceptional_retreat_image', e)}
                        />
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[2, 3, 4, 5].map((num) => {
                        const imageContent = getContent(`exceptional_retreat_image_${num}`)
                        if (!imageContent) return null
                        
                        return (
                          <div key={num} className="relative">
                            <div className="w-full h-20 md:h-24 bg-gray-100 rounded-lg overflow-hidden relative">
                              {imageContent.image_url ? (
                                <Image
                                  src={imageContent.image_url}
                                  alt={`추가 이미지 ${num}`}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <span className="text-[10px]">이미지 {num}</span>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteExtraImage(`exceptional_retreat_image_${num}`)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                            >
                              ×
                            </button>
                            <label className="absolute bottom-1 left-1 bg-white px-1 py-0.5 rounded shadow cursor-pointer text-[8px]">
                              변경
                              <input
                                type="file"
                                className="sr-only"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(`exceptional_retreat_image_${num}`, e)}
                              />
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* LOCATION 탭 콘텐츠 */}
          {activeTab === 'location' && (
            <>
              {/* 배너 섹션 */}
              <div className="bg-white rounded-lg shadow p-3 md:p-6">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h2 className="text-sm md:text-xl font-semibold text-black">배너 섹션</h2>
                  <button
                    onClick={() => handleSaveSection(['banner'])}
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
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">메인 타이틀</label>
                      <textarea
                        value={getContent('banner')?.title || ''}
                        onChange={(e) => handleLocalUpdate('banner', 'title', e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded resize-none text-[11px] md:text-base text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">서브 타이틀</label>
                      <textarea
                        value={getContent('banner')?.subtitle || ''}
                        onChange={(e) => handleLocalUpdate('banner', 'subtitle', e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded resize-none text-[11px] md:text-base text-black"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Layout 섹션 */}
              <div className="bg-white rounded-lg shadow p-3 md:p-6">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h2 className="text-sm md:text-xl font-semibold text-black">Layout 섹션</h2>
                  <button
                    onClick={() => handleSaveSection(['layout_text', 'layout_image'])}
                    disabled={savingSection === 'layout_text'}
                    className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingSection === 'layout_text' ? '저장 중...' : '저장'}
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
                  <div className="space-y-2 md:space-y-4">
                    <div>
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">제목</label>
                      <textarea
                        value={getContent('layout_text')?.title || ''}
                        onChange={(e) => handleLocalUpdate('layout_text', 'title', e.target.value)}
                        rows={3}
                        placeholder="CUBE 45&#10;LAYOUT"
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded resize-none text-[11px] md:text-base text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">부제목</label>
                      <textarea
                        value={getContent('layout_text')?.subtitle || ''}
                        onChange={(e) => handleLocalUpdate('layout_text', 'subtitle', e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded resize-none text-[11px] md:text-base text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">설명</label>
                      <textarea
                        value={getContent('layout_text')?.description || ''}
                        onChange={(e) => handleLocalUpdate('layout_text', 'description', e.target.value)}
                        rows={4}
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">배치도 이미지</label>
                    <div className="relative">
                      <div className="w-full h-32 md:h-64 bg-gray-100 rounded-lg overflow-hidden relative">
                        {getContent('layout_image')?.image_url ? (
                          <Image
                            src={getContent('layout_image')?.image_url || ''}
                            alt="배치도 이미지"
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
                          onChange={(e) => handleImageUpload('layout_image', e)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TOUR 탭 콘텐츠 */}
          {activeTab === 'tour' && (
            <>
              {/* 배너 섹션 */}
              <div className="bg-white rounded-lg shadow p-3 md:p-6">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h2 className="text-sm md:text-xl font-semibold text-black">배너 섹션</h2>
                  <button
                    onClick={() => handleSaveSection(['banner'])}
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
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">메인 타이틀</label>
                      <textarea
                        value={getContent('banner')?.title || ''}
                        onChange={(e) => handleLocalUpdate('banner', 'title', e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded resize-none text-[11px] md:text-base text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">서브 타이틀</label>
                      <textarea
                        value={getContent('banner')?.subtitle || ''}
                        onChange={(e) => handleLocalUpdate('banner', 'subtitle', e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded resize-none text-[11px] md:text-base text-black"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tour 소개 텍스트 */}
              <div className="bg-white rounded-lg shadow p-3 md:p-6">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h2 className="text-sm md:text-xl font-semibold text-black">소개 섹션</h2>
                  <button
                    onClick={() => handleSaveSection(['tour_intro'])}
                    disabled={savingSection === 'tour_intro'}
                    className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingSection === 'tour_intro' ? '저장 중...' : '저장'}
                  </button>
                </div>
                <div className="space-y-2 md:space-y-4">
                  <div>
                    <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">제목</label>
                    <textarea
                      value={getContent('tour_intro')?.title || ''}
                      onChange={(e) => handleLocalUpdate('tour_intro', 'title', e.target.value)}
                      rows={3}
                      placeholder="Exclusive&#10;Cube of Joy"
                      className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded resize-none text-[11px] md:text-base text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">부제목</label>
                    <textarea
                      value={getContent('tour_intro')?.subtitle || ''}
                      onChange={(e) => handleLocalUpdate('tour_intro', 'subtitle', e.target.value)}
                      rows={2}
                      className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded resize-none text-[11px] md:text-base text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">설명</label>
                    <textarea
                      value={getContent('tour_intro')?.description || ''}
                      onChange={(e) => handleLocalUpdate('tour_intro', 'description', e.target.value)}
                      rows={4}
                      className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                    />
                  </div>
                </div>
              </div>

              {/* 카페 목록 */}
              <div className="bg-white rounded-lg shadow p-3 md:p-6">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h2 className="text-sm md:text-xl font-semibold text-black">목록</h2>
                  <button
                    onClick={() => setAddingCafe(true)}
                    className="px-2 md:px-4 py-1 md:py-2 bg-green-600 text-white rounded text-[10px] md:text-sm hover:bg-green-700"
                  >
                    추가
                  </button>
                </div>
                
                {/* 새 카페 추가 폼 */}
                {addingCafe && (
                  <div className="border rounded-lg p-3 md:p-4 mb-3 md:mb-4 bg-gray-50">
                    <h3 className="font-semibold mb-2 md:mb-3 text-xs md:text-base text-black">새 카페 추가</h3>
                    <div className="space-y-2 md:space-y-3">
                      <div>
                        <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">이미지</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                showToast('파일 크기는 5MB 이하여야 합니다.', 'error')
                                return
                              }
                              const url = await uploadImage(file)
                              if (url) {
                                setNewCafe({...newCafe, image_url: url})
                                showToast('이미지가 업로드되었습니다.', 'success')
                              }
                            }
                          }}
                          className="w-full px-2 py-1 md:px-3 md:py-2 border rounded text-[11px] md:text-sm text-black"
                        />
                        {newCafe.image_url && (
                          <div className="mt-2 w-20 h-16 md:w-32 md:h-24 relative rounded overflow-hidden">
                            <Image
                              src={newCafe.image_url}
                              alt="미리보기"
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        value={newCafe.title}
                        onChange={(e) => setNewCafe({...newCafe, title: e.target.value})}
                        placeholder="카페 이름"
                        className="w-full px-2 py-1 md:px-3 md:py-2 border rounded text-[11px] md:text-sm text-black"
                      />
                      <input
                        type="text"
                        value={newCafe.tag}
                        onChange={(e) => setNewCafe({...newCafe, tag: e.target.value})}
                        placeholder="태그 (예: #Cafe)"
                        className="w-full px-2 py-1 md:px-3 md:py-2 border rounded text-[11px] md:text-sm text-black"
                      />
                      <textarea
                        value={newCafe.description}
                        onChange={(e) => setNewCafe({...newCafe, description: e.target.value})}
                        placeholder="설명"
                        rows={4}
                        className="w-full px-2 py-1 md:px-3 md:py-2 border rounded text-[11px] md:text-sm text-black"
                      />
                      <input
                        type="text"
                        value={newCafe.link}
                        onChange={(e) => setNewCafe({...newCafe, link: e.target.value})}
                        placeholder="링크"
                        className="w-full px-2 py-1 md:px-3 md:py-2 border rounded text-[11px] md:text-sm text-black"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddCafe}
                          className="px-3 py-1 md:px-4 md:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-[10px] md:text-sm"
                        >
                          추가
                        </button>
                        <button
                          onClick={() => {
                            setAddingCafe(false)
                            setNewCafe({
                              id: 0,
                              section_name: '',
                              title: '',
                              image_url: '',
                              tag: '',
                              description: '',
							  link: '',	
                              display_order: 0
                            })
                          }}
                          className="px-3 py-1 md:px-4 md:py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-[10px] md:text-sm"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3 md:space-y-4">
                  {cafes.map((cafe) => (
                    <div key={cafe.section_name} className="border rounded-lg p-3 md:p-4">
                      <div className="flex gap-3 md:gap-4">
                        {/* 이미지 */}
                        <div className="w-20 h-16 md:w-32 md:h-24 bg-gray-100 rounded overflow-hidden flex-shrink-0 relative">
                          {cafe.image_url && cafe.image_url !== '' ? (
                            <Image
                              src={cafe.image_url}
                              alt={cafe.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <span className="text-[10px] md:text-xs">이미지 없음</span>
                            </div>
                          )}
                        </div>
                        
                        {/* 편집 영역 */}
                        <div className="flex-1">
                          {editingCafe === cafe.section_name ? (
                            <div className="space-y-2 md:space-y-3">
                              <input
                                type="text"
                                value={cafe.title}
                                onChange={(e) => {
                                  const newCafes = cafes.map(c => 
                                    c.section_name === cafe.section_name 
                                      ? { ...c, title: e.target.value }
                                      : c
                                  )
                                  setCafes(newCafes)
                                }}
                                placeholder="카페 이름"
                                className="w-full px-2 py-1 border rounded text-[11px] md:text-sm text-black"
                              />
                              <input
                                type="text"
                                value={cafe.tag}
                                onChange={(e) => {
                                  const newCafes = cafes.map(c => 
                                    c.section_name === cafe.section_name 
                                      ? { ...c, tag: e.target.value }
                                      : c
                                  )
                                  setCafes(newCafes)
                                }}
                                placeholder="태그"
                                className="w-full px-2 py-1 border rounded text-[11px] md:text-sm text-black"
                              />
                              <textarea
                                value={cafe.description}
                                onChange={(e) => {
                                  const newCafes = cafes.map(c => 
                                    c.section_name === cafe.section_name 
                                      ? { ...c, description: e.target.value }
                                      : c
                                  )
                                  setCafes(newCafes)
                                }}
                                placeholder="설명"
                                rows={4}
                                className="w-full px-2 py-1 border rounded text-[11px] md:text-sm text-black"
                              />
                              <input
                                type="text"
                                value={cafe.link}
                                onChange={(e) => {
                                  const newCafes = cafes.map(c => 
                                    c.section_name === cafe.section_name 
                                      ? { ...c, link: e.target.value }
                                      : c
                                  )
                                  setCafes(newCafes)
                                }}
                                placeholder="링크"
                                className="w-full px-2 py-1 border rounded text-[11px] md:text-sm text-black"
                              />
                              <div className="flex gap-1 md:gap-2">
                                <button
                                  onClick={() => {
                                    const updatedCafe = cafes.find(c => c.section_name === cafe.section_name)
                                    if (updatedCafe) {
                                      handleCafeUpdate(cafe.section_name, {
                                        title: updatedCafe.title,
                                        tag: updatedCafe.tag,
                                        description: updatedCafe.description,
                                        link: updatedCafe.link
                                      })
                                    }
                                    setEditingCafe(null)
                                  }}
                                  className="px-2 py-0.5 md:px-3 md:py-1 bg-blue-500 text-white rounded text-[10px] md:text-sm hover:bg-blue-600"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCafe(null)
                                    fetchContents()
                                  }}
                                  className="px-2 py-0.5 md:px-3 md:py-1 bg-gray-300 text-gray-700 rounded text-[10px] md:text-sm hover:bg-gray-400"
                                >
                                  취소
                                </button>
                                <label className="px-2 py-0.5 md:px-3 md:py-1 bg-green-500 text-white rounded text-[10px] md:text-sm hover:bg-green-600 cursor-pointer">
                                  이미지
                                  <input
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={(e) => handleCafeImageUpload(cafe.section_name, e)}
                                  />
                                </label>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <h3 className="font-semibold text-xs md:text-base text-black">{cafe.title}</h3>
                              <p className="text-[10px] md:text-sm text-gray-500">{cafe.tag}</p>
                              <p className="text-[10px] md:text-sm text-gray-700 mt-0.5 md:mt-1">{cafe.description}</p>
                              <div className="mt-2 flex gap-1 md:gap-2">
                                <button
                                  onClick={() => setEditingCafe(cafe.section_name)}
                                  className="px-2 py-0.5 md:px-3 md:py-1 bg-blue-500 text-white rounded text-[10px] md:text-sm hover:bg-blue-600"
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => handleDeleteCafe(cafe.section_name)}
                                  className="px-2 py-0.5 md:px-3 md:py-1 bg-red-500 text-white rounded text-[10px] md:text-sm hover:bg-red-600"
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
		  	
		  {/* CONTACT 탭 콘텐츠 */}
          {activeTab === 'contact' && (
            <>
              {/* 배너 섹션 */}
              <div className="bg-white rounded-lg shadow p-3 md:p-6">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h2 className="text-sm md:text-xl font-semibold text-black">배너 섹션</h2>
                  <button
                    onClick={() => handleSaveSection(['banner'])}
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
                     <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">메인 타이틀</label>
                     <input
                       type="text"
                       value={getContent('banner')?.title || ''}
                       onChange={(e) => handleLocalUpdate('banner', 'title', e.target.value)}
                       className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                     />
                   </div>
                 </div>
                </div>
              </div>

              {/* Contact 페이지 콘텐츠 관리 */}
              <div className="bg-white rounded-lg shadow p-3 md:p-6">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h2 className="text-sm md:text-xl font-semibold text-black">오시는길 콘텐츠</h2>
                  <button
                    onClick={() => handleSaveSection(['left_image', 'map_image', 'kakao_link', 'naver_link'])}
                    disabled={savingSection === 'left_image'}
                    className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded text-[10px] md:text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingSection === 'left_image' ? '저장 중...' : '저장'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 왼쪽 이미지 영역 */}
                  <div>
                    <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">왼쪽 사진 영역</label>
                    <div className="relative">
                      <div className="w-full h-32 md:h-94 bg-gray-100 rounded-lg overflow-hidden relative">
                        {getContent('left_image')?.image_url ? (
                          <Image
                            src={getContent('left_image')?.image_url || ''}
                            alt="왼쪽 이미지"
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
                          onChange={(e) => handleImageUpload('left_image', e)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* 오른쪽 지도 대체 이미지 */}
                  <div>
                    <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">오른쪽 지도 영역 (이미지)</label>
                    <div className="relative">
                      <div className="w-full h-32 md:h-94 bg-gray-100 rounded-lg overflow-hidden relative">
                        {getContent('map_image')?.image_url ? (
                          <Image
                            src={getContent('map_image')?.image_url || ''}
                            alt="지도 대체 이미지"
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
                          onChange={(e) => handleImageUpload('map_image', e)}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* 지도 링크 관리 */}
                <div className="mt-6 space-y-3">
                  <div>
                    <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">카카오맵 바로가기 링크</label>
                    <input
                      type="text"
                      value={getContent('kakao_link')?.extra_data?.link || ''}
                      onChange={(e) => {
                        const current = getContent('kakao_link')
                        if (current) {
                          const updatedExtraData = { ...current.extra_data, link: e.target.value }
                          handleLocalUpdate('kakao_link', 'extra_data', JSON.stringify(updatedExtraData))
                        }
                      }}
                      placeholder="https://map.kakao.com/..."
                      className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">네이버지도 바로가기 링크</label>
                    <input
                      type="text"
                      value={getContent('naver_link')?.extra_data?.link || ''}
                      onChange={(e) => {
                        const current = getContent('naver_link')
                        if (current) {
                          handleLocalUpdate('naver_link', 'extra_data', JSON.stringify({ ...current.extra_data, link: e.target.value }))
                        }
                      }}
                      placeholder="https://map.naver.com/..."
                      className="w-full px-2 py-1 md:px-3 md:py-2 border border-gray-300 rounded text-[11px] md:text-base text-black"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}