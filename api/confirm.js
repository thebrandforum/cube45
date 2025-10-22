import { supabase } from '@/lib/supabase'

// 예약자 이름과 전화번호로 예약 조회
export const getReservationByNameAndPhone = async (bookerName, bookerPhone) => {
  try {
    const { data, error } = await supabase
      .from('cube45_reservations')
      .select('*')
      .eq('booker_name', bookerName)
      .eq('booker_phone', bookerPhone)
      .eq('is_deleted', false)  // 삭제되지 않은 예약만 조회
      .in('status', ['confirmed', 'cancelled'])
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('예약 조회 실패:', error)
    return { success: false, error }
  }
}

// 예약 취소
export const cancelReservationByInfo = async (bookerName, bookerPhone) => {
  try {
    const { data, error } = await supabase
      .from('cube45_reservations')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: '사용자'
      })
      .eq('booker_name', bookerName)
      .eq('booker_phone', bookerPhone)
      .eq('status', 'confirmed')
      .eq('is_deleted', false)  // 삭제되지 않은 예약만 대상
      .select()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('예약 취소 실패:', error)
    return { success: false, error }
  }
}

// 특정 예약번호로 취소하는 함수 - 기존 코드 아래에 추가
export const cancelReservationById = async (reservationId) => {
  try {
    const { data, error } = await supabase
      .from('cube45_reservations')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: '사용자'
      })
      .eq('id', reservationId)
      .eq('status', 'confirmed')
      .eq('is_deleted', false)
      .select()
      
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('예약 취소 실패:', error)
    return { success: false, error }
  }
}