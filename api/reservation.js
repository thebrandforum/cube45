import { supabase } from '@/lib/supabase'

// 예약 데이터 저장
export const saveReservation = async (reservationData) => {
  try {
    console.log('저장할 데이터:', reservationData)
    
    const { data, error } = await supabase
      .from('cube45_reservations')
      .insert([{
        reservation_number: reservationData.reservationNumber,
        room_id: reservationData.roomId,
        room_name: reservationData.roomName,
        check_in_date: reservationData.checkInDate,
        check_out_date: reservationData.checkOutDate,
        nights: reservationData.nights,
        booker_name: reservationData.bookerName,
        booker_email: reservationData.bookerEmail,
        booker_phone: reservationData.bookerPhone,
        is_different_guest: reservationData.isDifferentGuest,
        guest_name: reservationData.guestName,
        guest_email: reservationData.guestEmail,
        guest_phone: reservationData.guestPhone,
        adult_count: reservationData.adultCount,
        student_count: reservationData.studentCount,
        child_count: reservationData.childCount,
        infant_count: reservationData.infantCount,
        room_price: reservationData.roomPrice,
        additional_fee: reservationData.additionalFee,
        options_fee: reservationData.optionsFee,
        total_amount: reservationData.totalAmount,
        selected_options: reservationData.selectedOptions,
        customer_request: reservationData.customerRequest,
        status: reservationData.status || 'pending'  // status 필드 추가
      }])
      .select()

    console.log('Supabase 저장 결과:', { data, error })
    
    if (error) {
      console.error('Supabase 저장 오류 상세:', error)
      throw error
    }
    
    return { success: true, data }
  } catch (error) {
    console.error('예약 저장 실패:', error)
    return { success: false, error }
  }
}

// 예약 조회
export const getReservation = async (reservationNumber) => {
  try {
    const { data, error } = await supabase
      .from('cube45_reservations')
      .select('*')
      .eq('reservation_number', reservationNumber)
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('예약 조회 실패:', error)
    return { success: false, error }
  }
}

// 예약 취소
export const cancelReservation = async (reservationNumber) => {
  try {
    const { data, error } = await supabase
      .from('cube45_reservations')
      .update({ status: 'cancelled' })
      .eq('reservation_number', reservationNumber)
      .select()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('예약 취소 실패:', error)
    return { success: false, error }
  }
}

// 특정 날짜 범위에 예약된 객실 목록 조회
export const getBookedRooms = async (checkInDate, checkOutDate) => {
  try {
    console.log('날짜 확인:', checkInDate, checkOutDate)
    
    const { data, error } = await supabase
      .from('cube45_reservations')
      .select('room_id')
      .eq('status', 'confirmed')  // 확정된 예약만
      .eq('is_deleted', false)    // 삭제되지 않은 것만
      .lt('check_in_date', checkOutDate)
      .gt('check_out_date', checkInDate)
    console.log('Supabase 결과:', { data, error })
    
    if (error) {
      console.error('Supabase 오류 상세:', error)
      throw error
    }
    
    return { success: true, data: data ? data.map(item => item.room_id) : [] }
  } catch (error) {
    console.error('예약된 객실 조회 실패:', error)
    return { success: true, data: [] }
  }
}