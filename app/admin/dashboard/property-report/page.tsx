'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminNavigation from '@/components/admin/navigation'

interface DailyReport {
  date: string
  adr: number
  occ: number
  occupiedRooms: number
  rev: number
  bookings: number
  remaining: number
  total: number
}

interface DetailReservation {
    id: number
    reservation_number: string
    room_name: string
    guest_name: string
    booker_name: string
    check_in_date: string
    check_out_date: string
    nights: number
    total_amount: number
    type: 'check_in' | 'staying'
  }

export default function PropertyReportDetail() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [monthlyData, setMonthlyData] = useState<Record<string, DailyReport>>({})
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailReservations, setDetailReservations] = useState<DetailReservation[]>([])
  const [totalRooms, setTotalRooms] = useState(0)

  // 전체 객실 수 조회
  useEffect(() => {
    const fetchTotalRooms = async () => {
      try {
        const { count } = await supabase
          .from('cube45_rooms')
          .select('*', { count: 'exact', head: true })
        
        setTotalRooms(count || 0)
      } catch (error) {
        console.error('전체 객실 수 조회 실패:', error)
      }
    }

    fetchTotalRooms()
  }, [])

  // 월별 데이터 조회
  useEffect(() => {
    if (totalRooms > 0) {
      fetchMonthlyData()
    }
  }, [selectedMonth, totalRooms])

  const fetchMonthlyData = async () => {
    setLoading(true)
    
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth() + 1
    const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const lastDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`
    
    try {
      // 해당 월의 모든 예약 데이터 조회
      const { data: reservations, error } = await supabase
        .from('cube45_reservations')
        .select('*')
        .or(`check_in_date.gte.${firstDay},check_out_date.lte.${lastDate},created_at.gte.${firstDay}T00:00:00`)
        .neq('status', 'cancelled')

      if (error) throw error

      // 날짜별 데이터 집계
      const dailyMap: Record<string, DailyReport> = {}
      
      // 각 날짜 초기화
      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
        dailyMap[dateStr] = {
          date: dateStr,
          adr: 0,
          occ: 0,
          occupiedRooms: 0,
          rev: 0,
          bookings: 0,
          remaining: totalRooms,
          total: totalRooms
        }
      }

      // 각 날짜별 계산
      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
        
        // 해당 날짜에 체크인하는 예약들
        const checkInReservations = reservations?.filter(r => r.check_in_date === dateStr) || []
        const todayBookings = checkInReservations.length
        const todayRevenue = checkInReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0)
        
        // 해당 날짜에 숙박 중인 객실들
        const occupiedRoomIds = new Set<string>()
        reservations?.forEach(reservation => {
          if (reservation.check_in_date <= dateStr && reservation.check_out_date > dateStr) {
            occupiedRoomIds.add(reservation.room_id)
          }
        })
        
        const occupiedCount = occupiedRoomIds.size
        const occupancyRate = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0
        const averageDailyRate = todayBookings > 0 ? Math.round(todayRevenue / todayBookings) : 0
        
        dailyMap[dateStr] = {
          date: dateStr,
          adr: averageDailyRate,
          occ: occupancyRate,
          occupiedRooms: occupiedCount,
          rev: todayRevenue,
          bookings: todayBookings,
          remaining: totalRooms - occupiedCount,
          total: totalRooms
        }
      }

      setMonthlyData(dailyMap)
    } catch (error) {
      console.error('월별 데이터 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 선택한 날짜의 상세 예약 조회
  const fetchDayDetail = async (date: string) => {
    try {
      // 해당 날짜에 체크인하는 예약들
      const { data: checkInData, error: checkInError } = await supabase
        .from('cube45_reservations')
        .select('*')
        .eq('check_in_date', date)
        .neq('status', 'cancelled')
        .order('room_name')

      // 해당 날짜에 숙박 중인 예약들
      const { data: stayingData, error: stayingError } = await supabase
        .from('cube45_reservations')
        .select('*')
        .lte('check_in_date', date)
        .gt('check_out_date', date)
        .neq('status', 'cancelled')
        .order('room_name')

      if (checkInError || stayingError) throw checkInError || stayingError
      
      // 체크인 예약과 숙박 중인 예약을 구분하여 표시
      const allReservations = [
        ...(checkInData || []).map(r => ({ ...r, type: 'check_in' as const })),
        ...(stayingData || []).map(r => ({ ...r, type: 'staying' as const }))
      ]
      
      // 중복 제거 (체크인 날짜와 숙박 중이 겹치는 경우 체크인으로 표시)
      const uniqueReservations = allReservations.filter((reservation, index, self) =>
        index === self.findIndex((r) => r.id === reservation.id)
      )
      
      setDetailReservations(uniqueReservations)
    } catch (error) {
      console.error('상세 데이터 조회 실패:', error)
    }
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const handleDateClick = (day: number) => {
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day)
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    
    setSelectedDate(date)
    fetchDayDetail(dateStr)
  }

  // 월 합계 계산
  const monthlyTotal = Object.values(monthlyData).reduce((acc, cur) => ({
    totalRev: acc.totalRev + cur.rev,
    totalBookings: acc.totalBookings + cur.bookings,
    avgAdr: 0, // 나중에 계산
    avgOcc: 0  // 나중에 계산
  }), { totalRev: 0, totalBookings: 0, avgAdr: 0, avgOcc: 0 })

  // 평균 ADR과 OCC 계산
  monthlyTotal.avgAdr = monthlyTotal.totalBookings > 0 ? Math.round(monthlyTotal.totalRev / monthlyTotal.totalBookings) : 0
  const totalOccupiedDays = Object.values(monthlyData).reduce((sum, cur) => sum + cur.occupiedRooms, 0)
  const daysInMonth = getDaysInMonth(selectedMonth)
  monthlyTotal.avgOcc = daysInMonth > 0 && totalRooms > 0 ? 
    Math.round((totalOccupiedDays / (daysInMonth * totalRooms)) * 100) : 0

  // 숫자 포맷팅 함수
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 100000) {
      return `${Math.round(num / 1000)}k`
    } else if (num >= 10000) {
      return `${(num / 1000).toFixed(0)}k`
    }
    return num.toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-base md:text-lg text-black">데이터 로딩중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <AdminNavigation />

      <main className="flex-1 p-3 md:p-6 mt-14 md:mt-16 md:ml-48">
        <div className="max-w-7xl mx-auto">
          {/* 헤더 - 모바일에서는 숨김 */}
          <div className="hidden md:block mb-6">
            <h1 className="text-2xl font-bold text-gray-800">숙소리포트 상세</h1>
          </div>

          {/* 월 네비게이션 */}
          <div className="bg-white rounded shadow-sm p-3 md:p-4 mb-4 md:mb-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-center md:justify-start space-x-2 md:space-x-4">
                <button
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
                  className="p-1 md:p-2 hover:bg-gray-100 rounded"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-base md:text-xl font-semibold text-black">
                  {selectedMonth.getFullYear()}년 {selectedMonth.getMonth() + 1}월
                </h2>
                <button
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
                  className="p-1 md:p-2 hover:bg-gray-100 rounded"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              {/* 월 합계 - 모바일에서는 2열 그리드 */}
              <div className="grid grid-cols-2 md:flex gap-2 md:gap-4 text-[10px] md:text-sm">
                <div>
                  <span className="text-gray-600">평균ADR:</span>
                  <span className="ml-1 font-semibold text-black">{monthlyTotal.avgAdr.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">평균OCC:</span>
                  <span className="ml-1 font-semibold text-black">{monthlyTotal.avgOcc}%</span>
                </div>
                <div>
                  <span className="text-gray-600">총REV:</span>
                  <span className="ml-1 font-semibold text-black">{formatNumber(monthlyTotal.totalRev)}</span>
                </div>
                <div className="hidden md:block">
                  <span className="text-gray-600">월 총 BOOK:</span>
                  <span className="ml-2 font-semibold text-black">
                    {monthlyTotal.totalBookings}/{totalRooms * daysInMonth - totalOccupiedDays}/{totalRooms * daysInMonth}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">총예약:</span>
                  <span className="ml-1 font-semibold text-black">{monthlyTotal.totalBookings}건</span>
                </div>
              </div>
            </div>
          </div>

          {/* 달력 */}
          <div className="bg-white rounded shadow-sm p-2 md:p-6 mb-4 md:mb-6 overflow-x-auto">
            <div className="grid grid-cols-7 gap-0.5 md:gap-1 min-w-[350px]">
              {/* 요일 헤더 */}
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="text-center py-1 md:py-2 text-xs md:text-sm font-semibold text-gray-700 border-b">
                  {day}
                </div>
              ))}
              
              {/* 빈 칸 */}
              {Array.from({ length: getFirstDayOfMonth(selectedMonth) }).map((_, index) => (
                <div key={`empty-${index}`} className="h-16 md:h-20" />
              ))}
              
              {/* 날짜 칸 */}
              {Array.from({ length: getDaysInMonth(selectedMonth) }).map((_, index) => {
                const day = index + 1
                const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day)
                const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
                const dayData = monthlyData[dateStr]
                const dayOfWeek = date.getDay()
                const isSelected = selectedDate?.getDate() === day && 
                                 selectedDate?.getMonth() === selectedMonth.getMonth()
                
                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`
                      h-16 md:h-20 p-0.5 md:p-1.5 border rounded text-xs hover:bg-gray-50 transition-colors
                      ${dayOfWeek === 0 ? 'bg-red-50' : ''}
                      ${dayOfWeek === 6 ? 'bg-blue-50' : ''}
                      ${isSelected ? 'ring-1 md:ring-2 ring-blue-500 bg-blue-100' : ''}
                    `}
                  >
                    <div className={`font-semibold text-[10px] md:text-sm mb-0.5 md:mb-1 ${
                      dayOfWeek === 0 ? 'text-red-600' : 
                      dayOfWeek === 6 ? 'text-blue-600' : 'text-gray-800'
                    }`}>
                      {day}
                    </div>
                    
                    <div className="space-y-0 text-right text-[9px] md:text-xs">
                      <div className="text-gray-700">
                        {formatNumber(dayData?.adr || 0)}/{dayData?.occ || 0}%
                      </div>
                      <div className="text-gray-700">
                        /{formatNumber(dayData?.rev || 0)}
                      </div>
                      <div className="text-gray-600">
                        {dayData?.bookings || 0}/<span className="text-red-500">{dayData?.remaining || 0}</span>/{dayData?.total || 0}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 선택한 날짜 상세 정보 */}
          {selectedDate && (
            <div className="bg-white rounded shadow-sm p-3 md:p-6">
              <h3 className="text-sm md:text-lg font-semibold mb-3 md:mb-4 text-black">
                {selectedDate.toLocaleDateString()} 예약 내역
              </h3>
              
              {detailReservations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs md:text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-2 md:px-4 py-1 md:py-2">
                          <span className="md:hidden">예약</span>
                          <span className="hidden md:inline">예약번호</span>
                        </th>
                        <th className="text-left px-2 md:px-4 py-1 md:py-2">객실</th>
                        <th className="text-left px-2 md:px-4 py-1 md:py-2 hidden md:table-cell">투숙객</th>
                        <th className="text-center px-2 md:px-4 py-1 md:py-2 hidden md:table-cell">체크인</th>
                        <th className="text-center px-2 md:px-4 py-1 md:py-2 hidden md:table-cell">체크아웃</th>
                        <th className="text-center px-2 md:px-4 py-1 md:py-2">
                          <span className="md:hidden">박</span>
                          <span className="hidden md:inline">숙박일</span>
                        </th>
                        <th className="text-right px-2 md:px-4 py-1 md:py-2">금액</th>
                        <th className="text-center px-2 md:px-4 py-1 md:py-2">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailReservations.map((res, idx) => (
                        <tr key={res.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 md:px-4 py-1 md:py-2 text-black text-[10px] md:text-sm">
                            <span className="md:hidden">{res.reservation_number.slice(-6)}</span>
                            <span className="hidden md:inline">{res.reservation_number}</span>
                          </td>
                          <td className="px-2 md:px-4 py-1 md:py-2 text-black text-[10px] md:text-sm">{res.room_name}</td>
                          <td className="px-2 md:px-4 py-1 md:py-2 hidden md:table-cell text-black">{res.guest_name || res.booker_name}</td>
                          <td className="text-center px-2 md:px-4 py-1 md:py-2 hidden md:table-cell text-black">{res.check_in_date}</td>
                          <td className="text-center px-2 md:px-4 py-1 md:py-2 hidden md:table-cell text-black">{res.check_out_date}</td>
                          <td className="text-center px-2 md:px-4 py-1 md:py-2 text-black text-[10px] md:text-sm">{res.nights}<span className="hidden md:inline">박</span></td>
                          <td className="text-right px-2 md:px-4 py-1 md:py-2 text-black text-[10px] md:text-sm">
                            <span className="md:hidden">{res.total_amount >= 100000 ? `${Math.round(res.total_amount/1000)}k` : `${Math.round(res.total_amount/1000)}k`}</span>
                            <span className="hidden md:inline">{formatNumber(res.total_amount)}</span>
                          </td>
                          <td className="text-center px-2 md:px-4 py-1 md:py-2">
                            <span className={`px-1 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs ${
                              res.type === 'check_in' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              <span className="md:hidden">{res.type === 'check_in' ? '체크인' : '숙박'}</span>
                              <span className="hidden md:inline">{res.type === 'check_in' ? '체크인' : '숙박중'}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4 text-xs md:text-base">해당 날짜에 예약이 없습니다.</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}