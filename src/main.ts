import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import { getInitialLang, applyTranslations } from './i18n/i18n'
import { initNav } from './ui/nav'
import { initCalendly } from './ui/calendly'
import { initAnimations } from './ui/animations'
import { initVoiceWidget, openVoiceWidget } from './components/VoiceWidget'

const lang = getInitialLang()
applyTranslations(lang)
initNav(lang)
initCalendly()
initAnimations()
initVoiceWidget(import.meta.env.VITE_ELEVENLABS_AGENT_ID ?? '')

document.getElementById('voice-cta')?.addEventListener('click', () => {
  openVoiceWidget()
})
