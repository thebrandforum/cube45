'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import AdminNavigation from '@/components/admin/navigation'

interface SliderContent {
  id: number
  image_url: string
  title: string
  subtitle: string
  display_order: number
  is_active: boolean
}

interface SectionContent {
  id: number
  section_type: string
  subtitle: string
  title: string
  description: string
  image_url: string
}

export default function ContentManage() {
  const [activeTab, setActiveTab] = useState<'slider' | 'villa' | 'cube45' | 'indoor' | 'contact'>('slider')
  const [sliders, setSliders] = useState<SliderContent[]>([])
  const [cube45, setCube45] = useState<SectionContent | null>(null)
  const [villaData, setVillaData] = useState<Record<string, SectionContent>>({})
  const [indoorPool, setIndoorPool] = useState<SectionContent | null>(null)
  const [contactData, setContactData] = useState<{
    reservation: SectionContent | null
    onsite: SectionContent | null
  }>({ reservation: null, onsite: null })
  
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragAreaRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    fetchContent()
  }, [])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000)
  }

  const fetchContent = async () => {
    try {
      const { data: allData, error } = await supabase
        .from('cube45_main_contents')
        .select('*')

      if (error) throw error

      const sliderData = allData?.filter(item => item.section_type === 'slider')
        .sort((a, b) => a.display_order - b.display_order) || []
      setSliders(sliderData)

      const cube45Data = allData?.find(item => item.section_type === 'cube45')
      setCube45(cube45Data || null)

      const villaMap: Record<string, SectionContent> = {}
      const villaTypes = ['villa_A', 'villa_B', 'villa_C', 'villa_D']
      villaTypes.forEach(type => {
        const villa = allData?.find(item => item.section_type === type)
        if (villa) {
          const zone = type.split('_')[1]
          villaMap[zone] = villa
        }
      })
      setVillaData(villaMap)

      const indoorData = allData?.find(item => item.section_type === 'indoor_pool')
      setIndoorPool(indoorData || null)

      const reservationData = allData?.find(item => item.section_type === 'contact_reservation')
      const onsiteData = allData?.find(item => item.section_type === 'contact_onsite')
      setContactData({
        reservation: reservationData || null,
        onsite: onsiteData || null
      })

    } catch (error) {
      console.error('데이터 로드 실패:', error)
      showToast('데이터를 불러오는데 실패했습니다.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true)
      setUploadProgress(30)
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `main-contents/${fileName}`

      setUploadProgress(60)

      const { data, error } = await supabase.storage
        .from('cube45-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      setUploadProgress(90)

      const { data: { publicUrl } } = supabase.storage
        .from('cube45-images')
        .getPublicUrl(filePath)

      setUploadProgress(100)
      
      return publicUrl
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      showToast('이미지 업로드에 실패했습니다.', 'error')
      return null
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      await handleNewSliderImage(file)
    } else {
      showToast('이미지 파일만 업로드 가능합니다.', 'error')
    }
  }

  const handleNewSliderImage = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      showToast('파일 크기는 5MB 이하여야 합니다.', 'error')
      return
    }

    const url = await uploadImage(file)
    if (url) {
      try {
        const { error } = await supabase
          .from('cube45_main_contents')
          .insert({
            section_type: 'slider',
            image_url: url,
            title: '',
            subtitle: '',
            display_order: sliders.length + 1,
            is_active: true
          })

        if (error) throw error
        
        showToast('슬라이더가 추가되었습니다.', 'success')
        fetchContent()
      } catch (error) {
        console.error('슬라이더 추가 실패:', error)
        showToast('슬라이더 추가에 실패했습니다.', 'error')
      }
    }
  }

  const handleOrderChange = async (sliderId: number, newOrder: number) => {
    try {
      const currentSlider = sliders.find(s => s.id === sliderId)
      if (!currentSlider) return
      
      const oldOrder = currentSlider.display_order
      
      if (oldOrder === newOrder) return
      
      const updates: { id: number; display_order: number }[] = []
      
      if (newOrder < oldOrder) {
        sliders.forEach(slider => {
          if (slider.id === sliderId) {
            updates.push({ id: slider.id, display_order: newOrder })
          } else if (slider.display_order >= newOrder && slider.display_order < oldOrder) {
            updates.push({ id: slider.id, display_order: slider.display_order + 1 })
          }
        })
      } else {
        sliders.forEach(slider => {
          if (slider.id === sliderId) {
            updates.push({ id: slider.id, display_order: newOrder })
          } else if (slider.display_order > oldOrder && slider.display_order <= newOrder) {
            updates.push({ id: slider.id, display_order: slider.display_order - 1 })
          }
        })
      }
      
      const updatePromises = updates.map(update =>
        supabase
          .from('cube45_main_contents')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
      )
      
      await Promise.all(updatePromises)
      
      showToast('순서가 변경되었습니다.', 'success')
      fetchContent()
    } catch (error) {
      console.error('순서 변경 실패:', error)
      showToast('순서 변경에 실패했습니다.', 'error')
    }
  }

  const handleUpdateSlider = async (id: number, field: string, value: string | boolean | number) => {
    try {
      const { error } = await supabase
        .from('cube45_main_contents')
        .update({ [field]: value })
        .eq('id', id)

      if (error) throw error
      
      if (field === 'image_url') {
        showToast('이미지가 변경되었습니다.', 'success')
      }
      
      fetchContent()
    } catch (error) {
      console.error('슬라이더 수정 실패:', error)
      showToast('수정에 실패했습니다.', 'error')
    }
  }

  const handleDeleteSlider = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const sliderToDelete = sliders.find(s => s.id === id)
      if (!sliderToDelete) return
      
      const deletedOrder = sliderToDelete.display_order
      
      const { error: deleteError } = await supabase
        .from('cube45_main_contents')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      
      const updates = sliders
        .filter(s => s.display_order > deletedOrder)
        .map(s => ({
          id: s.id,
          display_order: s.display_order - 1
        }))
      
      if (updates.length > 0) {
        const updatePromises = updates.map(update =>
          supabase
            .from('cube45_main_contents')
            .update({ display_order: update.display_order })
            .eq('id', update.id)
        )
        
        await Promise.all(updatePromises)
      }
      
      showToast('삭제되었습니다.', 'success')
      fetchContent()
    } catch (error) {
      console.error('슬라이더 삭제 실패:', error)
      showToast('삭제에 실패했습니다.', 'error')
    }
  }

  const handleUpdateVilla = async (zone: string, imageUrl: string) => {
    try {
      const { error } = await supabase
        .from('cube45_main_contents')
        .update({ image_url: imageUrl })
        .eq('section_type', `villa_${zone}`)

      if (error) throw error
      
      showToast(`${zone}동 이미지가 변경되었습니다.`, 'success')
      fetchContent()
    } catch (error) {
      console.error('풀빌라 이미지 수정 실패:', error)
      showToast('수정에 실패했습니다.', 'error')
    }
  }

  const handleUpdateCube45 = async () => {
    if (!cube45) return

    try {
      const { error } = await supabase
        .from('cube45_main_contents')
        .update({
          subtitle: cube45.subtitle,
          title: cube45.title,
          description: cube45.description,
          image_url: cube45.image_url
        })
        .eq('section_type', 'cube45')

      if (error) throw error
      
      showToast('CUBE 45 섹션이 업데이트되었습니다.', 'success')
      fetchContent()
    } catch (error) {
      console.error('CUBE 45 수정 실패:', error)
      showToast('수정에 실패했습니다.', 'error')
    }
  }

  const handleUpdateIndoorPool = async () => {
    if (!indoorPool) return

    try {
      const { error } = await supabase
        .from('cube45_main_contents')
        .update({
          title: indoorPool.title,
          subtitle: indoorPool.subtitle,
          image_url: indoorPool.image_url
        })
        .eq('section_type', 'indoor_pool')

      if (error) throw error
      
      showToast('INDOOR POOL 섹션이 업데이트되었습니다.', 'success')
      fetchContent()
    } catch (error) {
      console.error('INDOOR POOL 수정 실패:', error)
      showToast('수정에 실패했습니다.', 'error')
    }
  }

  const handleUpdateContact = async (type: 'reservation' | 'onsite') => {
    const data = type === 'reservation' ? contactData.reservation : contactData.onsite
    if (!data) return

    try {
      const { error } = await supabase
        .from('cube45_main_contents')
        .update({
          title: data.title,
          subtitle: data.subtitle,
          description: data.description,
          image_url: data.image_url
        })
        .eq('section_type', `contact_${type}`)

      if (error) throw error
      
      showToast(`${type === 'reservation' ? '예약문의' : '현장문의'} 섹션이 업데이트되었습니다.`, 'success')
      fetchContent()
    } catch (error) {
      console.error('문의 섹션 수정 실패:', error)
      showToast('수정에 실패했습니다.', 'error')
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
        <div className={`fixed top-4 right-4 z-50 px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-lg transition-all transform ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white text-sm md:text-base`}>
          {toast.message}
        </div>
      )}

      <main className="flex-1 mt-14 md:mt-0 md:ml-48">
        {/* 헤더 */}
        <div className="bg-white border-b px-3 md:px-8 py-3 md:py-6">
          <h1 className="text-base md:text-2xl font-bold text-gray-900">메인 콘텐츠 관리</h1>
          <p className="mt-0.5 text-[10px] md:text-sm text-gray-500">메인 페이지의 모든 섹션을 관리합니다</p>
        </div>

        {/* 탭 - 모바일 스크롤 */}
        <div className="bg-white border-b px-2 md:px-8 overflow-x-auto">
          <nav className="flex space-x-2 md:space-x-8">
            <button
              onClick={() => setActiveTab('slider')}
              className={`py-2 md:py-4 px-1 border-b-2 font-medium text-[10px] md:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'slider'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              슬라이더
            </button>
            <button
              onClick={() => setActiveTab('villa')}
              className={`py-2 md:py-4 px-1 border-b-2 font-medium text-[10px] md:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'villa'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              풀빌라
            </button>
            <button
              onClick={() => setActiveTab('cube45')}
              className={`py-2 md:py-4 px-1 border-b-2 font-medium text-[10px] md:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'cube45'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              CUBE 45
            </button>
            <button
              onClick={() => setActiveTab('indoor')}
              className={`py-2 md:py-4 px-1 border-b-2 font-medium text-[10px] md:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'indoor'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              INDOOR
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`py-2 md:py-4 px-1 border-b-2 font-medium text-[10px] md:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'contact'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              문의
            </button>
          </nav>
        </div>

        <div className="p-2 md:p-8">
          {/* 슬라이더 관리 */}
          {activeTab === 'slider' && (
            <div className="space-y-3 md:space-y-6">
              {/* 업로드 영역 */}
              <div
                ref={dragAreaRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`bg-white border-2 border-dashed transition-all rounded ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="p-4 md:p-8 text-center">
                  <svg className="mx-auto h-8 md:h-12 w-8 md:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mt-1 text-[10px] md:text-sm text-gray-600">
                    <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">
                      <span>파일 선택</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleNewSliderImage(file)
                        }}
                      />
                    </label>
                    <span className="hidden md:inline"> 또는 드래그</span>
                  </p>
                  <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">PNG, JPG (최대 5MB)</p>
                  
                  {uploading && (
                    <div className="mt-2 md:mt-4">
                      <div className="bg-gray-200 rounded-full h-1.5 md:h-2 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">업로드 중... {uploadProgress}%</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 슬라이더 목록 - 모바일 카드 뷰 */}
              <div className="md:hidden space-y-3">
                {sliders.map((slider) => (
                  <div key={slider.id} className="bg-white rounded-lg shadow p-3 border border-gray-200">
                    {/* 이미지 */}
                    <div className="relative w-full h-24 bg-gray-100 overflow-hidden mb-2 rounded">
                      <img
                        src={slider.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <label className="absolute inset-0 cursor-pointer opacity-0 active:opacity-100 bg-black bg-opacity-50 flex items-center justify-center transition-opacity">
                        <span className="text-white text-[10px]">변경</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const url = await uploadImage(file)
                              if (url) handleUpdateSlider(slider.id, 'image_url', url)
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* 제목/부제목 */}
                    {editingId === slider.id ? (
                      <div className="space-y-1.5 mb-2">
                        <input
                          type="text"
                          value={slider.title || ''}
                          onChange={(e) => handleUpdateSlider(slider.id, 'title', e.target.value)}
                          placeholder="제목"
                          className="w-full px-2 py-1 text-[11px] border rounded text-black"
                        />
                        <input
                          type="text"
                          value={slider.subtitle || ''}
                          onChange={(e) => handleUpdateSlider(slider.id, 'subtitle', e.target.value)}
                          placeholder="부제목"
                          className="w-full px-2 py-1 text-[11px] border rounded text-black"
                        />
                      </div>
                    ) : (
                      <div className="text-[11px] mb-2">
                        <div className="font-medium text-gray-900">{slider.title || '제목 없음'}</div>
                        <div className="text-gray-500 text-[10px]">{slider.subtitle || '부제목 없음'}</div>
                      </div>
                    )}

                    {/* 순서/상태/액션 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={slider.display_order}
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value)
                            if (!isNaN(newValue) && newValue > 0) {
                              handleOrderChange(slider.id, newValue)
                            }
                          }}
                          className="w-10 px-1 py-0.5 text-[11px] text-center border rounded text-black"
                          min="1"
                        />
                        <button
                          onClick={() => handleUpdateSlider(slider.id, 'is_active', !slider.is_active)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            slider.is_active ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              slider.is_active ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingId(editingId === slider.id ? null : slider.id)}
                          className="text-blue-600 hover:text-blue-900 text-[11px]"
                        >
                          {editingId === slider.id ? '완료' : '수정'}
                        </button>
                        <button
                          onClick={() => handleDeleteSlider(slider.id)}
                          className="text-red-600 hover:text-red-900 text-[11px]"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 슬라이더 목록 테이블 - 데스크톱 */}
              <div className="hidden md:block bg-white shadow overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        이미지
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        제목 / 부제목
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        순서
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        액션
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sliders.map((slider) => (
                      <tr key={slider.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="relative w-20 h-12 bg-gray-100 overflow-hidden">
                            <img
                              src={slider.image_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            <label className="absolute inset-0 cursor-pointer opacity-0 hover:opacity-100 bg-black bg-opacity-50 flex items-center justify-center transition-opacity">
                              <span className="text-white text-xs">변경</span>
                              <input
                                type="file"
                                className="sr-only"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    const url = await uploadImage(file)
                                    if (url) handleUpdateSlider(slider.id, 'image_url', url)
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {editingId === slider.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={slider.title || ''}
                                onChange={(e) => handleUpdateSlider(slider.id, 'title', e.target.value)}
                                placeholder="제목"
                                className="w-full px-2 py-1 text-sm border rounded text-black"
                              />
                              <input
                                type="text"
                                value={slider.subtitle || ''}
                                onChange={(e) => handleUpdateSlider(slider.id, 'subtitle', e.target.value)}
                                placeholder="부제목"
                                className="w-full px-2 py-1 text-sm border rounded text-black"
                              />
                            </div>
                          ) : (
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">{slider.title || '제목 없음'}</div>
                              <div className="text-gray-500">{slider.subtitle || '부제목 없음'}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="number"
                            value={slider.display_order}
                            onChange={(e) => {
                              const newValue = parseInt(e.target.value)
                              if (!isNaN(newValue) && newValue > 0) {
                                handleOrderChange(slider.id, newValue)
                              }
                            }}
                            className="w-12 px-2 py-1 text-sm text-center border rounded text-black"
                            min="1"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleUpdateSlider(slider.id, 'is_active', !slider.is_active)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              slider.is_active ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                slider.is_active ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <button
                            onClick={() => setEditingId(editingId === slider.id ? null : slider.id)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            {editingId === slider.id ? '완료' : '수정'}
                          </button>
                          <button
                            onClick={() => handleDeleteSlider(slider.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 풀빌라 이미지 관리 */}
          {activeTab === 'villa' && (
            <div className="bg-white shadow p-4 md:p-8">
              <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 text-black">풀빌라 동별 이미지 관리</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {['A', 'B', 'C', 'D'].map((zone) => (
                  <div key={zone} className="p-3 md:p-4">
                    <h3 className="text-base md:text-lg font-medium mb-2 md:mb-3 text-black">풀빌라 {zone}동</h3>
                    <div className="relative h-32 md:h-48 bg-gray-100 overflow-hidden">
                      <img
                        src={villaData[zone]?.image_url || '/images/main/villa.jpg'}
                        alt={`풀빌라 ${zone}동`}
                        className="w-full h-full object-cover"
                      />
                      <label className="absolute bottom-2 md:bottom-4 right-2 md:right-4 bg-white px-3 md:px-4 py-1 md:py-2 rounded-md shadow-lg cursor-pointer hover:bg-gray-50">
                        <span className="text-xs md:text-sm font-medium text-gray-700">이미지 변경</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const url = await uploadImage(file)
                              if (url) {
                                handleUpdateVilla(zone, url)
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CUBE 45 관리 */}
          {activeTab === 'cube45' && cube45 && (
            <div className="bg-white shadow p-4 md:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* 왼쪽: 폼 */}
                <div className="space-y-4 md:space-y-6">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                      배경 이미지
                    </label>
                    <div className="relative">
                      <div className="w-full h-32 md:h-48 bg-gray-100 overflow-hidden">
                        <img
                          src={cube45.image_url}
                          alt="CUBE 45 배경"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <label className="absolute bottom-2 md:bottom-4 right-2 md:right-4 bg-white px-3 md:px-4 py-1 md:py-2 rounded-md shadow-lg cursor-pointer hover:bg-gray-50">
                        <span className="text-xs md:text-sm font-medium text-gray-700">이미지 변경</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const url = await uploadImage(file)
                              if (url && cube45) {
                                setCube45({ ...cube45, image_url: url })
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                      상단 텍스트
                    </label>
                    <textarea
                      value={cube45.subtitle}
                      onChange={(e) => setCube45({...cube45, subtitle: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm md:text-base text-black"
                      placeholder="Exclusive Cube of Joy"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                      메인 타이틀
                    </label>
                    <textarea
                      value={cube45.title}
                      onChange={(e) => setCube45({...cube45, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm md:text-base text-black"
                      placeholder="CUBE 45"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                      하단 텍스트
                    </label>
                    <textarea
                      value={cube45.description}
                      onChange={(e) => setCube45({...cube45, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm md:text-base text-black"
                      placeholder="큐브45에서만 누릴 수 있는 즐거움"
                      rows={2}
                    />
                  </div>

                  <button
                    onClick={handleUpdateCube45}
                    disabled={uploading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
                  >
                    {uploading ? '업로드 중...' : '변경사항 저장'}
                  </button>
                </div>

                {/* 오른쪽: 미리보기 - 모바일에서 숨김 */}
                <div className="hidden lg:block lg:pl-8">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">미리보기</h3>
                  <div className="relative w-full h-64 overflow-hidden shadow-lg">
                    <img
                      src={cube45.image_url}
                      alt="미리보기"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                      <div className="absolute bottom-4 right-4 text-right text-white">
                        <p className="text-sm mb-1" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                          {cube45.subtitle}
                        </p>
                        <h2 className="text-2xl font-bold mb-1" style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.8)' }}>
                          {cube45.title}
                        </h2>
                        <p className="text-sm" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                          {cube45.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* INDOOR POOL 관리 */}
          {activeTab === 'indoor' && (
            <div className="bg-white shadow p-4 md:p-8">
              <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 text-black">INDOOR POOL 섹션 관리</h2>
              {indoorPool ? (
                <div className="space-y-4 md:space-y-6 max-w-2xl">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                      제목
                    </label>
                    <textarea
                      value={indoorPool.title}
                      onChange={(e) => setIndoorPool({...indoorPool, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm md:text-base text-black"
                      placeholder="Premium Play Villa"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                      설명 (• 로 시작)
                    </label>
                    <textarea
                      value={indoorPool.subtitle}
                      onChange={(e) => setIndoorPool({...indoorPool, subtitle: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm md:text-base text-black"
                      placeholder="• 실내 수영장"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                      이미지
                    </label>
                    <div className="relative h-32 md:h-48 bg-gray-100 overflow-hidden">
                      <img
                        src={indoorPool.image_url}
                        alt="Indoor Pool"
                        className="w-full h-full object-cover"
                      />
                      <label className="absolute bottom-2 md:bottom-4 right-2 md:right-4 bg-white px-3 md:px-4 py-1 md:py-2 rounded-md shadow-lg cursor-pointer hover:bg-gray-50">
                        <span className="text-xs md:text-sm font-medium text-gray-700">이미지 변경</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const url = await uploadImage(file)
                              if (url) {
                                setIndoorPool({...indoorPool, image_url: url})
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleUpdateIndoorPool}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm md:text-base"
                  >
                    변경사항 저장
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 md:py-12 text-gray-500 text-sm md:text-base">
                  INDOOR POOL 데이터가 없습니다. 
                  Supabase에서 indoor_pool 섹션을 추가해주세요.
                </div>
              )}
            </div>
          )}

          {/* 문의 정보 관리 */}
          {activeTab === 'contact' && (
            <div className="space-y-4 md:space-y-6">
              {/* 예약문의 */}
              {contactData.reservation && (
                <div className="bg-white shadow p-4 md:p-8">
                  <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 text-black">예약문의</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                          배경 이미지
                        </label>
                        <div className="relative h-32 md:h-48 bg-gray-100 overflow-hidden">
                          <img
                            src={contactData.reservation.image_url}
                            alt="예약문의 배경"
                            className="w-full h-full object-cover"
                          />
                          <label className="absolute bottom-2 md:bottom-4 right-2 md:right-4 bg-white px-3 md:px-4 py-1 md:py-2 rounded-md shadow-lg cursor-pointer hover:bg-gray-50">
                            <span className="text-xs md:text-sm font-medium text-gray-700">이미지 변경</span>
                            <input
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  const url = await uploadImage(file)
                                  if (url && contactData.reservation) {
                                    setContactData({
                                      ...contactData,
                                      reservation: {...contactData.reservation, image_url: url}
                                    })
                                  }
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                          전화번호
                        </label>
                        <textarea
                          value={contactData.reservation.title}
                          onChange={(e) => setContactData({
                            ...contactData,
                            reservation: {...contactData.reservation!, title: e.target.value}
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none text-sm md:text-base text-black"
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                          추가 정보
                        </label>
                        <textarea
                          value={contactData.reservation.description}
                          onChange={(e) => setContactData({
                            ...contactData,
                            reservation: {...contactData.reservation!, description: e.target.value}
                          })}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none text-sm md:text-base text-black"
                          placeholder="이메일 : thebran@naver.com|상담시간 : 평일/휴일 오전 10시 ~ 오후 18시"
                        />
                      </div>

                      <button
                        onClick={() => handleUpdateContact('reservation')}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm md:text-base"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 현장문의 */}
              {contactData.onsite && (
                <div className="bg-white shadow p-4 md:p-8">
                  <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 text-black">현장문의</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                          배경 이미지
                        </label>
                        <div className="relative h-32 md:h-48 bg-gray-100 overflow-hidden">
                          <img
                            src={contactData.onsite.image_url}
                            alt="현장문의 배경"
                            className="w-full h-full object-cover"
                          />
                          <label className="absolute bottom-2 md:bottom-4 right-2 md:right-4 bg-white px-3 md:px-4 py-1 md:py-2 rounded-md shadow-lg cursor-pointer hover:bg-gray-50">
                            <span className="text-xs md:text-sm font-medium text-gray-700">이미지 변경</span>
                            <input
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  const url = await uploadImage(file)
                                  if (url && contactData.onsite) {
                                    setContactData({
                                      ...contactData,
                                      onsite: {...contactData.onsite, image_url: url}
                                    })
                                  }
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                          전화번호
                        </label>
                        <textarea
                          value={contactData.onsite.title}
                          onChange={(e) => setContactData({
                            ...contactData,
                            onsite: {...contactData.onsite!, title: e.target.value}
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none text-sm md:text-base text-black"
                          rows={2}
                        />
                      </div>

                      <button
                        onClick={() => handleUpdateContact('onsite')}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm md:text-base"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}