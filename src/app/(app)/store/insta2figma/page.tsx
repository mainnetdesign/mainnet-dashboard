import { redirect } from 'next/navigation'
import { I2F_BASE } from '@/lib/insta2figma/constants'

export default function Insta2FigmaIndex() {
  redirect(`${I2F_BASE}/overview`)
}
