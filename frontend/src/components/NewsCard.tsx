import { motion } from 'framer-motion'
import type { NewsArticle } from '../lib/api'
import { timeAgo } from '../lib/utils'

interface Props {
  article: NewsArticle
  index?: number
}

export default function NewsCard({ article, index = 0 }: Props) {
  return (
    <motion.a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      whileHover={{ x: 4, transition: { duration: 0.15 } }}
      className="block rounded-xl p-4 border border-white/6 bg-white/[0.02] hover:bg-white/[0.04] hover:border-gold/30 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-gold transition-colors">
            {article.title}
          </h4>
          {article.summary && (
            <p className="text-xs text-white/45 mt-1.5 leading-relaxed line-clamp-2">
              {article.summary}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {article.source && (
              <span className="text-xs text-white/30 font-medium">{article.source}</span>
            )}
            {article.date && (
              <span className="text-xs text-white/20">{timeAgo(article.date)}</span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-white/20 group-hover:text-gold/60 transition-colors text-lg">
          →
        </div>
      </div>
    </motion.a>
  )
}

export function NewsFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl p-4 border border-white/6 animate-pulse">
          <div className="h-4 bg-white/8 rounded w-3/4 mb-2" />
          <div className="h-3 bg-white/5 rounded w-full mb-1" />
          <div className="h-3 bg-white/5 rounded w-2/3" />
        </div>
      ))}
    </div>
  )
}
