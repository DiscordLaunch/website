import { isKnownAppPath, renderNotFoundPage } from './routeGuard.js'

if (!isKnownAppPath()) {
  renderNotFoundPage()
} else {
  await import('./rawBridge.js')
  const { handleReactionInteraction, setupReactionButtons } = await import('./reactions.js')

  setupReactionButtons()
  document.addEventListener('click', handleReactionInteraction)
  document.addEventListener('keydown', handleReactionInteraction)

  if (window.location.pathname.startsWith('/editor')) {
    await import('./visualEditor.css')
    const { ensureEditorAccess } = await import('./editorAuth.js')

    if (await ensureEditorAccess()) {
      await import('./visualEditor.js')
    }
  }
}
