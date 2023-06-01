import * as fs from 'fs'
import { Page } from '@playwright/test'
import fetch from 'node-fetch'
import process from 'node:process'
import FormData from 'form-data'
import { setTimeout } from 'timers/promises'

type ScreenshotItemAttribute = {
  key: string
  title: string
  url: string
  children: ScreenshotItemAttribute[]
}

type Result = {
  screenshotItemAttributes: ScreenshotItemAttribute[]
}

const result: Result = { screenshotItemAttributes: [] }

let deploymentId: string | null = null
const deploymentToken: string = process.env.SCREENRIGHT_DEPLOYMENT_TOKEN || ''

const baseUrl = () => {
  return `${process.env.SCREENRIGHT_ENDPOINT}/client_api`
}

const errorOccurred = (message: string) => {
  console.error('[ScreenRight] Error occurred', message)
  deploymentId = null
}

export const initializeScreenwright = async () => {

  const diagramId = process.env.SCREENRIGHT_DIAGRAM_ID
  if (!diagramId || !deploymentToken) {
    errorOccurred('Not set require environments.')
    return
  }

  try {
    const response = await fetch(`${baseUrl()}/diagrams/${diagramId}/deployments`, {
      method: 'POST',
      body: JSON.stringify({ deployment_token: deploymentToken }),
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      errorOccurred('Failed create deployment.')
    }

    const body = await response.text()
    const json = JSON.parse(body)
    deploymentId = json.id
  } catch(e: any) {
    errorOccurred(e.message)
  }
}

export const finalize = async () => {
  if (!deploymentId) {
    return
  }

  const diagramId = process.env.SCREENRIGHT_DIAGRAM_ID
  await fetch(`${baseUrl()}/diagrams/${diagramId}/deployments/${deploymentId}/done_upload`, {
    method: 'PUT',
    body: JSON.stringify({ deployment_token: deploymentToken, blueprint: JSON.stringify({ screenshotItemAttributes: result.screenshotItemAttributes}) }),
    headers: { 'Content-Type': 'application/json' }
  })

  deploymentId = null
}

/**
 * Get screen capture.
 * @param {Page} page - Playwright's page object.
 * @param {string} key - Unique key. cannot contain slashes.
 * @param {string} title - Page title.
 * @param {string|null} [parentKey] - Parent page key. Creates a hierarchical structure.
 * @param {{ waitMilliseconds: number }} [options] - Wait milliseconds before capture.
*/
export const capture = async (
  page: Page,
  key: string,
  title: string,
  parentKey?: string,
  options: { waitMilliseconds: number } = { waitMilliseconds: 0 },
) => {
  if (deploymentId === null) {
    return
  }

  if (0 <= key.indexOf('/')) {
    errorOccurred('Capture argument[key] cannot contain slashes.')
    return
  }

  const { waitMilliseconds } = options

  if (waitMilliseconds) {
    const nWaitMilliseconds = Number(waitMilliseconds)
    if (0 < waitMilliseconds) {
      await setTimeout(waitMilliseconds)
    }
  }

  const fileName = `${key}.jpg`
  try {
    const buffer = await page.screenshot({ fullPage: true, type: 'jpeg' })
    const formData = new FormData()

    formData.append('file', buffer, fileName)

    const diagramId = process.env.SCREENRIGHT_DIAGRAM_ID
    const response = await fetch(`${baseUrl()}/diagrams/${diagramId}/deployments/${deploymentId}/screenshot`, {
      method: 'POST',
      headers: {
        'X-File-Key': key,
        'X-Deployment-Token': deploymentToken,
      },
      body: formData
    })

    if (!response.ok) {
      errorOccurred('Faild screenshot upload')
      return
    }
  } catch(e: any) {
    errorOccurred(`capture: ${key}, ${e.message}`)
    return
  }

  const attribute: ScreenshotItemAttribute = {
    key,
    title,
    url: page.url(),
    children: [],
  }

  if (parentKey) {
    const searchParent = (attributes: ScreenshotItemAttribute[]) => {
      for (let i = 0; i < attributes.length; i++) {
        if (attributes[i].key === parentKey) {
          attributes[i].children.push(attribute)
          break
        }

        searchParent(attributes[i].children)
      }
    }

    searchParent(result.screenshotItemAttributes)
  } else {
    result.screenshotItemAttributes.push(attribute)
  }
}
