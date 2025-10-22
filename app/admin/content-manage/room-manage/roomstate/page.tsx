'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminNavigation from '@/components/admin/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Room {
  id: string
  name: string
  zone: string
}

interface BlockedRoom {
  room_id: string
  block_date: string
}

export default function RoomStatePage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1)
  const [rooms, setRooms] = useState<Room[]>([])
  const [blockedRooms, setBlockedRooms] = useState<BlockedRoom[]>([])
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set())
  const [loadingButtons, setLoadingButtons] = useState<Set<string>>(new Set())

  // 데이터 조회
  useEffect(() => {
    fetchData()
  }, [currentYear, currentMonth])

  // 현재 주차 자동 펼치기
  useEffect(() => {
    const weeks = getWeeksInMonth()
    const currentWeekIdx = weeks.findIndex(week => {
      const todayDate = today.getDate()
      return week.includes(todayDate) && 
             currentYear === today.getFullYear() && 
             currentMonth === today.getMonth() + 1
    })
    
    if (currentWeekIdx !== -1) {
      // 현재 주차부터 마지막 주차까지 펼치기
      const newExpanded = new Set<number>()
      for (let i = currentWeekIdx; i < weeks.length; i++) {
        newExpanded.add(i)
      }
      setExpandedWeeks(newExpanded)
    } else {
      // 현재 월이 아니면 모두 펼치기
      setExpandedWeeks(new Set(weeks.map((_, idx) => idx)))
    }
  }, [currentYear, currentMonth])

  const fetchData = async () => {
    try {
      // 방 목록 조회
      const { data: roomsData } = await supabase
        .from('cube45_rooms')
        .select('id, name, zone')
        .eq('is_available', true)
        .order('zone')
        .order('id')
      
      if (roomsData) setRooms(roomsData)

      // 해당 월의 막힌 방 조회
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`
      
      const { data: blockedData } = await supabase
        .from('cube45_room_blocks')
        .select('room_id, block_date')
        .gte('block_date', startDate)
        .lte('block_date', endDate)
      
      if (blockedData) setBlockedRooms(blockedData)
      
    } catch (error) {
      console.error('데이터 조회 실패:', error)
    }
  }

  // 달력 계산
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay()
  }

  const getWeeksInMonth = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
    const weeks: number[][] = []
    let week: number[] = []
    
    for (let i = 0; i < firstDay; i++) {
      week.push(0)
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day)
      if (week.length === 7) {
        weeks.push(week)
        week = []
      }
    }
    
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(0)
      }
      weeks.push(week)
    }
    
    return weeks
  }

  // 날짜가 오늘 이후인지 확인
  const isFutureDate = (date: number) => {
    if (date === 0) return false
    const targetDate = new Date(currentYear, currentMonth - 1, date)
    targetDate.setHours(0, 0, 0, 0)
    return targetDate >= today
  }

  // 방 막힘 상태 확인
  const isRoomBlocked = (roomId: string, date: number) => {
    if (date === 0) return false
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`
    return blockedRooms.some(b => b.room_id === roomId && b.block_date === dateStr)
  }

  // 특정 날짜 막힌 방 개수
  const getBlockedCount = (date: number) => {
    if (date === 0) return 0
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`
    return blockedRooms.filter(b => b.block_date === dateStr).length
  }

  // 개별 방 토글
  const toggleRoom = async (roomId: string, date: number) => {
    const buttonKey = `${roomId}-${date}`
    setLoadingButtons(prev => new Set(prev).add(buttonKey))

    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`
    const isBlocked = isRoomBlocked(roomId, date)

    try {
      if (isBlocked) {
        await supabase
          .from('cube45_room_blocks')
          .delete()
          .eq('room_id', roomId)
          .eq('block_date', dateStr)
      } else {
        await supabase
          .from('cube45_room_blocks')
          .insert({ room_id: roomId, block_date: dateStr })
      }
      
      await fetchData()
    } catch (error) {
      console.error('방 상태 변경 실패:', error)
      alert('변경 실패')
    } finally {
      setLoadingButtons(prev => {
        const newSet = new Set(prev)
        newSet.delete(buttonKey)
        return newSet
      })
    }
  }

  // 일괄 처리
  const toggleAll = async (date: number, shouldBlock: boolean) => {
    if (date === 0) return
    if (!confirm(`${date}일 전체 방을 ${shouldBlock ? '막기' : '열기'}하시겠습니까?`)) return

    const buttonKey = `all-${date}`
    setLoadingButtons(prev => new Set(prev).add(buttonKey))

    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`

    try {
      if (shouldBlock) {
        const inserts = rooms.map(room => ({
          room_id: room.id,
          block_date: dateStr
        }))
        await supabase.from('cube45_room_blocks').upsert(inserts)
      } else {
        await supabase
          .from('cube45_room_blocks')
          .delete()
          .eq('block_date', dateStr)
      }
      
      await fetchData()
    } catch (error) {
      console.error('일괄 처리 실패:', error)
      alert('처리 실패')
    } finally {
      setLoadingButtons(prev => {
        const newSet = new Set(prev)
        newSet.delete(buttonKey)
        return newSet
      })
    }
  }

  // 주 토글
  const toggleWeek = (weekIndex: number) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(weekIndex)) {
        newSet.delete(weekIndex)
      } else {
        newSet.add(weekIndex)
      }
      return newSet
    })
  }

  // 월 이동
  const moveMonth = (direction: number) => {
    if (direction > 0) {
      if (currentMonth === 12) {
        setCurrentMonth(1)
        setCurrentYear(currentYear + 1)
      } else {
        setCurrentMonth(currentMonth + 1)
      }
    } else {
      if (currentMonth === 1) {
        setCurrentMonth(12)
        setCurrentYear(currentYear - 1)
      } else {
        setCurrentMonth(currentMonth - 1)
      }
    }
  }

  const weeks = getWeeksInMonth()
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <AdminNavigation />

      <main className="flex-1 p-6 pt-30">
        <div className="max-w-7xl mx-auto">
          {/* 헤더 */}
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">방 상태 관리</h1>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => moveMonth(-1)}
                className="px-4 py-2 bg-white border rounded hover:bg-gray-50"
              >
                ←
              </button>
              <span className="text-lg font-medium min-w-[120px] text-center">
                {currentYear}년 {currentMonth}월
              </span>
              <button
                onClick={() => moveMonth(1)}
                className="px-4 py-2 bg-white border rounded hover:bg-gray-50"
              >
                →
              </button>
            </div>
          </div>

          {/* 달력 */}
          <div className="bg-white rounded-lg shadow">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 border-b bg-gray-50">
              {dayNames.map((day, idx) => (
                <div
                  key={day}
                  className={`p-3 text-center font-bold ${
                    idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-700'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 주별 행 */}
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="border-b last:border-b-0">
                {/* 주 헤더 */}
                <div
                  onClick={() => toggleWeek(weekIdx)}
                  className="bg-blue-50 p-2 cursor-pointer hover:bg-blue-100 flex justify-between items-center"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {week.find(d => d > 0)}일 ~ {week.filter(d => d > 0).pop()}일
                  </span>
                  {expandedWeeks.has(weekIdx) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>

                {/* 날짜 셀 */}
                {expandedWeeks.has(weekIdx) && (
                  <div className="grid grid-cols-7">
                    {week.map((date, dayIdx) => (
                      <div
                        key={`${weekIdx}-${dayIdx}`}
                        className={`min-h-[250px] border-r last:border-r-0 p-2 ${
                          date === 0 ? 'bg-gray-50' : ''
                        }`}
                      >
                        {/* 오늘 이후 날짜만 내용 표시 */}
                        {date > 0 && isFutureDate(date) && (
                          <>
                            {/* 날짜 표시 */}
                            <div className="flex justify-between items-center mb-2 pb-2 border-b">
                              <span className={`text-lg font-bold ${
                                dayIdx === 0 ? 'text-red-500' : dayIdx === 6 ? 'text-blue-500' : 'text-gray-800'
                              }`}>
                                {date}일
                              </span>
                              <span className="text-xs text-gray-500">
                                막힌방: {getBlockedCount(date)}/{rooms.length}
                              </span>
                            </div>

                            {/* 일괄 버튼 */}
                            <div className="flex gap-1 mb-2">
                              <button
                                onClick={() => toggleAll(date, true)}
                                disabled={loadingButtons.has(`all-${date}`)}
                                className="flex-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {loadingButtons.has(`all-${date}`) ? '처리중' : '전체막기'}
                              </button>
                              <button
                                onClick={() => toggleAll(date, false)}
                                disabled={loadingButtons.has(`all-${date}`)}
                                className="flex-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {loadingButtons.has(`all-${date}`) ? '처리중' : '전체열기'}
                              </button>
                            </div>

                            {/* 방 목록 */}
                            <div className="space-y-1 max-h-[400px] overflow-y-auto">
                              {rooms.map(room => {
                                const blocked = isRoomBlocked(room.id, date)
                                const buttonKey = `${room.id}-${date}`
                                const isLoading = loadingButtons.has(buttonKey)
                                
                                return (
                                  <div
                                    key={room.id}
                                    className={`p-2 rounded text-xs flex justify-between items-center transition-colors ${
                                      blocked ? 'bg-red-100' : 'bg-green-100'
                                    }`}
                                  >
                                    <span className="font-medium">{room.id}</span>
                                    <button
                                      onClick={() => toggleRoom(room.id, date)}
                                      disabled={isLoading}
                                      className={`w-10 h-5 rounded-full relative transition-colors disabled:opacity-50 ${
                                        blocked ? 'bg-red-500' : 'bg-green-500'
                                      }`}
                                    >
                                      {isLoading ? (
                                        <div className="text-white text-[10px] flex items-center justify-center h-full">
                                          ...
                                        </div>
                                      ) : (
                                        <div
                                          className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                                            blocked ? 'translate-x-5' : 'translate-x-0.5'
                                          }`}
                                        />
                                      )}
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        )}
                        
                        {/* 과거 날짜는 날짜 숫자만 표시 */}
                        {date > 0 && !isFutureDate(date) && (
                          <div className="flex justify-between items-center mb-2 pb-2">
                            <span className={`text-lg font-bold text-gray-400 ${
                              dayIdx === 0 ? 'text-red-300' : dayIdx === 6 ? 'text-blue-300' : ''
                            }`}>
                              {date}일
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}