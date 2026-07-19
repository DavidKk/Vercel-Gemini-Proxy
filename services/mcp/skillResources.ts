import { readFile } from 'node:fs/promises'
import path from 'node:path'

/** URIs must end with `.md` so Cursor treats them as skill prompts. */
export const SKILL_RESOURCE_URI = 'skill://gemini-relay/gemini-relay-skill.md'
const SKILL_RESOURCE_URI_LEGACY = 'skill://gemini-relay/gemini-relay-skill'
const SKILL_RESOURCE_NAME = 'gemini-relay-skill.md'
const SKILL_RESOURCE_DESCRIPTION = 'Agent skill for Gemini Relay: deploy/use REST, proxy-only MCP install, list-models smoke test.'
const SKILL_DOC_PATH = path.join(process.cwd(), 'public/skills/gemini-relay-skill.md')

/** Public static URL path for the same markdown (dialog Copy / Open). */
export const SKILL_PUBLIC_PATH = '/skills/gemini-relay-skill.md'

let cachedSkillDoc: string | null = null

async function loadSkillDocMarkdown(): Promise<string> {
  if (cachedSkillDoc !== null) {
    return cachedSkillDoc
  }
  cachedSkillDoc = await readFile(SKILL_DOC_PATH, 'utf8')
  return cachedSkillDoc
}

export type McpManifestResource = {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

/** MCP resources provider — list/read skill markdown for Cursor. */
export function createMcpSkillResourceProvider() {
  return {
    listResources(): McpManifestResource[] {
      return [
        {
          uri: SKILL_RESOURCE_URI,
          name: SKILL_RESOURCE_NAME,
          description: SKILL_RESOURCE_DESCRIPTION,
          mimeType: 'text/markdown',
        },
      ]
    },
    async readResource(uri: string): Promise<{ mimeType: string; text: string } | null> {
      const normalizedUri = uri.trim()
      if (normalizedUri !== SKILL_RESOURCE_URI && normalizedUri !== SKILL_RESOURCE_URI_LEGACY) {
        return null
      }
      const markdown = await loadSkillDocMarkdown()
      return { mimeType: 'text/markdown', text: markdown }
    },
  }
}
