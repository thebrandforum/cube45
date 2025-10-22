'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminNavigation from '@/components/admin/navigation'

interface RoomPrice {
  room_id: string
  room_name: string
  zone: string
  price_weekday: number
  price_friday: number
  price_saturday: number
}

interface ZoneData {
  zone: string
  rooms: RoomPrice[]
  avgPrices: {
    weekday: number
    friday: number
    saturday: number
  }
}

interface PriceInput {
  weekday: number
  friday: number
  saturday: number
  price?: string
}

export default function PriceDetail() {
  const [zoneData, setZoneData] = useState<ZoneData[]>([])
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'table' | 'calendar'>('table')
  const [priceInputs, setPriceInputs] = useState<Record<string, PriceInput>>({})
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<string>('')


  // 데이터 로드
  useEffect(() => {
    fetchPriceData()
  }, [])

  const fetchPriceData = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('cube45_rooms')
        .select(`
          id,
          name,
          zone,
          cube45_room_prices!inner(
            price_weekday,
            price_friday,
            price_saturday
          )
        `)
        .order('zone')
        .order('name')

      if (error) throw error

      const groupedData: Record<string, RoomPrice[]> = {}
      const inputs: Record<string, PriceInput> = {}
      
      data?.forEach(room => {
        const roomPrice: RoomPrice = {
          room_id: room.id,
          room_name: room.name,
          zone: room.zone,
          price_weekday: room.cube45_room_prices[0]?.price_weekday || 0,
          price_friday: room.cube45_room_prices[0]?.price_friday || 0,
          price_saturday: room.cube45_room_prices[0]?.price_saturday || 0
        }
        
        if (!groupedData[room.zone]) {
          groupedData[room.zone] = []
        }
        groupedData[room.zone].push(roomPrice)
        
        inputs[room.id] = {
          weekday: roomPrice.price_weekday,
          friday: roomPrice.price_friday,
          saturday: roomPrice.price_saturday
        }
      })

      // 최빈값 계산 함수
      const getMostFrequent = (prices: number[]): number => {
        const frequencyMap: { [key: number]: number } = {}
        prices.forEach(price => {
          frequencyMap[price] = (frequencyMap[price] || 0) + 1
        })
        
        let maxFrequency = 0
        let mostFrequent = prices[0]
        
        for (const [price, frequency] of Object.entries(frequencyMap)) {
          if (frequency > maxFrequency) {
            maxFrequency = frequency
            mostFrequent = Number(price)
          }
        }
        
        return mostFrequent
      }

      const zones: ZoneData[] = Object.keys(groupedData).map(zone => {
        const rooms = groupedData[zone]
        const avgPrices = {
          weekday: getMostFrequent(rooms.map(r => r.price_weekday)),
          friday: getMostFrequent(rooms.map(r => r.price_friday)),
          saturday: getMostFrequent(rooms.map(r => r.price_saturday))
        }
        
        inputs[`zone_${zone}`] = {
          weekday: avgPrices.weekday,
          friday: avgPrices.friday,
          saturday: avgPrices.saturday
        }
        
        return { zone, rooms, avgPrices }
      })

      setZoneData(zones)
      setPriceInputs(inputs)
      
      // 이전 선택 유지, 없으면 첫 번째 객실 선택
      if (!selectedRoom && zones.length > 0 && zones[0].rooms.length > 0) {
        setSelectedRoom(zones[0].rooms[0].room_id)
      }
    } catch (error) {
      console.error('가격 데이터 로드 실패:', error)
      alert('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const toggleZoneExpand = (zone: string) => {
    const newExpanded = new Set(expandedZones)
    if (newExpanded.has(zone)) {
      newExpanded.delete(zone)
    } else {
      newExpanded.add(zone)
    }
    setExpandedZones(newExpanded)
  }

  const handleInputChange = (id: string, dayType: string, value: string) => {
    // 쉼표 제거하고 숫자로 변환
    const numValue = parseInt(value.replace(/,/g, '')) || 0
    
    setPriceInputs(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [dayType]: numValue
      }
    }))
  }

  const handleZonePriceApply = async (zone: string) => {
    const zoneKey = `zone_${zone}`
    const weekday = parseInt(String(priceInputs[zoneKey]?.weekday))
    const friday = parseInt(String(priceInputs[zoneKey]?.friday))
    const saturday = parseInt(String(priceInputs[zoneKey]?.saturday))

    if (isNaN(weekday) || isNaN(friday) || isNaN(saturday)) {
      alert('올바른 가격을 입력해주세요.')
      return
    }

    try {
      const roomIds = zoneData.find(z => z.zone === zone)?.rooms.map(r => r.room_id) || []
      
      const { error } = await supabase
        .from('cube45_room_prices')
        .update({
          price_weekday: weekday,
          price_friday: friday,
          price_saturday: saturday
        })
        .in('room_id', roomIds)

      if (error) throw error
      
      alert(`${zone}동 전체 가격이 일괄 적용되었습니다.`)
      fetchPriceData()
      
    } catch (error) {
      console.error('일괄 적용 실패:', error)
      alert('일괄 적용에 실패했습니다.')
    }
  }

  const handleRoomPriceSave = async (roomId: string) => {
    const weekday = parseInt(String(priceInputs[roomId]?.weekday))
    const friday = parseInt(String(priceInputs[roomId]?.friday))
    const saturday = parseInt(String(priceInputs[roomId]?.saturday))

    if (isNaN(weekday) || isNaN(friday) || isNaN(saturday)) {
      alert('올바른 가격을 입력해주세요.')
      return
    }

    try {
      const { error } = await supabase
        .from('cube45_room_prices')
        .update({
          price_weekday: weekday,
          price_friday: friday,
          price_saturday: saturday
        })
        .eq('room_id', roomId)

      if (error) throw error
      
      alert('가격이 저장되었습니다.')
      fetchPriceData()
      
    } catch (error) {
      console.error('개별 저장 실패:', error)
      alert('저장에 실패했습니다.')
    }
  }

  // 달력 관련 함수들
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const [specialPrices, setSpecialPrices] = useState<Record<string, number>>({})
  
  // 특별 가격 조회 함수 추가
  const fetchSpecialPrices = async (roomId: string, year: number, month: number) => {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    // 해당 월의 마지막 날 계산
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`
    
    const { data, error } = await supabase
      .from('cube45_special_prices')
      .select('special_date, price')
      .eq('room_id', roomId)
      .gte('special_date', startDate)
      .lte('special_date', endDate)
    
    if (!error && data) {
      const prices: Record<string, number> = {}
      data.forEach(item => {
        prices[item.special_date] = item.price
      })
      setSpecialPrices(prices)
    }
  }
  
  const getPriceForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
    
    
    // 특별 가격이 있으면 우선 적용
    if (specialPrices[dateStr]) {
      console.log('특별 가격 적용:', specialPrices[dateStr])
      return specialPrices[dateStr]
    }
    
    // 없으면 요일별 기본 가격
    const dayOfWeek = date.getDay()
    const room = zoneData.flatMap(z => z.rooms).find(r => r.room_id === selectedRoom)
    
    if (!room) return 0
    
    if (dayOfWeek === 5) return room.price_friday
    if (dayOfWeek === 6) return room.price_saturday
    return room.price_weekday
  }
  
  // 월 변경 또는 객실 변경 시 특별 가격 조회
  useEffect(() => {
    const currentYear = selectedMonth.getFullYear()
    const currentMonth = selectedMonth.getMonth() + 1
    
    if (selectedRoom && currentYear && currentMonth) {
      fetchSpecialPrices(selectedRoom, currentYear, currentMonth)
    }
  }, [selectedRoom, selectedMonth])

  const getDayType = (date: Date) => {
    const dayOfWeek = date.getDay()
    if (dayOfWeek === 5) return 'friday'
    if (dayOfWeek === 6) return 'saturday'
    return 'weekday'
  }

  const handleDateClick = (day: number) => {
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day)
    setSelectedDate(date)
  }

  const handleCalendarPriceSave = async () => {
    if (!selectedDate || !selectedRoom) {
      alert('날짜와 객실을 선택해주세요.')
      return
    }

    const inputKey = `calendar_${selectedRoom}_${selectedDate.toISOString().split('T')[0]}`
    const newPrice = parseInt(String(priceInputs[inputKey]?.price || getPriceForDate(selectedDate)))

    if (isNaN(newPrice)) {
      alert('올바른 가격을 입력해주세요.')
      return
    }

    try {
      const dateStr = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`
      
      // 특별 가격 테이블에 upsert (있으면 update, 없으면 insert)
      const { error } = await supabase
        .from('cube45_special_prices')
        .upsert({
          room_id: selectedRoom,
          special_date: dateStr,
          price: newPrice,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      
      const roomName = zoneData.flatMap(z => z.rooms).find(r => r.room_id === selectedRoom)?.room_name
      alert(`${roomName} ${selectedDate.toLocaleDateString()} 특별 가격이 저장되었습니다.`)
      
      // 특별 가격 다시 불러오기
      await fetchSpecialPrices(selectedRoom, selectedDate.getFullYear(), selectedDate.getMonth() + 1)
      
      // 기본 가격 데이터도 새로고침
      fetchPriceData()
      
    } catch (error) {
      console.error('특별 가격 저장 실패:', error)
      alert('저장에 실패했습니다.')
    }
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

      {/* 메인 콘텐츠 */}
      <main className="flex-1 p-3 md:p-6 mt-14 md:mt-16 md:ml-48">
        <div className="max-w-7xl mx-auto">
          <div className="hidden md:block mb-6">
            <h1 className="text-2xl font-bold text-gray-800">상세 요금 관리</h1>
          </div>

          {/* 뷰 전환 탭 */}
          <div className="mb-3 md:mb-4 flex space-x-2">
            <button
              onClick={() => setActiveView('table')}
              className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-base rounded ${
                activeView === 'table' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              테이블 뷰
            </button>
            <button
              onClick={() => setActiveView('calendar')}
              className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-base rounded ${
                activeView === 'calendar' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              달력 뷰
            </button>
          </div>

          {/* 테이블 뷰 */}
          {activeView === 'table' && (
            <div className="bg-white rounded shadow-sm overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-2 md:px-4 py-2 md:py-3 font-medium text-gray-700">구분</th>
                    <th className="text-center px-2 md:px-4 py-2 md:py-3 font-medium text-gray-700">
                      <span className="md:hidden">주중</span>
                      <span className="hidden md:inline">주중 (일~목)</span>
                    </th>
                    <th className="text-center px-2 md:px-4 py-2 md:py-3 font-medium text-gray-700">
                      <span className="md:hidden">금</span>
                      <span className="hidden md:inline">금요일</span>
                    </th>
                    <th className="text-center px-2 md:px-4 py-2 md:py-3 font-medium text-gray-700">
                      <span className="md:hidden">토</span>
                      <span className="hidden md:inline">토요일</span>
                    </th>
                    <th className="text-center px-2 md:px-4 py-2 md:py-3 font-medium text-gray-700">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {zoneData.map((zone) => (
                    <React.Fragment key={zone.zone}>
                      <tr className="bg-blue-50 border-b hover:bg-blue-100">
                        <td className="px-2 md:px-4 py-2 md:py-3">
                          <button
                            onClick={() => toggleZoneExpand(zone.zone)}
                            className="flex items-center font-medium text-gray-800 text-xs md:text-sm"
                          >
                            <span className="mr-1 md:mr-2">{expandedZones.has(zone.zone) ? '▼' : '▶'}</span>
                            <span>{zone.zone}동 ({zone.rooms.length})</span>
                          </button>
                        </td>
                        <td className="text-center px-1 md:px-4 py-2 md:py-3">
                          <input
                            type="text"
                            value={priceInputs[`zone_${zone.zone}`]?.weekday?.toLocaleString() || ''}
                            onChange={(e) => handleInputChange(`zone_${zone.zone}`, 'weekday', e.target.value)}
                            className="w-16 md:w-28 px-1 md:px-2 py-1 border rounded text-center text-xs md:text-sm"
                          />
                        </td>
                        <td className="text-center px-1 md:px-4 py-2 md:py-3">
                          <input
                            type="text"
                            value={priceInputs[`zone_${zone.zone}`]?.friday?.toLocaleString() || ''}
                            onChange={(e) => handleInputChange(`zone_${zone.zone}`, 'friday', e.target.value)}
                            className="w-16 md:w-28 px-1 md:px-2 py-1 border rounded text-center text-xs md:text-sm"
                          />
                        </td>
                        <td className="text-center px-1 md:px-4 py-2 md:py-3">
                          <input
                            type="text"
                            value={priceInputs[`zone_${zone.zone}`]?.saturday?.toLocaleString() || ''}
                            onChange={(e) => handleInputChange(`zone_${zone.zone}`, 'saturday', e.target.value)}
                            className="w-16 md:w-28 px-1 md:px-2 py-1 border rounded text-center text-xs md:text-sm"
                          />
                        </td>
                        <td className="text-center px-1 md:px-4 py-2 md:py-3">
                          <button
                            onClick={() => handleZonePriceApply(zone.zone)}
                            className="px-2 md:px-3 py-1 bg-blue-500 text-white text-[10px] md:text-xs rounded hover:bg-blue-600"
                          >
                            <span className="md:hidden">적용</span>
                            <span className="hidden md:inline">일괄적용</span>
                          </button>
                        </td>
                      </tr>
                      
                      {expandedZones.has(zone.zone) && zone.rooms.map((room, index) => (
                        <tr key={room.room_id} className={index % 2 === 0 ? "bg-white" : "bg-gray-200"}>
                          <td className="px-2 md:px-4 py-1.5 md:py-2 pl-6 md:pl-10 text-gray-600 text-xs md:text-sm">{room.room_name}</td>
                          <td className="text-center px-1 md:px-4 py-1.5 md:py-2">
                            <input
                              type="text"
                              value={priceInputs[room.room_id]?.weekday?.toLocaleString() || ''}
                              onChange={(e) => handleInputChange(room.room_id, 'weekday', e.target.value.replace(/,/g, ''))}
                              className="w-16 md:w-28 px-1 md:px-2 py-1 border rounded text-center text-xs md:text-sm"
                            />
                          </td>
                          <td className="text-center px-1 md:px-4 py-1.5 md:py-2">
                            <input
                              type="text"
                              value={priceInputs[room.room_id]?.friday?.toLocaleString() || ''}
                              onChange={(e) => handleInputChange(room.room_id, 'friday', e.target.value.replace(/,/g, ''))}
                              className="w-16 md:w-28 px-1 md:px-2 py-1 border rounded text-center text-xs md:text-sm"
                            />
                          </td>
                          <td className="text-center px-1 md:px-4 py-1.5 md:py-2">
                            <input
                              type="text"
                              value={priceInputs[room.room_id]?.saturday?.toLocaleString() || ''}
                              onChange={(e) => handleInputChange(room.room_id, 'saturday', e.target.value.replace(/,/g, ''))}
                              className="w-16 md:w-28 px-1 md:px-2 py-1 border rounded text-center text-xs md:text-sm"
                            />
                          </td>
                          <td className="text-center px-1 md:px-4 py-1.5 md:py-2">
                            <button
                              onClick={() => handleRoomPriceSave(room.room_id)}
                              className="px-2 md:px-3 py-1 bg-blue-500 text-white text-[10px] md:text-xs rounded hover:bg-blue-600"
                            >
                              저장
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 달력 뷰 */}
          {activeView === 'calendar' && (
            <div className="bg-white rounded shadow-sm p-3 md:p-6">
              <div className="mb-3 md:mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center justify-center md:justify-start space-x-2 md:space-x-4">
                  <button
                    onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
                    className="p-1 md:p-2 hover:bg-gray-100 rounded"
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h2 className="text-sm md:text-lg font-medium text-black">
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
                
                <div className="flex items-center justify-center md:justify-end space-x-2">
                  <label className="text-xs md:text-sm font-medium text-gray-700">객실:</label>
                  <select
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    className="px-2 md:px-3 py-1 border rounded text-xs md:text-sm"
                  >
                    {zoneData.flatMap(zone => 
                      zone.rooms.map(room => (
                        <option key={room.room_id} value={room.room_id}>{room.room_name}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-0.5 md:gap-1 mb-3 md:mb-4 overflow-x-auto min-w-[280px]">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                  <div key={day} className="text-center py-1 md:py-2 text-xs md:text-sm font-medium text-gray-700">
                    {day}
                  </div>
                ))}
                
                {Array.from({ length: getFirstDayOfMonth(selectedMonth) }).map((_, index) => (
                  <div key={`empty-${index}`} />
                ))}
                
                {Array.from({ length: getDaysInMonth(selectedMonth) }).map((_, index) => {
                  const day = index + 1
                  const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day)
                  const dayOfWeek = date.getDay()
                  const price = getPriceForDate(date)
                  const isSelected = selectedDate?.getDate() === day && 
                                   selectedDate?.getMonth() === selectedMonth.getMonth()
                  const dateStr = `${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
                  
                  return (
                    <button
                      key={day}
                      onClick={() => handleDateClick(day)}
                      className={`
                        p-1 md:p-2 border rounded text-xs md:text-sm
                        ${dayOfWeek === 0 ? 'text-red-500' : ''}
                        ${dayOfWeek === 6 ? 'text-blue-500' : ''}
                        ${isSelected ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'}
                      `}
                    >
                      <div className="font-medium text-xs md:text-sm">{day}</div>
                      <div className={`text-[9px] md:text-xs mt-0.5 md:mt-1 ${
                        specialPrices[dateStr] 
                          ? 'text-red-500 font-bold' 
                          : 'text-black'
                      }`}>
                        {price >= 100000 ? `${Math.round(price/1000)}k` : price.toLocaleString()}
                      </div>
                    </button>
                  )
                })}
              </div>

              {selectedDate && (
                <div className="border-t pt-3 md:pt-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="text-xs md:text-sm">
                      <span className="font-medium">선택된 날짜: </span>
                      <span className="text-black">{selectedDate.toLocaleDateString()} ({['일', '월', '화', '수', '목', '금', '토'][selectedDate.getDay()]}요일)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        placeholder={getPriceForDate(selectedDate).toString()}
                        onChange={(e) => handleInputChange(
                          `calendar_${selectedRoom}_${selectedDate.toISOString().split('T')[0]}`,
                          'price',
                          e.target.value
                        )}
                        className="w-24 md:w-32 px-2 py-1 border rounded text-center text-xs md:text-sm"
                      />
                      <button
                        onClick={handleCalendarPriceSave}
                        className="px-3 md:px-4 py-1 bg-blue-500 text-white text-xs md:text-sm rounded hover:bg-blue-600"
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