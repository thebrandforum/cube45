'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import AdminNavigation from '@/components/admin/navigation'

interface Reservation {
  id: string
  reservation_number: string
  room_id: string
  room_name: string
  check_in_date: string
  check_out_date: string
  nights: number
  booker_name: string
  booker_email: string
  booker_phone: string
  guest_name?: string
  guest_email?: string
  guest_phone?: string
  is_different_guest: boolean
  adult_count: number
  student_count: number
  child_count: number
  infant_count: number
  total_amount: number
  status: string
  created_at: string
  cancelled_at?: string
  cancelled_by?: string
  customer_request?: string	
}

export default function AdminCancell() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 30
  
  const [searchConditions, setSearchConditions] = useState({
    dateType: 'cancelled_at',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    keyword: '',
    sortOrder: 'desc'
  })

  useEffect(() => {
    fetchReservations()
  }, [])

  const fetchReservations = async (page = 1) => {
    setLoading(true)
    try {
      let query = supabase
        .from('cube45_reservations')
        .select('*', { count: 'exact' })
        .eq('status', 'cancelled')
      
      if (searchConditions.startDate && searchConditions.endDate) {
        if (searchConditions.dateType === 'cancelled_at') {
          query = query
            .gte('cancelled_at', `${searchConditions.startDate}T00:00:00`)
            .lte('cancelled_at', `${searchConditions.endDate}T23:59:59`)
        } else if (searchConditions.dateType === 'created_at') {
          query = query
            .gte('created_at', `${searchConditions.startDate}T00:00:00`)
            .lte('created_at', `${searchConditions.endDate}T23:59:59`)
        } else if (searchConditions.dateType === 'check_in_date') {
          query = query
            .gte('check_in_date', searchConditions.startDate)
            .lte('check_in_date', searchConditions.endDate)
        } else if (searchConditions.dateType === 'check_out_date') {
          query = query
            .gte('check_out_date', searchConditions.startDate)
            .lte('check_out_date', searchConditions.endDate)
        }
      }
      
      if (searchConditions.keyword) {
        query = query.or(`booker_name.ilike.%${searchConditions.keyword}%,guest_name.ilike.%${searchConditions.keyword}%,booker_phone.ilike.%${searchConditions.keyword}%,guest_phone.ilike.%${searchConditions.keyword}%,booker_email.ilike.%${searchConditions.keyword}%,guest_email.ilike.%${searchConditions.keyword}%,reservation_number.ilike.%${searchConditions.keyword}%`)
      }
      
      const from = (page - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      
      query = query
        .order(searchConditions.dateType === 'cancelled_at' ? 'cancelled_at' : searchConditions.dateType, 
               { ascending: searchConditions.sortOrder === 'asc' })
        .range(from, to)
      
      const { data, error, count } = await query
      
      if (error) throw error
      
      setReservations(data || [])
      setTotalCount(count || 0)
      setCurrentPage(page)
      
    } catch (error) {
      console.error('취소 예약 데이터 조회 실패:', error)
      setReservations([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (field: string, value: string | number) => {
    setSearchConditions(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSearch = () => {
    fetchReservations(1)
  }

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { text: string; class: string }> = {
      'confirmed': { text: '예약완료', class: 'text-blue-600 bg-blue-100' },
      'cancelled': { text: '취소', class: 'text-red-600 bg-red-100' },
      'pending': { text: '예약접수', class: 'text-yellow-600 bg-yellow-100' }
    }
    return statusMap[status] || { text: '알수없음', class: 'text-gray-600 bg-gray-100' }
  }

  const getCancelledByDisplay = (cancelledBy?: string) => {
    if (!cancelledBy) return { text: '알수없음', class: 'text-gray-600 bg-gray-100' }
    
    const displayMap: Record<string, { text: string; class: string }> = {
      '관리자': { text: '관리자 취소', class: 'text-purple-600 bg-purple-100' },
      '사용자': { text: '사용자 취소', class: 'text-orange-600 bg-orange-100' }
    }
    
    return displayMap[cancelledBy] || { text: cancelledBy, class: 'text-gray-600 bg-gray-100' }
  }

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
  
  const formatDataForExcel = (data: Reservation[]) => {
    return data.map((reservation, index) => ({
      'No': data.length - index,
      '예약상태': '취소',
      '예약일자': formatDateTime(reservation.created_at),
      '취소일자': formatDateTime(reservation.cancelled_at),
      '예약번호': reservation.reservation_number,
      '예약자명': reservation.booker_name,
      '예약자전화': reservation.booker_phone,
      '예약자이메일': reservation.booker_email,
      '투숙자명': reservation.is_different_guest ? reservation.guest_name : reservation.booker_name,
      '투숙자전화': reservation.is_different_guest ? reservation.guest_phone : reservation.booker_phone,
      '투숙자이메일': reservation.is_different_guest ? reservation.guest_email : reservation.booker_email,
      '입실일': reservation.check_in_date,
      '퇴실일': reservation.check_out_date,
      '박수': reservation.nights,
      '객실': reservation.room_name || reservation.room_id,
      '성인': reservation.adult_count || 0,
      '학생': reservation.student_count || 0,
      '아동': reservation.child_count || 0,
      '유아': reservation.infant_count || 0,
      '총인원': (reservation.adult_count || 0) + (reservation.student_count || 0) + (reservation.child_count || 0) + (reservation.infant_count || 0),
      '금액': reservation.total_amount,
      '취소구분': reservation.cancelled_by === '관리자' ? '관리자 취소' : 
                 reservation.cancelled_by === '사용자' ? '사용자 취소' : '알수없음'
    }))
  }

  const downloadCurrentPageExcel = () => {
    const excelData = formatDataForExcel(reservations)
    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '취소목록')
    
    const today = new Date().toISOString().split('T')[0]
    const fileName = `취소관리_${today}.xlsx`
    
    XLSX.writeFile(wb, fileName)
    
    alert(`현재 페이지 ${reservations.length}건의 데이터를 다운로드했습니다.`)
  }

  const downloadAllDataExcel = async () => {
    try {
      let query = supabase
        .from('cube45_reservations')
        .select('*')
        .eq('status', 'cancelled')
      
      if (searchConditions.startDate && searchConditions.endDate) {
        if (searchConditions.dateType === 'cancelled_at') {
          query = query
            .gte('cancelled_at', `${searchConditions.startDate}T00:00:00`)
            .lte('cancelled_at', `${searchConditions.endDate}T23:59:59`)
        } else if (searchConditions.dateType === 'created_at') {
          query = query
            .gte('created_at', `${searchConditions.startDate}T00:00:00`)
            .lte('created_at', `${searchConditions.endDate}T23:59:59`)
        } else if (searchConditions.dateType === 'check_in_date') {
          query = query
            .gte('check_in_date', searchConditions.startDate)
            .lte('check_in_date', searchConditions.endDate)
        } else if (searchConditions.dateType === 'check_out_date') {
          query = query
            .gte('check_out_date', searchConditions.startDate)
            .lte('check_out_date', searchConditions.endDate)
        }
      }
      
      if (searchConditions.keyword) {
        query = query.or(`booker_name.ilike.%${searchConditions.keyword}%,guest_name.ilike.%${searchConditions.keyword}%,booker_phone.ilike.%${searchConditions.keyword}%,guest_phone.ilike.%${searchConditions.keyword}%,booker_email.ilike.%${searchConditions.keyword}%,guest_email.ilike.%${searchConditions.keyword}%,reservation_number.ilike.%${searchConditions.keyword}%`)
      }
      
      query = query.order(searchConditions.dateType === 'cancelled_at' ? 'cancelled_at' : searchConditions.dateType, 
                          { ascending: searchConditions.sortOrder === 'asc' })
      
      const { data, error } = await query
      
      if (error) throw error
      
      const excelData = formatDataForExcel(data || [])
      const ws = XLSX.utils.json_to_sheet(excelData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '취소목록')
      
      const today = new Date().toISOString().split('T')[0]
      const fileName = `취소관리_${today}_전체.xlsx`
      
      XLSX.writeFile(wb, fileName)
      
      alert(`전체 ${data?.length || 0}건의 데이터를 다운로드했습니다.`)
      
    } catch (error) {
      console.error('전체 데이터 다운로드 실패:', error)
      alert('다운로드에 실패했습니다.')
    }
  }

  const formatDateOnly = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    return dateString
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <AdminNavigation />

      {/* 메인 콘텐츠 */}
      <main className="flex-1 p-3 md:p-6 mt-14 md:mt-16 md:ml-48">
        <div className="max-w-8xl mx-auto">
          {/* 헤더 - 모바일에서는 숨김 */}
          <div className="hidden md:block mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              취소관리
            </h1>
          </div>

          {/* 검색 폼 */}
          <div className="bg-white p-3 md:p-6 rounded-lg shadow-sm mb-4 md:mb-6">
            {/* 모바일 검색 */}
            <div className="md:hidden space-y-3">
              {/* 날짜 타입 선택 */}
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-black"
                value={searchConditions.dateType}
                onChange={(e) => handleSearchChange('dateType', e.target.value)}
              >
                <option value="cancelled_at">취소일</option>
                <option value="created_at">예약일</option>
                <option value="check_in_date">입실일</option>
                <option value="check_out_date">퇴실일</option>
              </select>

              {/* 날짜 선택 */}
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date" 
                  className="px-3 py-2 border border-gray-300 rounded text-sm text-black"
                  value={searchConditions.startDate}
                  onChange={(e) => handleSearchChange('startDate', e.target.value)}
                />
                <input 
                  type="date" 
                  className="px-3 py-2 border border-gray-300 rounded text-sm text-black"
                  value={searchConditions.endDate}
                  onChange={(e) => handleSearchChange('endDate', e.target.value)}
                />
              </div>

              {/* 정렬 순서 */}
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-black"
                value={searchConditions.sortOrder}
                onChange={(e) => handleSearchChange('sortOrder', e.target.value)}
              >
                <option value="desc">최신순</option>
                <option value="asc">오래된순</option>
              </select>

              {/* 키워드 검색 */}
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm placeholder-gray-500 text-black"
                placeholder="통합검색(이름,전화번호,이메일,예약번호)"
                value={searchConditions.keyword}
                onChange={(e) => handleSearchChange('keyword', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />

              {/* 버튼들 */}
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  검색
                </button>
                <div className="relative group">
                  <button className="w-full px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    엑셀
                  </button>
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <button 
                      onClick={downloadCurrentPageExcel}
                      className="block w-full px-4 py-2 text-sm text-left text-black hover:bg-gray-100 whitespace-nowrap"
                    >
                      현재 페이지 다운로드
                    </button>
                    <button 
                      onClick={downloadAllDataExcel}
                      className="block w-full px-4 py-2 text-sm text-left text-black hover:bg-gray-100 whitespace-nowrap"
                    >
                      전체 데이터 다운로드
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 데스크톱 검색 */}
            <div className="hidden md:grid grid-cols-12 gap-4">
              <div className="col-span-5">
                <div className="flex gap-2">
                  <select 
                    className="px-3 py-3 min-h-[40px] border border-gray-300 rounded text-sm text-black"
                    value={searchConditions.dateType}
                    onChange={(e) => handleSearchChange('dateType', e.target.value)}
                  >
                    <option value="cancelled_at">취소일</option>
                    <option value="created_at">예약일</option>
                    <option value="check_in_date">입실일</option>
                    <option value="check_out_date">퇴실일</option>
                  </select>
                  <input 
                    type="date" 
                    className="px-3 py-3 min-h-[40px] border border-gray-300 rounded text-sm text-black"
                    value={searchConditions.startDate}
                    onChange={(e) => handleSearchChange('startDate', e.target.value)}
                  />
                  <span className="flex items-center text-gray-500">~</span>
                  <input 
                    type="date" 
                    className="px-3 py-3 min-h-[40px] border border-gray-300 rounded text-sm text-black"
                    value={searchConditions.endDate}
                    onChange={(e) => handleSearchChange('endDate', e.target.value)}
                  />
                  <select 
                    className="px-3 py-3 min-h-[40px] border border-gray-300 rounded text-sm text-black"
                    value={searchConditions.sortOrder}
                    onChange={(e) => handleSearchChange('sortOrder', e.target.value)}
                  >
                    <option value="desc">최신순</option>
                    <option value="asc">오래된순</option>
                  </select>
                </div>
              </div>
              
              <div className="col-span-5">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 px-3 py-3 min-h-[40px] border border-gray-300 rounded text-sm placeholder-gray-500 text-black"
                    placeholder="통합검색(이름,전화번호,이메일,예약번호)"
                    value={searchConditions.keyword}
                    onChange={(e) => handleSearchChange('keyword', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button 
                    onClick={handleSearch}
                    className="px-6 py-3 min-h-[40px] bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    검색
                  </button>
                  <div className="relative group">
                    <button className="px-4 py-3 min-h-[40px] bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      엑셀다운로드
                    </button>
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <button 
                        onClick={downloadCurrentPageExcel}
                        className="block w-full px-4 py-2 text-sm text-left text-black hover:bg-gray-100 whitespace-nowrap"
                      >
                        현재 페이지 다운로드
                      </button>
                      <button 
                        onClick={downloadAllDataExcel}
                        className="block w-full px-4 py-2 text-sm text-left text-black hover:bg-gray-100 whitespace-nowrap"
                      >
                        전체 데이터 다운로드
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-span-2"></div>
            </div>
          </div>

          {/* 모바일 카드 뷰 */}
          <div className="md:hidden">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-xs text-black">로딩 중...</span>
              </div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs">
                조회된 취소 예약이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {reservations.map((reservation, index) => {
                  const statusInfo = getStatusDisplay(reservation.status)
                  const cancelInfo = getCancelledByDisplay(reservation.cancelled_by)
                  const totalGuests = (reservation.adult_count || 0) + (reservation.student_count || 0) + 
                                     (reservation.child_count || 0) + (reservation.infant_count || 0)
                  
                  const guestInfo = reservation.is_different_guest ? {
                    name: reservation.guest_name || '-',
                    phone: reservation.guest_phone || '-',
                    email: reservation.guest_email || '-'
                  } : {
                    name: reservation.booker_name || '-',
                    phone: reservation.booker_phone || '-', 
                    email: reservation.booker_email || '-'
                  }
                  
                  return (
                    <div key={reservation.id} className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
                      {/* 카드 헤더 */}
                      <div className="flex justify-between items-center mb-3 pb-2 border-b">
                        <span className="text-xs font-bold text-black">No.{reservations.length - index}</span>
                        <div className="flex gap-2">
                          <span className={`font-bold px-2 py-1 rounded text-xs ${statusInfo.class}`}>
                            {statusInfo.text}
                          </span>
                          <span className={`font-bold px-2 py-1 rounded text-xs ${cancelInfo.class}`}>
                            {cancelInfo.text}
                          </span>
                        </div>
                      </div>

                      {/* 예약 정보 */}
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">예약번호:</span>
                          <span className="font-medium text-black">{reservation.reservation_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">예약일:</span>
                          <span className="text-black">{formatDateTime(reservation.created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">취소일:</span>
                          <span className="text-red-600 font-medium">{formatDateTime(reservation.cancelled_at)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">예약자:</span>
                          <span className="text-black">{reservation.booker_name} / {reservation.booker_phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">투숙자:</span>
                          <span className="text-black">{guestInfo.name} / {guestInfo.phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">숙박일정:</span>
                          <span className="text-black">{formatDateOnly(reservation.check_in_date)} ~ {formatDateOnly(reservation.check_out_date)} ({reservation.nights}박)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">객실:</span>
                          <span className="text-black">{reservation.room_name || reservation.room_id || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">인원/금액:</span>
                          <span className="text-black">{totalGuests}명 / {reservation.total_amount?.toLocaleString()}원</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 데스크톱 테이블 뷰 */}
          <div className="hidden md:block bg-white border border-gray-300">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">No</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">예약상태</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">예약일자</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">취소일자</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">예약번호</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">예약자 정보</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">투숙자 정보</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium break-keep text-black">입실일, 퇴실일, 박수</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">객실</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">인원</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">금액</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">취소구분</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-xs">로딩 중...</span>
                      </div>
                    </td>
                  </tr>
                ) : reservations.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="border border-gray-300 px-4 py-8 text-center text-gray-500 text-xs">
                      조회된 취소 예약이 없습니다.
                    </td>
                  </tr>
                ) : (
                  reservations.map((reservation, index) => {
                    const statusInfo = getStatusDisplay(reservation.status)
                    const cancelInfo = getCancelledByDisplay(reservation.cancelled_by)
                    const totalGuests = (reservation.adult_count || 0) + (reservation.student_count || 0) + 
                                       (reservation.child_count || 0) + (reservation.infant_count || 0)
                    
                    const guestInfo = reservation.is_different_guest ? {
                      name: reservation.guest_name || '-',
                      phone: reservation.guest_phone || '-',
                      email: reservation.guest_email || '-'
                    } : {
                      name: reservation.booker_name || '-',
                      phone: reservation.booker_phone || '-', 
                      email: reservation.booker_email || '-'
                    }
                    
                    return (
                      <tr key={reservation.id}>
                        <td className="border border-gray-300 px-4 py-3 text-center text-xs text-black">{reservations.length - index}</td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-xs">
                          <span className={`font-bold px-3 py-2 rounded ${statusInfo.class}`}>
                            {statusInfo.text}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-xs text-black">{formatDateTime(reservation.created_at)}</td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-xs text-black">{formatDateTime(reservation.cancelled_at)}</td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">{reservation.reservation_number}</td>
                        <td className="border border-gray-300 px-2 py-3 text-center text-xs text-black">
                          <div className="space-y-1">
                            <div>{reservation.booker_name || '-'}</div>
                            <div>{reservation.booker_phone || '-'}</div>
                            <div>{reservation.booker_email || '-'}</div>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-2 py-3 text-center text-xs text-black">
                          <div className="space-y-1">
                            <div>{guestInfo.name}</div>
                            <div>{guestInfo.phone}</div>
                            <div>{guestInfo.email}</div>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-xs text-black">
                          <div className="space-y-1">
                            <div>{formatDateOnly(reservation.check_in_date)} ~ {formatDateOnly(reservation.check_out_date)}</div>
                            <div className="text-gray-600">{reservation.nights}박</div>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-xs text-black">{reservation.room_name || reservation.room_id || '-'}</td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-xs text-black">{totalGuests}명</td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-xs text-black">{reservation.total_amount?.toLocaleString() || 0}원</td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-xs">
                          <span className={`font-bold px-3 py-2 rounded ${cancelInfo.class}`}>
                            {cancelInfo.text}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {!loading && totalCount > 0 && (
            <div className="flex justify-center items-center space-x-1 md:space-x-2 mt-4 md:mt-6">
              {/* 모바일 페이지네이션 */}
              <div className="md:hidden flex items-center space-x-1">
                <button
                  onClick={() => fetchReservations(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 border rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-black"
                >
                  ‹
                </button>
                
                <span className="text-xs text-black px-2">
                  {currentPage} / {Math.ceil(totalCount / itemsPerPage)}
                </span>
                
                <button
                  onClick={() => fetchReservations(Math.min(Math.ceil(totalCount / itemsPerPage), currentPage + 1))}
                  disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
                  className="px-2 py-1 border rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-black"
                >
                  ›
                </button>
              </div>

              {/* 데스크톱 페이지네이션 */}
              <div className="hidden md:flex items-center space-x-2">
                <button
                  onClick={() => fetchReservations(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-black"
                >
                  처음
                </button>
                <button
                  onClick={() => fetchReservations(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-black"
                >
                  이전
                </button>
                
                {Array.from({ length: Math.min(10, Math.ceil(totalCount / itemsPerPage)) }, (_, i) => {
                  const currentGroup = Math.floor((currentPage - 1) / 10);
                  const startPage = currentGroup * 10 + 1;
                  const page = startPage + i;
                  const totalPages = Math.ceil(totalCount / itemsPerPage);
                  
                  if (page > totalPages) return null;
                  
                  return (
                    <button
                      key={page}
                      onClick={() => fetchReservations(page)}
                      className={`px-3 py-1 border rounded text-sm ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-100 text-black'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => fetchReservations(Math.min(Math.ceil(totalCount / itemsPerPage), currentPage + 1))}
                  disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-black"
                >
                  다음
                </button>
                <button
                  onClick={() => fetchReservations(Math.ceil(totalCount / itemsPerPage))}
                  disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-black"
                >
                  마지막
                </button>
                
                <span className="text-sm text-gray-600 ml-4">
                  총 {totalCount}건 | {currentPage} / {Math.ceil(totalCount / itemsPerPage)} 페이지
                </span>
              </div>
            </div>
          )}

          {/* 하단 정보 - 모바일에서는 숨김 */}
          <div className="hidden md:block mt-6 bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              취소 안내
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2 text-gray-700">취소 구분</h4>
                <ul className="space-y-2">
                  <li className="flex items-center text-black">
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs mr-2">관리자 취소</span>
                    관리자가 직접 취소한 예약입니다.
                  </li>
                  <li className="flex items-center text-black">
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs mr-2">사용자 취소</span>
                    고객이 직접 취소한 예약입니다.
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-gray-700">검색 조건</h4>
                <ul className="space-y-2">
                  <li className="flex items-center text-black">
                    <span className="font-semibold text-xs mr-2">취소일:</span>
                    예약이 취소된 날짜로 검색
                  </li>
                  <li className="flex items-center text-black">
                    <span className="font-semibold text-xs mr-2">예약일:</span>
                    최초 예약 접수 날짜로 검색
                  </li>
                  <li className="flex items-center text-black">
                    <span className="font-semibold text-xs mr-2">입/퇴실일:</span>
                    예정되었던 숙박 날짜로 검색
                  </li>
                  <li className="text-xs text-gray-600">
                    * 통합검색으로 예약자 정보를 검색할 수 있습니다.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}