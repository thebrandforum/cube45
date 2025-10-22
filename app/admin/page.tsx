import { redirect } from 'next/navigation'

export default function AdminPage() {
  // /admin 접속 시 자동으로 /admin/dashboard로 리다이렉트
  redirect('/admin/dashboard')
}