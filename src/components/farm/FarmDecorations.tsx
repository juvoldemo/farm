import { memo } from 'react'

export const FarmDecorations = memo(function FarmDecorations() {
  return <div className="farm-decorations" aria-hidden="true">
    <span className="farm-path" />
    <span className="farm-fence farm-fence-back" />
    <span className="farm-fence farm-fence-front" />
    <span className="farm-bush farm-bush-left">✿</span>
    <span className="farm-bush farm-bush-right">✿</span>
    <span className="farm-stone">●</span>
    <span className="farm-crate">▦</span>
    <span className="farm-watering-can">🪣</span>
    <span className="farm-butterfly">🦋</span>
  </div>
})
