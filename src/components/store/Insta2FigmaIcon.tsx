import Image from 'next/image'
import { I2F_ICON_PATH } from '@/lib/insta2figma/constants'
import { cn } from '@/utils/cn'

type Insta2FigmaIconProps = {
  size?: number
  className?: string
}

export default function Insta2FigmaIcon({ size = 27, className }: Insta2FigmaIconProps) {
  return (
    <Image
      src={I2F_ICON_PATH}
      alt="Insta2Figma"
      width={size}
      height={size}
      unoptimized
      priority={size >= 27}
      className={cn('shrink-0 rounded-lg object-cover', className)}
    />
  )
}
