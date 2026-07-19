import Image from 'next/image'

type BrandLogoProps = {
  /** Display size in CSS pixels (square). */
  size?: number
  className?: string
  priority?: boolean
}

/** Cropped Gemini Relay mark — use in chrome / empty states. */
export function BrandLogo(props: BrandLogoProps) {
  const { size = 28, className = '', priority = false } = props

  return <Image src="/logo.png" alt="Gemini Relay" width={size} height={size} priority={priority} className={`rounded-md object-cover ${className}`.trim()} />
}
