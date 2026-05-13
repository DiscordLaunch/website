const REACTION_PATTERN = /^(\S+)\s+(\d+)$/

export function incrementReactionText(text) {
  const match = String(text || '').trim().match(REACTION_PATTERN)
  if (!match) return text
  return `${match[1]} ${Number(match[2]) + 1}`
}

export function decrementReactionText(text) {
  const match = String(text || '').trim().match(REACTION_PATTERN)
  if (!match) return text
  return `${match[1]} ${Math.max(0, Number(match[2]) - 1)}`
}

export function setupReactionButtons(root = document) {
  root.querySelectorAll('.discord-reaction').forEach(reaction => {
    if (reaction.dataset.reactionReady === 'true') return
    reaction.dataset.reactionReady = 'true'
    reaction.dataset.reacted = reaction.dataset.reacted || 'false'
    reaction.setAttribute('role', 'button')
    reaction.setAttribute('tabindex', '0')
    reaction.setAttribute('aria-pressed', reaction.dataset.reacted)
    reaction.setAttribute('aria-label', `Add reaction ${reaction.textContent.trim()}`)
  })
}

export function handleReactionInteraction(event) {
  const reaction = event.target.closest?.('.discord-reaction')
  if (!reaction) return
  if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  const hasReacted = reaction.dataset.reacted === 'true'
  reaction.textContent = hasReacted
    ? decrementReactionText(reaction.textContent)
    : incrementReactionText(reaction.textContent)
  reaction.dataset.reacted = hasReacted ? 'false' : 'true'
  reaction.setAttribute('aria-pressed', reaction.dataset.reacted)
  reaction.setAttribute('aria-label', `${hasReacted ? 'Add' : 'Remove'} reaction ${reaction.textContent.trim()}`)
}
