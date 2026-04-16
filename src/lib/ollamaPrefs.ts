const LS_MODEL = 'quizscan:ollama-model'
const LS_ON = 'quizscan:ollama-enabled'
const LS_REFINE = 'quizscan:ollama-refine-enabled'
const LS_AI_STRUCTURE = 'quizscan:ollama-ai-structure-enabled'
const LS_VISION_MODEL = 'quizscan:ollama-vision-model'
const LS_VISION_ON = 'quizscan:ollama-vision-enabled'

export function readOllamaPrefs(): {
  model: string
  enabled: boolean
  refineEnabled: boolean
  aiStructureEnabled: boolean
} {
  if (typeof localStorage === 'undefined') {
    return { model: '', enabled: true, refineEnabled: true, aiStructureEnabled: true }
  }
  return {
    model: localStorage.getItem(LS_MODEL) || '',
    enabled: localStorage.getItem(LS_ON) !== '0',
    refineEnabled: localStorage.getItem(LS_REFINE) !== '0',
    aiStructureEnabled: localStorage.getItem(LS_AI_STRUCTURE) !== '0',
  }
}

export function writeOllamaPrefs(
  model: string,
  enabled: boolean,
  refineEnabled: boolean,
  aiStructureEnabled: boolean
) {
  localStorage.setItem(LS_MODEL, model)
  localStorage.setItem(LS_ON, enabled ? '1' : '0')
  localStorage.setItem(LS_REFINE, refineEnabled ? '1' : '0')
  localStorage.setItem(LS_AI_STRUCTURE, aiStructureEnabled ? '1' : '0')
}

export function readVisionPrefs(): { visionModel: string; visionEnabled: boolean } {
  if (typeof localStorage === 'undefined') return { visionModel: '', visionEnabled: true }
  return {
    visionModel: localStorage.getItem(LS_VISION_MODEL) || '',
    visionEnabled: localStorage.getItem(LS_VISION_ON) !== '0',
  }
}

export function writeVisionPrefs(visionModel: string, visionEnabled: boolean) {
  localStorage.setItem(LS_VISION_MODEL, visionModel)
  localStorage.setItem(LS_VISION_ON, visionEnabled ? '1' : '0')
}
