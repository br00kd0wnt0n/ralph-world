import { redirect } from 'next/navigation'

// The subscribe flow lives in the Nav's SubscribeModal.
// This page exists to catch direct links and footer "Sign up" clicks.
// We redirect home with a query flag so a future client can auto-open the modal.
export default function SubscribePage() {
  redirect('/?subscribe=1')
}
