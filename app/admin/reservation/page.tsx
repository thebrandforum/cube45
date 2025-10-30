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
  check_in_status?: boolean
  check_out_status?: boolean
  check_in_time?: string
  check_out_time?: string
  cancelled_at?: string
  customer_request?: string	
  is_deleted?: boolean
	deleted_at?: string
  payment_tid?: string
}

export default function AdminReservation() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [checkStatus, setCheckStatus] = useState<Record<string, boolean>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 30
  
  const [searchConditions, setSearchConditions] = useState({
    dateType: 'created_at',
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
	    .neq('status', 'pending')
	    .eq('is_deleted', false)
      
      if (searchConditions.startDate && searchConditions.endDate) {
        if (searchConditions.dateType === 'created_at') {
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
        .order(searchConditions.dateType, { ascending: searchConditions.sortOrder === 'asc' })
        .range(from, to)
      
      const { data, error, count } = await query
      
      if (error) throw error
      
      setReservations(data || [])
      setTotalCount(count || 0)
      setCurrentPage(page)
      
      const initialCheckStatus: Record<string, boolean> = {}
      data?.forEach(reservation => {
        initialCheckStatus[`${reservation.id}_checkin`] = reservation.check_in_status || false
        initialCheckStatus[`${reservation.id}_checkout`] = reservation.check_out_status || false
      })
      setCheckStatus(initialCheckStatus)
    } catch (error) {
      console.error('예약 데이터 조회 실패:', error)
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

  const toggleCheckStatus = async (reservationId: string, type: string) => {
    const currentStatus = checkStatus[`${reservationId}_${type}`]
    const newStatus = !currentStatus
    
    const getConfirmMessage = (type: string, newStatus: boolean) => {
      if (type === 'checkin') {
        return newStatus ? '체크인을 입장 상태로 바꾸겠습니까?' : '체크인을 미입장 상태로 바꾸겠습니까?'
      } else {
        return newStatus ? '체크아웃을 퇴실 상태로 바꾸겠습니까?' : '체크아웃을 미퇴실 상태로 바꾸겠습니까?'
      }
    }
    
    const getSuccessMessage = (type: string, newStatus: boolean) => {
      if (type === 'checkin') {
        return newStatus ? '체크인이 입장 상태로 변경되었습니다.' : '체크인이 미입장 상태로 변경되었습니다.'
      } else {
        return newStatus ? '체크아웃이 퇴실 상태로 변경되었습니다.' : '체크아웃이 미퇴실 상태로 변경되었습니다.'
      }
    }

    const confirmMessage = getConfirmMessage(type, newStatus)
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const now = new Date()

      const updateData: Record<string, boolean | string | null> = {}
      if (type === 'checkin') {
        updateData.check_in_status = newStatus
        updateData.check_in_time = newStatus ? now.toISOString() : null
      } else {
        updateData.check_out_status = newStatus
        updateData.check_out_time = newStatus ? now.toISOString() : null
      }

      const { error } = await supabase
        .from('cube45_reservations')
        .update(updateData)
        .eq('id', reservationId)

      if (error) throw error

      setCheckStatus(prev => ({
        ...prev,
        [`${reservationId}_${type}`]: newStatus
      }))

      await fetchReservations()

      const successMessage = getSuccessMessage(type, newStatus)
      alert(successMessage)

    } catch (error) {
      console.error('체크 상태 업데이트 실패:', error)
      alert('상태 변경에 실패했습니다. 다시 시도해주세요.')
    }
  }
  
  const handleDelete = async (reservationId: string) => {
    if (!confirm('이 예약을 삭제하시겠습니까?\n(관리자 페이지에서만 보이지 않으며, 데이터는 보존됩니다)')) {
      return
    }
  
    try {
      const now = new Date()
      
      const { error } = await supabase
        .from('cube45_reservations')
        .update({
          is_deleted: true,
          deleted_at: now.toISOString()
        })
        .eq('id', reservationId)
  
      if (error) throw error
  
      await fetchReservations()
      alert('예약이 삭제되었습니다.')
  
    } catch (error) {
      console.error('예약 삭제 실패:', error)
      alert('삭제에 실패했습니다. 다시 시도해주세요.')
    }
  }
  
  const toggleReservationStatus = async (reservationId: string, currentStatus: string) => {
  const newStatus = currentStatus === 'confirmed' ? 'cancelled' : 'confirmed'
  
  const confirmMessage = newStatus === 'cancelled' 
    ? '예약을 취소 상태로 변경하시겠습니까?\n결제금액이 환불됩니다.' 
    : '취소를 예약완료 상태로 복구하시겠습니까?'
  
  if (!confirm(confirmMessage)) {
    return
  }

  // 해당 예약 찾기
  const reservation = reservations.find(r => r.id === reservationId)
  if (!reservation) {
    alert('예약 정보를 찾을 수 없습니다.')
    return
  }

  setLoading(true)

  try {
    // 취소 처리 시 PG 환불도 함께 처리
    if (newStatus === 'cancelled' && reservation.payment_tid) {
      // 1. PG 취소 API 호출
      const pgResponse = await fetch('https://cubecube45.mycafe24.com/pc/WelCancelAPI.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `tid=${reservation.payment_tid}&price=${reservation.total_amount}`
      })
      
      const pgResult = await pgResponse.json()
      
      if (!pgResult.success) {
        alert('환불 오류입니다. 고객센터에 문의해주세요.')
        setLoading(false)
        return
      }
    }

    // 2. DB 업데이트
    const now = new Date()
    
    const updateData: Record<string, string | null> = {
      status: newStatus,
      cancelled_at: newStatus === 'cancelled' ? now.toISOString() : null,
      cancelled_by: newStatus === 'cancelled' ? '관리자' : null
    }

    const { error } = await supabase
      .from('cube45_reservations')
      .update(updateData)
      .eq('id', reservationId)

    if (error) throw error

    await fetchReservations()

    const successMessage = newStatus === 'cancelled' 
      ? '예약이 취소되었습니다.' 
      : '예약이 예약완료 상태로 복구되었습니다.'
    alert(successMessage)

  } catch (error) {
    console.error('예약 상태 업데이트 실패:', error)
    alert('상태 변경에 실패했습니다. 다시 시도해주세요.')
  } finally {
    setLoading(false)
  }
}

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { text: string; class: string }> = {
      'confirmed': { text: '예약완료', class: 'text-blue-600 bg-blue-100' },
      'cancelled': { text: '취소', class: 'text-red-600 bg-red-100' },
      'pending': { text: '예약접수', class: 'text-yellow-600 bg-yellow-100' }
    }
    return statusMap[status] || { text: '알수없음', class: 'text-gray-600 bg-gray-100' }
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
      '예약상태': reservation.status === 'confirmed' ? '예약완료' : reservation.status === 'cancelled' ? '취소' : '예약접수',
      '예약일자': formatDateTime(reservation.created_at),
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
      '요청사항': reservation.customer_request || '',
      '체크인상태': reservation.check_in_status ? 'O' : 'X',
      '체크인시간': reservation.check_in_time ? formatDateTime(reservation.check_in_time) : '',
      '체크아웃상태': reservation.check_out_status ? 'O' : 'X',
      '체크아웃시간': reservation.check_out_time ? formatDateTime(reservation.check_out_time) : '',
      '취소시간': reservation.cancelled_at ? formatDateTime(reservation.cancelled_at) : ''
    }))
  }

  const downloadCurrentPageExcel = () => {
    const excelData = formatDataForExcel(reservations)
    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '예약목록')
    
    const today = new Date().toISOString().split('T')[0]
    const fileName = `예약관리_${today}.xlsx`
    
    XLSX.writeFile(wb, fileName)
    
    alert(`현재 페이지 ${reservations.length}건의 데이터를 다운로드했습니다.`)
  }

  const downloadAllDataExcel = async () => {
    try {
      let query = supabase
        .from('cube45_reservations')
        .select('*')
      
      if (searchConditions.startDate && searchConditions.endDate) {
        if (searchConditions.dateType === 'created_at') {
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
      
      query = query.order(searchConditions.dateType, { ascending: searchConditions.sortOrder === 'asc' })
      
      const { data, error } = await query
      
      if (error) throw error
      
      const excelData = formatDataForExcel(data || [])
      const ws = XLSX.utils.json_to_sheet(excelData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '예약목록')
      
      const today = new Date().toISOString().split('T')[0]
      const fileName = `예약관리_${today}_전체.xlsx`
      
      XLSX.writeFile(wb, fileName)
      
      alert(`전체 ${data?.length || 0}건의 데이터를 다운로드했습니다.`)
      
    } catch (error) {
      console.error('전체 데이터 다운로드 실패:', error)
      alert('다운로드에 실패했습니다.')
    }
  }

  const formatTimeSimple = (dateString: string | null | undefined) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    return `${year}.${month}.${day}. ${hours}:${minutes}:${seconds}`
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
              예약관리
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
                조회된 예약이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {reservations.map((reservation, index) => {
                  const statusInfo = getStatusDisplay(reservation.status)
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

                  const checkInStatus = checkStatus[`${reservation.id}_checkin`] ? 'O' : 'X'
                  const checkOutStatus = checkStatus[`${reservation.id}_checkout`] ? 'O' : 'X'
                  
                  return (
                    <div key={reservation.id} className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
                      {/* 카드 헤더 */}
                      <div className="flex justify-between items-center mb-3 pb-2 border-b">
                        <span className="text-xs font-bold text-black">No.{reservations.length - index}</span>
                        <button 
                          onClick={() => toggleReservationStatus(reservation.id, reservation.status)}
                          className={`font-bold px-2 py-1 rounded text-xs ${statusInfo.class}`}
                        >
                          {statusInfo.text}
                        </button>
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
                        {reservation.customer_request && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">요청사항:</span>
                            <span className="text-black text-right">{reservation.customer_request}</span>
                          </div>
                        )}

                        {/* 체크인/체크아웃 버튼 */}
                        <div className="flex gap-2 mt-3 pt-2 border-t">
                          <div className="flex-1">
                            <button 
                              onClick={() => toggleCheckStatus(reservation.id, 'checkin')}
                              className={`w-full font-bold px-2 py-1 rounded text-xs ${
                                checkInStatus === 'O' 
                                  ? 'text-green-600 bg-green-100' 
                                  : 'text-red-600 bg-red-100'
                              }`}
                            >
                              체크인: {checkInStatus}
                            </button>
                            {reservation.check_in_time && (
                              <div className="text-[10px] text-gray-500 text-center mt-1">
                                {formatTimeSimple(reservation.check_in_time)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <button 
                              onClick={() => toggleCheckStatus(reservation.id, 'checkout')}
                              className={`w-full font-bold px-2 py-1 rounded text-xs ${
                                checkOutStatus === 'O' 
                                  ? 'text-green-600 bg-green-100' 
                                  : 'text-red-600 bg-red-100'
                              }`}
                            >
                              체크아웃: {checkOutStatus}
                            </button>
                            {reservation.check_out_time && (
                              <div className="text-[10px] text-gray-500 text-center mt-1">
                                {formatTimeSimple(reservation.check_out_time)}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* 삭제 버튼 추가 */}
                        <div className="mt-3 pt-2 border-t">
                          <button 
                            onClick={() => handleDelete(reservation.id)}
                            className="w-full px-3 py-2 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                          >
                            예약 삭제
                          </button>
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
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium w-26 text-black">
                    예약상태
                    <div className="text-[10px] text-gray-500 mt-1">(클릭하여 변경)</div>
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">예약일자</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">예약번호</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">예약자 정보</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">투숙자 정보</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium w-30 break-keep text-black">입실일, 퇴실일, 박수</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium w-22 text-black">객실</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium w-16 text-black">인원</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium w-22 text-black">금액</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">요청사항</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">
                    체크인
                    <div className="text-[10px] text-gray-500 mt-1">(클릭하여 변경)</div>
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium w-26 text-black">
                    체크아웃
                    <div className="text-[10px] text-gray-500 mt-1">(클릭하여 변경)</div>
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-black">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={14} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-xs">로딩 중...</span>
                      </div>
                    </td>
                  </tr>
                ) : reservations.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="border border-gray-300 px-4 py-8 text-center text-gray-500 text-xs">
                      조회된 예약이 없습니다.
                    </td>
                  </tr>
                ) : (
                  reservations.map((reservation, index) => {
                    const statusInfo = getStatusDisplay(reservation.status)
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

                    const checkInStatus = checkStatus[`${reservation.id}_checkin`] ? 'O' : 'X'
                    const checkOutStatus = checkStatus[`${reservation.id}_checkout`] ? 'O' : 'X'
                    
                    return (
                      <tr key={reservation.id}>
                        <td className="border border-gray-300 px-4 py-3 text-center text-xs text-black">{reservations.length - index}</td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-xs">
                          <div className="flex flex-col items-center">
                            <button 
                              onClick={() => toggleReservationStatus(reservation.id, reservation.status)}
                              className={`font-bold px-3 py-2 rounded cursor-pointer transition-colors mb-1 ${statusInfo.class}`}
                              title="클릭하여 예약 상태 변경"
                            >
                              {statusInfo.text}
                            </button>
                            {reservation.cancelled_at && (
                              <div className="text-xs text-gray-500">
                                {formatTimeSimple(reservation.cancelled_at)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-xs text-black">{formatDateTime(reservation.created_at)}</td>
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
                        <td className="border border-gray-300 px-4 py-3 text-center text-xs text-black">{reservation.customer_request || '없음'}</td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-xs">
                          <div className="flex flex-col items-center">
                            <button 
                              onClick={() => toggleCheckStatus(reservation.id, 'checkin')}
                              className={`font-bold px-3 py-2 rounded cursor-pointer transition-colors mb-1 ${
                                checkInStatus === 'O' 
                                  ? 'text-green-600 bg-green-100 hover:bg-green-200' 
                                  : 'text-red-600 bg-red-100 hover:bg-red-200'
                              }`}
                              title="클릭하여 체크인 상태 변경"
                            >
                              {checkInStatus}
                            </button>
                            {reservation.check_in_time && (
                              <div className="text-xs text-gray-500">
                                {formatTimeSimple(reservation.check_in_time)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-xs">
                          <div className="flex flex-col items-center">
                            <button 
                              onClick={() => toggleCheckStatus(reservation.id, 'checkout')}
                              className={`font-bold px-3 py-2 rounded cursor-pointer transition-colors mb-1 ${
                                checkOutStatus === 'O' 
                                  ? 'text-green-600 bg-green-100 hover:bg-green-200' 
                                  : 'text-red-600 bg-red-100 hover:bg-red-200'
                              }`}
                              title="클릭하여 체크아웃 상태 변경"
                            >
                              {checkOutStatus}
                            </button>
                            {reservation.check_out_time && (
                              <div className="text-xs text-gray-500">
                                {formatTimeSimple(reservation.check_out_time)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-xs">
                          <button 
                            onClick={() => handleDelete(reservation.id)}
                            className="px-3 py-2 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                            title="예약 삭제"
                          >
                            삭제
                          </button>
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
              <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              예약상태 및 체크 안내
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2 text-gray-700">예약 상태</h4>
                <ul className="space-y-2">
                  <li className="flex items-center text-black">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs mr-2">예약완료</span>
                    접수된 예약건이 최종적으로 완료된 상태입니다.
                  </li>
                  <li className="flex items-center text-black">
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs mr-2">취소</span>
                    예약이 취소된 상태입니다.
                  </li>
                  <li className="text-xs text-gray-600">
                    * 버튼을 클릭하여 예약완료 ↔ 취소 상태를 변경할 수 있습니다.
                  </li>
                  <li className="text-xs text-gray-600">
                    * 취소 시 하단에 취소 시간이 표시됩니다.
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-gray-700">체크인/아웃 관리</h4>
                <ul className="space-y-2">
                  <li className="flex items-center text-black">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs mr-2 font-bold">O</span>
                    입장/퇴실 완료 상태
                  </li>
                  <li className="flex items-center text-black">
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs mr-2 font-bold">X</span>
                    미입장/미퇴실 상태
                  </li>
                  <li className="text-xs text-gray-600">
                    * 버튼을 클릭하여 상태를 변경할 수 있습니다.
                  </li>
                  <li className="text-xs text-gray-600">
                    * 상태 변경 시 하단에 시간이 표시됩니다.
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