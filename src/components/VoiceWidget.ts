const ELEVENLABS_SCRIPT_SRC = 'https://unpkg.com/@elevenlabs/convai-widget-embed'

export function initVoiceWidget(agentId: string): void {
  if (!agentId) return
  if (document.querySelector(`script[src="${ELEVENLABS_SCRIPT_SRC}"]`)) return

  const script = document.createElement('script')
  script.src = ELEVENLABS_SCRIPT_SRC
  script.async = true
  script.type = 'text/javascript'
  document.head.appendChild(script)

  const widget = document.querySelector('elevenlabs-convai') ?? document.createElement('elevenlabs-convai')
  widget.setAttribute('agent-id', agentId)
  if (!widget.parentElement) document.body.appendChild(widget)
}

export function openVoiceWidget(): void {
  const widget = document.querySelector('elevenlabs-convai') as HTMLElement & { open?: () => void }
  widget?.open?.()
}
