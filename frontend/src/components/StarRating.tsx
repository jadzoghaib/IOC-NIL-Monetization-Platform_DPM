import { Star } from 'lucide-react'

interface Props {
  stars: number          // 0 - 5, can be half
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showNumber?: boolean
}

const SIZE_PX: Record<string, number> = { xs: 10, sm: 12, md: 14, lg: 18 }

export default function StarRating({ stars, size = 'sm', showNumber = false }: Props) {
  const full  = Math.floor(stars)
  const half  = stars - full >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  const px    = SIZE_PX[size] ?? 12

  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} size={px} fill="#FFD700" color="#FFD700" />
      ))}
      {half && <Star size={px} fill="#FFD700" color="#FFD700" style={{ opacity: 0.55 }} />}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} size={px} fill="none" color="currentColor" style={{ opacity: 0.18 }} />
      ))}
      {showNumber && (
        <span className="text-white/40 ml-1" style={{ fontSize: px }}>{stars.toFixed(1)}</span>
      )}
    </span>
  )
}
