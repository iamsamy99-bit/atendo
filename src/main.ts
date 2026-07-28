import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/premium.css'
import { getInitialLang, applyTranslations } from './i18n/i18n'
import { initNav } from './ui/nav'
import { initCalendly } from './ui/calendly'
import { initAnimations } from './ui/animations'
import { initCrisp } from './ui/crisp'
import { initLeadEvents } from './ui/leadEvents'
import { initChatSim } from './ui/chatSim'
import { initVoiceConvo } from './ui/voiceConvo'
import { initSpotlight } from './ui/spotlight'
import { initCallback } from './ui/callback'

const lang = getInitialLang()
applyTranslations(lang)
initNav(lang)
initLeadEvents()
initCalendly()
initAnimations()
initCrisp(lang)
initChatSim()
initVoiceConvo()
initSpotlight()
initCallback()
