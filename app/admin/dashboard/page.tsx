'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminNavigation from '@/components/admin/navigation'


export default function AdminDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)	
  const [checkInCount, setCheckInCount] = useState(0)
  const [checkOutCount, setCheckOutCount] = useState(0)
  const [weather, setWeather] = useState({
    temp: 0,
    description: '',
    maxTemp: 0,
    humidity: 0,
    icon: ''
  })
  const [dailySales, setDailySales] = useState({
    currentGuests: 0,
    todayRevenue: 0,
    occupancyRate: 0,
    occupiedRooms: 0  // 추가
  })
  const [propertyReport, setPropertyReport] = useState({
    today: { adr: 0, occ: 0, rev: 0, bookings: 0, remaining: 0, total: 0 },
    monthly: { adr: 0, occ: 0, rev: 0, bookings: 0, remaining: 0, total: 0 },
    lastMonth: { adr: 0, occ: 0, rev: 0, bookings: 0, remaining: 0, total: 0 }
  })
  
  // 먼저 ZoneData 타입 정의 추가 (상단에)
  interface ZoneData {
    zone: string
    availableRooms: number
    currentPrice: number
  }

  // 상태 초기화 시 타입 명시
  const [zoneData, setZoneData] = useState<ZoneData[]>([])
  interface PriceChange {
    operator: string
    amount: string
  }

  const [priceChanges, setPriceChanges] = useState<Record<string, PriceChange>>({})
  const [totalRooms, setTotalRooms] = useState(0) // 전체 객실 수 상태 추가
  
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
	
  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])	

  // 체크인/체크아웃 데이터 조회
  useEffect(() => {
    const fetchDashboardData = async () => {
      const today = new Date().toISOString().split('T')[0]
      console.log('오늘 날짜:', today) // 디버깅용
      
      try {
        // 체크인 건수 조회
        const { data: checkInData } = await supabase
          .from('cube45_reservations')
          .select('id')
          .eq('check_in_date', today)
          .neq('status', 'cancelled')

        // 체크아웃 건수 조회  
        const { data: checkOutData } = await supabase
          .from('cube45_reservations')
          .select('id')
          .eq('check_out_date', today)
          .neq('status', 'cancelled')

        setCheckInCount(checkInData?.length || 0)
        setCheckOutCount(checkOutData?.length || 0)
      } catch (error) {
        console.error('대시보드 데이터 조회 실패:', error)
      }
    }

    fetchDashboardData()
  }, [])
	
  // 날씨 데이터 조회 (WeatherAPI 사용)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY
        const response = await fetch(
          `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=Gapyeong,South Korea&lang=ko`
        )
        const data = await response.json()
        
        setWeather({
          temp: Math.round(data.current.temp_c),
          description: data.current.condition.text,
          maxTemp: Math.round(data.current.temp_c),
          humidity: data.current.humidity,
          icon: data.current.condition.icon
        })
      } catch (error) {
        console.error('날씨 조회 실패:', error)
      }
    }

    fetchWeather()
  }, [])
	
  // 일일 매출현황 데이터 조회
  useEffect(() => {
    // totalRooms가 로드되지 않았으면 실행하지 않음
    if (totalRooms === 0) return

    const fetchDailySales = async () => {
      const today = new Date().toISOString().split('T')[0]
      
      try {
        // 현재 숙박중인 총 인원수 (체크인 <= 오늘 < 체크아웃)
        const { data: guestData } = await supabase
          .from('cube45_reservations')
          .select('adult_count, student_count, child_count, infant_count')
          .lte('check_in_date', today)
          .gt('check_out_date', today)
          .neq('status', 'cancelled')

        // 오늘 예약한 매출 (created_at이 오늘인 것)
        const { data: revenueData } = await supabase
          .from('cube45_reservations')
          .select('total_amount')
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59`)
          .neq('status', 'cancelled')

        const currentGuests = guestData?.reduce((sum, item) => 
          sum + (item.adult_count || 0) + (item.student_count || 0) + 
          (item.child_count || 0) + (item.infant_count || 0), 0) || 0

        const todayRevenue = revenueData?.reduce((sum, item) => 
          sum + (item.total_amount || 0), 0) || 0

        // 현재 숙박 중인 객실 수 조회 (중복 제거)
        const { data: occupiedRooms } = await supabase
          .from('cube45_reservations')
          .select('room_id')
          .lte('check_in_date', today)
          .gt('check_out_date', today)
          .neq('status', 'cancelled')

        const occupiedRoomCount = new Set(occupiedRooms?.map(item => item.room_id)).size
        const occupancyRate = totalRooms > 0 ? Math.round((occupiedRoomCount / totalRooms) * 100) : 0

        setDailySales({
          currentGuests,
          todayRevenue,
          occupancyRate,
          occupiedRooms: occupiedRoomCount  // 추가
        })

      } catch (error) {
        console.error('일일 매출현황 조회 실패:', error)
      }
    }

    fetchDailySales()
  }, [totalRooms])

  // 숙소리포트 데이터 조회
  useEffect(() => {
    // totalRooms가 로드되지 않았으면 실행하지 않음
    if (totalRooms === 0) return
    
    const fetchPropertyReport = async () => {
      const today = new Date().toISOString().split('T')[0]
      const thisMonth = today.substring(0, 7) // YYYY-MM
      const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().substring(0, 7)
      
      try {
        // 오늘 데이터
        const { data: todayData } = await supabase
          .from('cube45_reservations')
          .select('total_amount, room_id')
          .eq('check_in_date', today)
          .neq('status', 'cancelled')

        // 현재 숙박중인 객실 (오늘 기준 점유율)
        const { data: occupiedToday } = await supabase
          .from('cube45_reservations')
          .select('room_id')
          .lte('check_in_date', today)
          .gt('check_out_date', today)
          .neq('status', 'cancelled')

        // 이번달 데이터 (created_at 기준)
        const thisMonthStart = `${thisMonth}-01T00:00:00`
        const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().substring(0, 10)
        const thisMonthEnd = `${nextMonth}T00:00:00`
        
        const { data: monthlyData } = await supabase
          .from('cube45_reservations')
          .select('total_amount, created_at, room_id, nights')
          .gte('created_at', thisMonthStart)
          .lt('created_at', thisMonthEnd)
          .neq('status', 'cancelled')
        
        // 지난달 데이터 (created_at 기준)
        const lastMonthStart = `${lastMonth}-01T00:00:00`
        const thisMonthStartForEnd = `${thisMonth}-01T00:00:00`
        
        const { data: lastMonthData } = await supabase
          .from('cube45_reservations')
          .select('total_amount, created_at, room_id, nights')
          .gte('created_at', lastMonthStart)
          .lt('created_at', thisMonthStartForEnd)
          .neq('status', 'cancelled')
        
        console.log('이번달 데이터:', monthlyData)
        console.log('지난달 데이터:', lastMonthData)

        // 오늘 계산
        const todayBookings = todayData?.length || 0
        const todayRev = todayData?.reduce((sum, item) => sum + item.total_amount, 0) || 0
        const todayAdr = todayBookings > 0 ? Math.round(todayRev / todayBookings) : 0
        const todayOcc = totalRooms > 0 ? Math.round((new Set(occupiedToday?.map(item => item.room_id)).size / totalRooms) * 100) : 0
        const todayRemaining = totalRooms - todayBookings

        // 이번달 계산
        const monthlyBookings = monthlyData?.length || 0
        const monthlyRev = monthlyData?.reduce((sum, item) => sum + item.total_amount, 0) || 0
        const monthlyAdr = monthlyBookings > 0 ? Math.round(monthlyRev / monthlyBookings) : 0
        
        // 월간 점유율 계산 (판매된 총 객실박수 기준)
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
        const totalRoomNights = totalRooms * daysInMonth
        const soldRoomNights = monthlyData?.reduce((sum, item) => sum + (item.nights || 1), 0) || 0
        const monthlyOccRaw = totalRoomNights > 0 ? (soldRoomNights / totalRoomNights) * 100 : 0
        const monthlyOcc = monthlyOccRaw < 1 ? 
          Math.round(monthlyOccRaw * 10) / 10 : 
          Math.round(monthlyOccRaw)

        // 지난달 계산
        const lastMonthBookings = lastMonthData?.length || 0
        const lastMonthRev = lastMonthData?.reduce((sum, item) => sum + item.total_amount, 0) || 0
        const lastMonthAdr = lastMonthBookings > 0 ? Math.round(lastMonthRev / lastMonthBookings) : 0
        const lastMonthDays = new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate()
        const lastMonthTotalRooms = totalRooms * lastMonthDays
        const lastMonthSoldRoomNights = lastMonthData?.reduce((sum, item) => sum + (item.nights || 1), 0) || 0
        const lastMonthRemaining = lastMonthTotalRooms - lastMonthSoldRoomNights
        const lastMonthOccRaw = lastMonthTotalRooms > 0 ? (lastMonthSoldRoomNights / lastMonthTotalRooms) * 100 : 0
        const lastMonthOcc = lastMonthOccRaw < 1 ? 
          Math.round(lastMonthOccRaw * 10) / 10 : 
          Math.round(lastMonthOccRaw)
        
        setPropertyReport({
          today: { adr: todayAdr, occ: todayOcc, rev: todayRev, bookings: todayBookings, remaining: todayRemaining, total: totalRooms },
          monthly: { adr: monthlyAdr, occ: monthlyOcc, rev: monthlyRev, bookings: monthlyBookings, remaining: totalRoomNights - soldRoomNights, total: totalRoomNights },
          lastMonth: { adr: lastMonthAdr, occ: lastMonthOcc, rev: lastMonthRev, bookings: lastMonthBookings, remaining: lastMonthRemaining, total: lastMonthTotalRooms }
        })
		  
		console.log('이번달 잔여:', totalRoomNights - soldRoomNights)
        console.log('지난달 잔여:', lastMonthRemaining)
        console.log('차이:', Math.abs((totalRoomNights - soldRoomNights) - lastMonthRemaining))  

      } catch (error) {
        console.error('숙소리포트 조회 실패:', error)
      }
    }

    fetchPropertyReport()
  }, [totalRooms])	

  // 숙소투데이 데이터 조회
  useEffect(() => {
    const fetchZoneData = async () => {
      const today = new Date().toISOString().split('T')[0]
      const dayOfWeek = new Date().getDay()
      
      try {
        // 동별 객실 정보 및 요일별 가격 조회
        const { data: roomsData } = await supabase
          .from('cube45_rooms')
          .select(`
            id, 
            zone,
            cube45_room_prices (
              price_weekday,
              price_friday,
              price_saturday
            )
          `)
          .order('zone')

        // 현재 예약된 객실들 조회 (오늘 기준)
        const { data: reservedRooms } = await supabase
          .from('cube45_reservations')
          .select('room_id')
          .lte('check_in_date', today)
          .gt('check_out_date', today)
          .neq('status', 'cancelled')

        const reservedRoomIds = new Set(reservedRooms?.map(r => r.room_id) || [])

        // 동별 데이터 집계
        const zones = ['A', 'B', 'C', 'D']
        const zoneStats = zones.map(zone => {
          const zoneRooms = roomsData?.filter(room => room.zone === zone) || []
          const totalRooms = zoneRooms.length
          const reservedCount = zoneRooms.filter(room => reservedRoomIds.has(room.id)).length
          const availableRooms = totalRooms - reservedCount
          
          // 오늘 요일에 맞는 가격 선택
          let currentPrice = 0
          if (zoneRooms[0]?.cube45_room_prices?.[0]) {
            const prices = zoneRooms[0].cube45_room_prices[0]
            currentPrice = dayOfWeek === 5 ? prices.price_friday :
                          dayOfWeek === 6 ? prices.price_saturday :
                          prices.price_weekday
          }

          return {
            zone: `${zone}동`,
            availableRooms,
            currentPrice
          }
        })

        setZoneData(zoneStats)

        // 가격 변경 상태 초기화
        const initialChanges: Record<string, PriceChange> = {}
        zones.forEach(zone => {
          initialChanges[zone] = { operator: '+', amount: '' }
        })
        setPriceChanges(initialChanges)

      } catch (error) {
        console.error('숙소투데이 데이터 조회 실패:', error)
      }
    }

    fetchZoneData()
  }, [])

  const formatDate = (date: Date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const weekday = weekdays[date.getDay()]
    return `${month}.${day}(${weekday})`
  }

  // 가격 변경 핸들러
  const handlePriceChange = (zone: string, field: string, value: string) => {
    setPriceChanges(prev => ({
      ...prev,
      [zone]: {
        ...prev[zone],
        [field]: value
      }
    }))
  }

  // 가격 저장 핸들러
  const handleSavePrice = async (zoneData: ZoneData) => {
    const zone = zoneData.zone.replace('동', '') // 'A동' -> 'A'
    const change = priceChanges[zone]
    
    if (!change.amount || isNaN(Number(change.amount))) {
      alert('변경할 금액을 입력해주세요.')
      return
    }

    try {
      // 기존 가격에 연산 적용
      let newPrice = zoneData.currentPrice
      const amount = parseFloat(change.amount)

      switch (change.operator) {
        case '+':
          newPrice = zoneData.currentPrice + Math.round(amount)
          break
        case '-':
          newPrice = zoneData.currentPrice - Math.round(amount)
          break
        case '*':
          newPrice = Math.round(zoneData.currentPrice * amount)
          break
        case '/':
          newPrice = Math.round(zoneData.currentPrice / amount)
          break
      }

      // 음수 방지
      if (newPrice < 0) {
        alert('가격은 0원보다 작을 수 없습니다.')
        return
      }

      // 오늘 요일 확인
      const dayOfWeek = new Date().getDay()
      let priceField = 'price_weekday'
      if (dayOfWeek === 5) priceField = 'price_friday'
      if (dayOfWeek === 6) priceField = 'price_saturday'
      
      // 해당 동의 모든 객실 ID 조회
      const { data: zoneRooms } = await supabase
        .from('cube45_rooms')
        .select('id')
        .eq('zone', zone)
      
      const roomIds = zoneRooms?.map(r => r.id) || []   
      
      // 모든 요일 가격을 동일하게 업데이트
      const { error } = await supabase
        .from('cube45_room_prices')
        .update({
          price_weekday: newPrice,
          price_friday: newPrice,
          price_saturday: newPrice
        })
        .in('room_id', roomIds)

      if (error) throw error

      alert(`${zoneData.zone} 가격이 ${newPrice.toLocaleString()}원으로 변경되었습니다.`)
      
      // 데이터 새로고침
      window.location.reload()

    } catch (error) {
      console.error('가격 저장 실패:', error)
      alert('가격 저장에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <AdminNavigation />

      {/* 메인 콘텐츠 */}
      <main className="flex-1 p-3 md:p-6 mt-14 md:mt-16 md:ml-48">
        <div className="max-w-7xl mx-auto">
          {/* 헤더 - 모바일에서는 숨김 */}
          <div className="hidden md:block mb-6">
            <h1 className="text-2xl font-bold text-gray-800">대시보드</h1>
          </div>

          {/* 상단 3개 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-6">
            <div className="bg-white p-4 md:p-6 rounded shadow-sm">
              <div className="flex items-center">
                <div className="p-2 md:p-3 bg-green-100 rounded-full mr-3 md:mr-4">
                  <svg className="w-6 md:w-8 h-6 md:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600">체크인</p>
                  <p className="text-2xl md:text-3xl font-bold text-green-600">{checkInCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded shadow-sm">
              <div className="flex items-center">
                <div className="p-2 md:p-3 bg-red-100 rounded-full mr-3 md:mr-4">
                  <svg className="w-6 md:w-8 h-6 md:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600">체크아웃</p>
                  <p className="text-2xl md:text-3xl font-bold text-red-600">{checkOutCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded shadow-sm">
              <div className="flex items-center">
                <div className="p-2 md:p-3 bg-purple-100 rounded-full mr-3 md:mr-4">
                  <svg className="w-6 md:w-8 h-6 md:h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600">배정현황</p>
                  <p className="text-2xl md:text-3xl font-bold text-purple-600">
                    {dailySales.occupancyRate}%
                    <span className="text-sm md:text-lg font-medium ml-1">
                      ({dailySales.occupiedRooms}/{totalRooms})
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
            {/* 왼쪽 영역 */}
            <div className="col-span-1 md:col-span-4 space-y-4 md:space-y-6">
              {/* 일일 매출현황 */}
              <div className="bg-white rounded shadow-sm">
                <div className="p-3 md:p-4 border-b">
                  <h3 className="text-xs md:text-sm font-medium text-gray-700 flex items-center">
                    일일 매출현황
                    <button
                      onClick={() => window.open('/admin/dashboard/daily-sales', '_blank')}
                      className="ml-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="상세 매출 현황"
                    >
                      <svg className="w-3 md:w-4 h-3 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  </h3>
                </div>
                <div className="p-3 md:p-4">
                  <table className="w-full text-xs md:text-sm">
                    <tbody>
                      <tr className="bg-white">
                        <td className="py-1 md:py-2 text-gray-600">투숙</td>
                        <td className="py-1 md:py-2 text-right font-medium text-black">{dailySales.currentGuests}<span className="text-gray-500">명</span></td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="py-1 md:py-2 text-gray-600">매출</td>
                        <td className="py-1 md:py-2 text-right font-medium text-black">{dailySales.todayRevenue.toLocaleString()}<span className="text-gray-500">원</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 날씨 위젯 */}
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded shadow-sm text-white">
                <div className="p-3 md:p-4 border-b border-blue-300">
                  <div className="text-xs md:text-sm">{mounted ? formatDate(currentTime) : '--.--(-)' }</div>
                  <div className="text-xs text-blue-100">가평군</div>
                </div>
                <div className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl md:text-2xl font-bold flex items-center">
                        <span>{weather.temp}°</span>
                        <div className="ml-2 text-2xl md:text-3xl">
                          {weather.icon && (
                            <img 
                              src={`https:${weather.icon.replace('64x64', '128x128')}`}
                              alt={weather.description}
                              className="w-12 md:w-16 h-12 md:h-16"
                            />
                          )}
                        </div>
                      </div>
                      <div className="text-xs md:text-sm">{weather.description}</div>
                      <div className="text-xs text-blue-100">습도 {weather.humidity}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 중앙 영역 */}
            <div className="col-span-1 md:col-span-8 space-y-4 md:space-y-6">
              {/* 숙소리포트 */}
              <div className="bg-white rounded shadow-sm">
                <div className="p-3 md:p-4 border-b">
                  <h3 className="text-xs md:text-sm font-medium text-gray-700 flex items-center">
                    숙소리포트
                    <button
                      onClick={() => window.open('/admin/dashboard/property-report', '_blank')}
                      className="ml-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="상세 리포트"
                    >
                      <svg className="w-3 md:w-4 h-3 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-xs md:text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-2 md:py-3 md:px-4 font-medium text-gray-600"></th>
                        <th className="text-center py-2 px-2 md:py-3 md:px-4 font-medium text-gray-600">ADR</th>
                        <th className="text-center py-2 px-2 md:py-3 md:px-4 font-medium text-gray-600">OCC</th>
                        <th className="text-center py-2 px-2 md:py-3 md:px-4 font-medium text-gray-600">REV</th>
                        <th className="text-center py-2 px-2 md:py-3 md:px-4 font-medium text-gray-600">
                          <span className="md:hidden">예약</span>
                          <span className="hidden md:inline">BOOK<br/>
                          <span className="text-xs text-gray-400">(예약/잔여/총객실)</span></span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white">
                        <td className="py-2 px-2 md:py-3 md:px-4 text-gray-600">오늘</td>
                        <td className="text-center py-2 px-2 md:py-3 md:px-4 text-black">{propertyReport.today.adr.toLocaleString()}</td>
                        <td className="text-center py-2 px-2 md:py-3 md:px-4 text-black">{propertyReport.today.occ}%</td>
                        <td className="text-center py-2 px-2 md:py-3 md:px-4 text-black">{propertyReport.today.rev.toLocaleString()}</td>
                        <td className="text-center py-2 px-2 md:py-3 md:px-4 text-black">{propertyReport.today.bookings}/<span className="text-red-500">{propertyReport.today.remaining}</span>/{propertyReport.today.total}</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="py-2 px-2 md:py-3 md:px-4 text-gray-600">월간</td>
                        <td className="text-center py-2 px-2 md:py-3 md:px-4 text-black">{propertyReport.monthly.adr.toLocaleString()}</td>
                        <td className="text-center py-2 px-2 md:py-3 md:px-4 text-black">{propertyReport.monthly.occ}%</td>
                        <td className="text-center py-2 px-2 md:py-3 md:px-4 text-black">{propertyReport.monthly.rev.toLocaleString()}</td>
                        <td className="text-center py-2 px-2 md:py-3 md:px-4 text-black">{propertyReport.monthly.bookings}/<span className="text-red-500">{propertyReport.monthly.remaining}</span>/{propertyReport.monthly.total}</td>
                      </tr>
                      <tr className="bg-white">
                        <td className="py-2 px-2 md:py-3 md:px-4 text-gray-600">
                          <span className="md:hidden">전월</span>
                          <span className="hidden md:inline">전월대비</span>
                        </td>
                        <td className="text-center py-2 px-2 md:py-3 md:px-4">
                          <span className={propertyReport.monthly.adr >= propertyReport.lastMonth.adr ? "text-blue-500" : "text-red-500"}>
                            {propertyReport.monthly.adr >= propertyReport.lastMonth.adr ? '↑' : '↓'} {Math.abs(propertyReport.monthly.adr - propertyReport.lastMonth.adr).toLocaleString()}
                          </span>
                        </td>
                        <td className="text-center py-2 px-2 md:py-3 md:px-4">
                          <span className={propertyReport.monthly.occ >= propertyReport.lastMonth.occ ? "text-blue-500" : "text-red-500"}>
                            {propertyReport.monthly.occ >= propertyReport.lastMonth.occ ? '↑' : '↓'} {Math.abs(propertyReport.monthly.occ - propertyReport.lastMonth.occ)}%
                          </span>
                        </td>
                        <td className="text-center py-2 px-2 md:py-3 md:px-4">
                          <span className={propertyReport.monthly.rev >= propertyReport.lastMonth.rev ? "text-blue-500" : "text-red-500"}>
                            {propertyReport.monthly.rev >= propertyReport.lastMonth.rev ? '↑' : '↓'} {Math.abs(propertyReport.monthly.rev - propertyReport.lastMonth.rev).toLocaleString()}
                          </span>
                        </td>
                        <td className="text-center py-2 px-2 md:py-3 md:px-4">
                          <span className={propertyReport.monthly.bookings >= propertyReport.lastMonth.bookings ? "text-blue-500" : "text-red-500"}>
                            {propertyReport.monthly.bookings >= propertyReport.lastMonth.bookings ? '↑' : '↓'} {Math.abs(propertyReport.monthly.bookings - propertyReport.lastMonth.bookings)}
                          </span>
                          /
                          <span className={propertyReport.monthly.remaining <= propertyReport.lastMonth.remaining ? "text-blue-500" : "text-red-500"}>
                            {propertyReport.monthly.remaining <= propertyReport.lastMonth.remaining ? '↑' : '↓'} {Math.abs(propertyReport.monthly.remaining - propertyReport.lastMonth.remaining)}
                          </span>
                          /
                          <span className={propertyReport.monthly.total >= propertyReport.lastMonth.total ? "text-blue-500" : "text-red-500"}>
                            {propertyReport.monthly.total >= propertyReport.lastMonth.total ? '↑' : '↓'} {Math.abs(propertyReport.monthly.total - propertyReport.lastMonth.total)}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 요금관리 */}
              <div className="bg-white rounded shadow-sm">
                <div className="p-3 md:p-4 border-b">
                  <h3 className="text-xs md:text-sm font-medium text-gray-700 flex items-center">
                    요금관리
                    <button
                      onClick={() => window.open('/admin/dashboard/price-detail', '_blank')}
                      className="ml-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="상세 요금 변경"
                    >
                      <svg className="w-3 md:w-4 h-3 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-xs md:text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-2 md:py-3 md:px-4 font-medium text-gray-600">
                          <span className="md:hidden">상품</span>
                          <span className="hidden md:inline">상품명</span>
                        </th>
                        <th className="text-center py-2 px-2 md:py-3 md:px-4 font-medium text-gray-600">
                          <span className="md:hidden">잔여</span>
                          <span className="hidden md:inline">잔여객실수</span>
                        </th>
                        <th className="text-center py-2 px-2 md:py-3 md:px-4 font-medium text-gray-600">현재가</th>
                        <th className="text-center py-2 px-2 md:py-3 md:px-4 font-medium text-gray-600">변경가</th>
                        <th className="text-center py-2 px-2 md:py-3 md:px-4 font-medium text-gray-600"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {zoneData.map((zone, index) => {
                        const zoneKey = zone.zone.replace('동', '')
                        const change = priceChanges[zoneKey] || { operator: '+', amount: '' }
                        
                        return (
                          <tr key={zone.zone} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="py-2 px-2 md:py-3 md:px-4 text-gray-700">{zone.zone}</td>
                            <td className="text-center py-2 px-2 md:py-3 md:px-4 text-black">{zone.availableRooms}</td>
                            <td className="text-center py-2 px-2 md:py-3 md:px-4 text-black">{zone.currentPrice.toLocaleString()}</td>
                            <td className="text-center py-2 px-2 md:py-3 md:px-4">
                              <div className="flex items-center justify-center gap-1">
                                <select 
                                  value={change.operator}
                                  onChange={(e) => handlePriceChange(zoneKey, 'operator', e.target.value)}
                                  className="w-10 md:w-12 px-1 py-1 border rounded text-center text-xs md:text-sm"
                                >
                                  <option value="+">+</option>
                                  <option value="-">-</option>
                                  <option value="*">×</option>
                                  <option value="/">÷</option>
                                </select>
                                <input 
                                  type="number" 
                                  value={change.amount}
                                  onChange={(e) => handlePriceChange(zoneKey, 'amount', e.target.value)}
                                  className="w-16 md:w-20 px-1 md:px-2 py-1 border rounded text-center text-xs md:text-sm" 
                                  placeholder="금액"
                                  step="0.1"
                                />
                              </div>
                            </td>
                            <td className="text-center py-2 px-2 md:py-3 md:px-4">
                              <button 
                                onClick={() => handleSavePrice(zone)}
                                className="px-2 md:px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                              >
                                저장
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}