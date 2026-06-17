import { describe, it, expect, beforeEach, vi } from 'vitest'
import { initVoiceWidget, openVoiceWidget } from '../src/components/VoiceWidget'

describe('initVoiceWidget', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
  })

  it('does nothing when agentId is empty string', () => {
    initVoiceWidget('')
    expect(document.head.querySelector('script')).toBeNull()
    expect(document.body.querySelector('elevenlabs-convai')).toBeNull()
  })

  it('injects the ElevenLabs script into <head>', () => {
    initVoiceWidget('agent-abc')
    const script = document.head.querySelector('script') as HTMLScriptElement
    expect(script).not.toBeNull()
    expect(script.src).toContain('elevenlabs.io/convai-widget')
    expect(script.async).toBe(true)
  })

  it('appends <elevenlabs-convai> to <body> with correct agent-id', () => {
    initVoiceWidget('agent-abc')
    const widget = document.body.querySelector('elevenlabs-convai')
    expect(widget).not.toBeNull()
    expect(widget!.getAttribute('agent-id')).toBe('agent-abc')
  })

  it('does not inject a duplicate script on second call', () => {
    initVoiceWidget('agent-abc')
    initVoiceWidget('agent-abc')
    const scripts = document.head.querySelectorAll('script')
    expect(scripts.length).toBe(1)
  })
})

describe('openVoiceWidget', () => {
  it('calls open() on the elevenlabs-convai element when it exists', () => {
    document.body.innerHTML = '<elevenlabs-convai></elevenlabs-convai>'
    const widget = document.body.querySelector('elevenlabs-convai') as HTMLElement & { open?: () => void }
    widget.open = vi.fn()
    openVoiceWidget()
    expect(widget.open).toHaveBeenCalled()
  })

  it('does not throw when elevenlabs-convai is absent from the DOM', () => {
    document.body.innerHTML = ''
    expect(() => openVoiceWidget()).not.toThrow()
  })
})
