'use client'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { useState } from 'react'
import { getReservationByNameAndPhone, cancelReservationById } from '@/api/confirm'

interface Reservation {
  id: string | number
  reservation_number: string
  room_name: string
  check_in_date: string
  check_out_date: string
  nights: number
  booker_name: string
  booker_phone: string
  booker_email: string
  is_different_guest?: boolean
  guest_name?: string
  guest_phone?: string
  guest_email?: string
  adult_count: number
  student_count: number
  child_count: number
  infant_count: number
  selected_options?: string[]
  customer_request?: string
  room_price: number
  additional_fee: number
  options_fee: number
  total_amount: number
  status: string
  payment_tid?: string  // 결제 TID 추가
}

export default function ConfirmPage() {
  const [bookerName, setBookerName] = useState('')
  const [bookerPhone, setBookerPhone] = useState('')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  
  // 전화번호 포맷팅 함수
  const formatPhoneDisplay = (phone: string): string => {
    const numbers = phone.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleSearch = async () => {
    if (!bookerName.trim() || !bookerPhone.trim()) {
      alert('이름과 전화번호를 모두 입력해주세요.')
      return
    }
    
    setIsLoading(true)
    const result = await getReservationByNameAndPhone(bookerName, bookerPhone)
    
    if (result.success) {
      setReservations(result.data || [])
      setShowResults(true)
      if ((result.data || []).length === 0) {
        alert('예약 정보를 찾을 수 없습니다.')
      }
    } else {
      alert('검색 중 오류가 발생했습니다.')
    }
    setIsLoading(false)
  }

  const handleCancel = async (reservationId: string | number) => {
    if (!bookerName.trim() || !bookerPhone.trim()) {
      alert('이름과 전화번호를 모두 입력해주세요.')
      return
    }

    // 해당 예약 찾기
    const reservation = reservations.find(r => r.id === reservationId)
    if (!reservation) {
      alert('예약 정보를 찾을 수 없습니다.')
      return
    }

    // TID 확인
    if (!reservation.payment_tid) {
      alert('결제 정보를 찾을 수 없습니다.\n관리자에게 문의해주세요.')
      return
    }

    if (confirm('정말 예약을 취소하시겠습니까?\n결제금액이 환불됩니다.')) {
      setIsLoading(true)
      
      try {
        // 1. PG 취소 API 호출
        const pgResponse = await fetch('https://cubecube45.mycafe24.com/pc/WelCancelAPI.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `tid=${reservation.payment_tid}&price=${reservation.total_amount}`
        })
        
        const pgResult = await pgResponse.json()

        if (!pgResult.success) {
          alert('환불 오류입니다. 고객센터에 문의해주세요.')
          setIsLoading(false)
          return
        }

        // 2. DB 취소
        const result = await cancelReservationById(reservationId)
        
        if (result.success) {
          alert('예약이 성공적으로 취소되었습니다.')
          handleSearch()  // 목록 새로고침
        } else {
          alert('결제 취소는 완료되었으나 예약 상태 업데이트에 실패했습니다.\n관리자에게 문의해주세요.')
        }
      } catch (error) {
        alert('취소 처리 중 오류가 발생했습니다.')
        console.error(error)
      }
      
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    window.history.back()
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <div className="pt-40">
        <div className="container mx-auto px-4 py-16 md:py-32">
          <div className="max-w-md mx-auto mb-20 md:mb-55">
            <div className="bg-white border border-gray-300 p-4 md:p-8">
              {/* 헤더 */}
              <div className="flex justify-between items-center mb-6 md:mb-8">
                <h2 className="text-base md:text-lg font-medium text-black">예약조회</h2>
                <button 
                  onClick={handleClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              {/* 입력 폼 */}
              <div className="space-y-4 md:space-y-6 mb-6 md:mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    예약자 이름 <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    placeholder="예: 홍길동"
                    value={bookerName}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z]/g, '');
                      setBookerName(value);
                    }}
                    className="w-full p-3 md:p-4 border border-gray-300 text-sm focus:border-teal-500 focus:outline-none text-black"
                  />
                  <p className="text-xs text-gray-500 mt-1">예약 시 입력한 이름을 정확히 입력해주세요</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    예약자 전화번호 <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    placeholder="예: 010-1234-5678"
                    value={formatPhoneDisplay(bookerPhone)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                      setBookerPhone(value);
                    }}
                    className="w-full p-3 md:p-4 border border-gray-300 text-sm focus:border-teal-500 focus:outline-none text-black"
                  />
                  <p className="text-xs text-gray-500 mt-1">하이픈(-) 없이 숫자만 입력해주세요</p>
                </div>
              </div>
              
              {/* 버튼 */}
              <div className="flex gap-3">
                <button 
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="flex-1 py-2 md:py-3 bg-teal-700 text-white font-medium text-sm disabled:bg-gray-400 hover:bg-teal-800 active:scale-95 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isLoading ? '검색중...' : '검색하기'}
                </button>
              </div>

              {/* 검색 결과 */}
              {showResults && reservations.length > 0 && (
                <div className="mt-6 md:mt-8 border-t pt-6 md:pt-8">
                  <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6 text-center text-gray-800">예약 정보</h3>
                  {reservations.map((reservation) => (
                    <div key={reservation.id} className="mb-4 md:mb-6 bg-white rounded-lg shadow-md border overflow-hidden relative">
                      {/* 취소됨 대각선 스탬프 */}
                      {reservation.status === 'cancelled' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                          <div className="transform rotate-12 bg-red-600 text-white px-16 md:px-24 py-4 md:py-6 text-2xl md:text-3xl font-bold shadow-2xl border-4 border-red-700 opacity-90">
                            취소됨
                          </div>
                        </div>
                      )}
                      
                      {/* 예약번호 헤더 */}
                      <div className={`${
                        reservation.status === 'cancelled' 
                          ? 'bg-gradient-to-r from-gray-400 to-gray-600' 
                          : 'bg-blue-600'
                      } text-white p-3 md:p-4`}>
                        <h4 className={`font-bold text-center text-base md:text-lg text-white ${
                          reservation.status === 'cancelled' ? 'opacity-50' : ''
                        }`}>
                          예약번호: {reservation.reservation_number}
                        </h4>
                        <p className={`text-center text-xs md:text-sm mt-1 ${
                          reservation.status === 'cancelled' 
                            ? 'text-gray-200 opacity-50' 
                            : 'text-blue-100'
                        }`}>
                          {reservation.room_name}
                        </p>
                      </div>
                        
                      {/* 예약 상세 정보 */}
                      <div className="p-4 md:p-6">
                        {/* 날짜 정보 */}
                        <div className="bg-blue-50 rounded-lg p-3 md:p-4 mb-3 md:mb-4 border-l-4 border-blue-400">
                          <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">체크인</p>
                              <p className="text-sm md:text-base font-semibold text-blue-700">{reservation.check_in_date}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">숙박</p>
                              <p className="text-sm md:text-base font-semibold text-blue-700">{reservation.nights}박</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">체크아웃</p>
                              <p className="text-sm md:text-base font-semibold text-blue-700">{reservation.check_out_date}</p>
                            </div>
                          </div>
                        </div>
              
                        {/* 예약자 정보 */}
                        <div className="mb-3 md:mb-4">
                          <h5 className="font-semibold text-gray-700 mb-2 text-sm">예약자 정보</h5>
                          <div className="bg-gray-50 border-l-4 border-blue-400 pl-3 md:pl-4 py-2 md:py-3 rounded-r-lg">
                            <p className="font-medium text-gray-800 text-sm md:text-base">{reservation.booker_name}</p>
                            <p className="text-gray-700 text-xs md:text-sm text-black">{formatPhoneDisplay(reservation.booker_phone)}</p>
                            <p className="text-gray-700 text-xs md:text-sm text-black">{reservation.booker_email}</p>
                          </div>
                        </div>
                        
                        {/* 투숙자 정보가 있을 때만 표시 */}
                        {reservation.is_different_guest && (
                          <div className="mb-3 md:mb-4">
                            <h5 className="font-semibold text-gray-700 mb-2 text-sm">투숙자 정보</h5>
                            <div className="bg-gray-50 border-l-4 border-gray-400 pl-3 md:pl-4 py-2 md:py-3 rounded-r-lg">
                              <p className="font-medium text-gray-800 text-sm md:text-base">{reservation.guest_name}</p>
                              <p className="text-gray-700 text-xs md:text-sm text-black">{formatPhoneDisplay(reservation.guest_phone || '')}</p>
                              <p className="text-gray-700 text-xs md:text-sm text-black">{reservation.guest_email}</p>
                            </div>
                          </div>
                        )}
                        
                        {/* 인원 정보 */}
                        <div className="mb-3 md:mb-4">
                          <h5 className="font-semibold text-gray-700 mb-2 text-sm">투숙인원</h5>
                          <div className="bg-gray-50 border-l-4 border-blue-400 pl-3 md:pl-4 py-2 md:py-3 rounded-r-lg">
                            <div className="space-y-1">
                              <p className="text-gray-700 text-xs md:text-sm text-black">성인: {reservation.adult_count}명</p>
                              {reservation.student_count > 0 && (
                                <p className="text-gray-700 text-xs md:text-sm text-black">학생: {reservation.student_count}명</p>
                              )}
                              {reservation.child_count > 0 && (
                                <p className="text-gray-700 text-xs md:text-sm text-black">아동: {reservation.child_count}명</p>
                              )}
                              {reservation.infant_count > 0 && (
                                <p className="text-gray-700 text-xs md:text-sm text-black">영유아: {reservation.infant_count}명</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* 추가옵션이 있을 때만 표시 */}
                        {reservation.selected_options && reservation.selected_options.length > 0 && (
                          <div className="mb-3 md:mb-4">
                            <h5 className="font-semibold text-gray-700 mb-2 text-sm">추가옵션</h5>
                            <div className="flex flex-wrap gap-1 md:gap-2">
                              {reservation.selected_options.map((option, idx) => {
                                const optionNames: { [key: string]: string } = {
                                  'bbq4': 'BBQ 숯&그릴 4인용',
                                  'bbq4plus': 'BBQ 숯&그릴 4인이상',
                                  'hotwater1': '미온수(11월~5월)',
                                  'hotwater2': '미온수(6월~10월)',
                                  'fireplace': '벽난로'
                                }
                                return (
                                  <span key={idx} className="bg-blue-100 text-blue-800 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm border border-blue-200">
                                    {optionNames[option] || option}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* 요청사항이 있을 때만 표시 */}
                        {reservation.customer_request && (
                          <div className="mb-3 md:mb-4">
                            <h5 className="font-semibold text-gray-700 mb-2 text-sm">요청사항</h5>
                            <div className="bg-gray-50 p-2 md:p-3 rounded-lg border border-gray-200">
                              <p className="text-gray-700 text-xs md:text-sm text-black">{reservation.customer_request}</p>
                            </div>
                          </div>
                        )}
                        
                        {/* 요금 정보 */}
                        <div className="bg-gray-50 rounded-lg p-3 md:p-4 border border-gray-200">
                          <h5 className="font-semibold text-gray-700 mb-2 md:mb-3 text-sm">결제 정보</h5>
                          <div className="space-y-1 md:space-y-2">
                            <div className="flex justify-between text-sm md:text-base">
                              <span className="text-gray-600">객실요금</span>
                              <span className="text-black">₩{reservation.room_price.toLocaleString()}</span>
                            </div>
                            {reservation.additional_fee > 0 && (
                              <div className="flex justify-between text-sm md:text-base">
                                <span className="text-gray-600">추가인원요금</span>
                                <span className="text-black">₩{reservation.additional_fee.toLocaleString()}</span>
                              </div>
                            )}
                            {reservation.options_fee > 0 && (
                              <div className="flex justify-between text-sm md:text-base">
                                <span className="text-gray-600">추가옵션요금</span>
                                <span className="text-black">₩{reservation.options_fee.toLocaleString()}</span>
                              </div>
                            )}
                            <hr className="border-gray-300" />
                            <div className="flex justify-between font-bold text-base md:text-lg">
                              <span className="text-gray-800">총 결제금액</span>
                              <span className="text-red-600">₩{reservation.total_amount.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* 취소 버튼 - 확정된 예약만 표시 */}
                        {reservation.status === 'confirmed' && (
                          <div className="mt-3 md:mt-4 text-center">
                            <button 
                              onClick={() => handleCancel(reservation.id)}
                              disabled={isLoading}
                              className="px-6 md:px-8 py-2 bg-red-600 text-white font-medium text-xs md:text-sm rounded disabled:bg-gray-400 hover:bg-red-700 active:scale-95 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed"
                            >
                              {isLoading ? '처리중...' : '예약 취소'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  )
}