const ELEVENLABS_SCRIPT_SRC = 'https://elevenlabs.io/convai-widget/index.js'

export function initVoiceWidget(agentId: string): void {
  if (!agentId) return
  if (document.querySelector(`script[src="${ELEVENLABS_SCRIPT_SRC}"]`)) return

  const script = document.createElement('script')
  script.src = ELEVENLABS_SCRIPT_SRC
  script.async = true
  document.head.appendChild(script)

  const widget = document.createElement('elevenlabs-convai')
  widget.setAttribute('agent-id', agentId)
  document.body.appendChild(widget)
}

export function openVoiceWidget(): void {
  const widget = document.querySelector('elevenlabs-convai') as HTMLElement & { open?: () => void }
  widget?.open?.()
}
