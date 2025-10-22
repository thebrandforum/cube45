'use client'
import { useState, useEffect } from 'react'

export default function PayTestPage() {
  const [reservationNumber, setReservationNumber] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  
  // 클라이언트 사이드에서만 예약번호 생성
  useEffect(() => {
    setReservationNumber(`TEST${Date.now()}`)
    setIsLoading(false)
  }, [])
  
  // 테스트용 고정값
  const testData = {
    price: 100,
    roomName: '테스트 객실',
    checkIn: '2025-01-20',
    checkOut: '2025-01-21',
    buyername: '테스트',
    buyertel: '01011111111',
    buyeremail: 'test@naver.com'
  }
  
  // 모바일 결제 테스트
  const handleMobilePayment = () => {
    if (!reservationNumber) return
    
    const currentDomain = window.location.origin
    
    const pgUrl = `https://cubecube45.mycafe24.com/mobile/WelPayMoRequest.php?` +
      `auto=true&` +
      `returnDomain=${encodeURIComponent(currentDomain)}&` +
      `reservationNumber=${reservationNumber}&` +
      `price=${testData.price}&` +
      `buyername=${encodeURIComponent(testData.buyername)}&` +
      `buyertel=${testData.buyertel}&` +
      `buyeremail=${testData.buyeremail}&` +
      `roomName=${encodeURIComponent(testData.roomName)}&` +
      `checkIn=${testData.checkIn}&` +
      `checkOut=${testData.checkOut}`
    
    console.log('모바일 결제 URL:', pgUrl)
    window.location.href = pgUrl
  }
  
  // PC 결제 테스트
  const handlePCPayment = () => {
    if (!reservationNumber) return
    
    const currentDomain = window.location.origin
    
    const pgUrl = `https://cubecube45.mycafe24.com/pc/WelStdPayRequest.php?` +
      `auto=true&` +
      `returnDomain=${encodeURIComponent(currentDomain)}&` +
      `reservationNumber=${reservationNumber}&` +
      `price=${testData.price}&` +
      `buyername=${encodeURIComponent(testData.buyername)}&` +
      `buyertel=${testData.buyertel}&` +
      `buyeremail=${testData.buyeremail}&` +
      `roomName=${encodeURIComponent(testData.roomName)}&` +
      `checkIn=${testData.checkIn}&` +
      `checkOut=${testData.checkOut}`
    
    console.log('PC 결제 URL:', pgUrl)
    window.location.href = pgUrl
  }
  
  // 자동 디바이스 감지 결제
  const handleAutoPayment = () => {
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    
    if (isMobileDevice) {
      handleMobilePayment()
    } else {
      handlePCPayment()
    }
  }
  
  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">테스트 페이지 로딩 중...</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">결제 테스트 페이지</h1>
        
        {/* 테스트 정보 표시 */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h2 className="text-lg font-semibold mb-3">테스트 정보</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">예약번호:</span>
              <span className="font-medium">{reservationNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">객실:</span>
              <span className="font-medium">{testData.roomName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">가격:</span>
              <span className="font-medium text-red-500">₩{testData.price}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">예약자:</span>
              <span className="font-medium">{testData.buyername}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">연락처:</span>
              <span className="font-medium">{testData.buyertel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">이메일:</span>
              <span className="font-medium">{testData.buyeremail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">체크인:</span>
              <span className="font-medium">{testData.checkIn}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">체크아웃:</span>
              <span className="font-medium">{testData.checkOut}</span>
            </div>
          </div>
        </div>
        
        {/* 결제 버튼들 */}
        <div className="space-y-3">
          <button
            onClick={handleAutoPayment}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            자동 감지 결제 (권장)
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={handleMobilePayment}
              className="flex-1 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              모바일 결제
            </button>
            
            <button
              onClick={handlePCPayment}
              className="flex-1 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              PC 결제
            </button>
          </div>
        </div>
        
        {/* 현재 디바이스 정보 */}
        <div className="mt-6 p-3 bg-yellow-50 rounded text-sm">
          <p className="text-yellow-800">
            <strong>현재 디바이스:</strong> {
              /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) 
                ? '모바일' 
                : 'PC'
            }
          </p>
          <p className="text-yellow-700 mt-1 text-xs">
            User Agent: {navigator.userAgent}
          </p>
        </div>
        
        {/* 주의사항 */}
        <div className="mt-6 p-3 bg-red-50 rounded">
          <p className="text-red-800 text-sm font-semibold">⚠️ 주의사항</p>
          <ul className="text-red-700 text-xs mt-2 space-y-1">
            <li>• 이것은 테스트 페이지입니다</li>
            <li>• 실제 결제가 진행될 수 있으니 주의하세요</li>
            <li>• 테스트 금액: 100원</li>
            <li>• 결제 완료 후 /reservation으로 리다이렉트됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  )
}