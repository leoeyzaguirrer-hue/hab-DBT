import { redirect } from 'next/navigation'

export default function ClientDashboard() {
  redirect('/client/diary/today')
}
