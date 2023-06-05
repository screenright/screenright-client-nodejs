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
  diagramId: string
  screenshotItemAttributes: ScreenshotItemAttribute[]
  annotations: { [index: string]: Annotation }
}

type Annotation = {
  x: number
  y: number
  width: number
  height: number
  text: string
  paddingPixel: number
  direction: AnnotationDirection
  textColor: AnnotationTextColor
}

const result: Result = { diagramId: "", screenshotItemAttributes: [], annotations: {} }

let deploymentId: string | null = null
const deploymentToken: string = process.env.SCREENRIGHT_DEPLOYMENT_TOKEN || ''

const baseUrl = () => {
  return `${process.env.SCREENRIGHT_ENDPOINT}/client_api`
}

const errorOccurred = (message: string) => {
  console.error('[ScreenRight] Error occurred', message)
  deploymentId = null
}

export const initializeScreenwright = async (diagramId?: string) => {

  const _diagramId = diagramId || process.env.SCREENRIGHT_DIAGRAM_ID
  if (!_diagramId || !deploymentToken) {
    errorOccurred('Not set require environments.')
    return
  }

  result.diagramId = _diagramId

  try {
    const response = await fetch(`${baseUrl()}/diagrams/${result.diagramId}/deployments`, {
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

  await fetch(`${baseUrl()}/diagrams/${result.diagramId}/deployments/${deploymentId}/done_upload`, {
    method: 'PUT',
    body: JSON.stringify({ deployment_token: deploymentToken, blueprint: JSON.stringify({ screenshotItemAttributes: result.screenshotItemAttributes, annotations: result.annotations}) }),
    headers: { 'Content-Type': 'application/json' }
  })

  deploymentId = null
}

type AnnotationDirection = "top" | "right" | "bottom" | "left"
type AnnotationTextColor = "red" | "blue" | "black" | "white" | "yellow" | "green"

type CaptureOptions = {
  waitMilliseconds?: number
  clickLocatorSelector?: string | undefined
  annotationText?: string | undefined
  paddingPixel?: number | undefined
  annotationDirection?: AnnotationDirection | undefined
  annotationTextColor?: AnnotationTextColor | undefined
}

/**
 * Get screen capture.
 * @param {Page} page - Playwright's page object.
 * @param {string} key - Unique key. cannot contain slashes.
 * @param {string} title - Page title.
 * @param {string|null} [parentKey] - Parent page key. Creates a hierarchical structure.
 * @param {{ waitMilliseconds: number = 0, clickLocatorSelector: string, annotationText: string = "", paddingPixel: number = 4, annotationDirection: AnnotationDirection = "bottom", AnnotationTextColor = "red" }} [options] - Wait milliseconds before capture.
*/
export const capture = async (
  page: Page,
  key: string,
  title: string,
  parentKey?: string | undefined,
  options: CaptureOptions = {}
) => {
  if (deploymentId === null) {
    return
  }

  if (0 <= key.indexOf('/')) {
    errorOccurred('Capture argument[key] cannot contain slashes.')
    return
  }

  let {
    waitMilliseconds,
    clickLocatorSelector,
    annotationText,
    paddingPixel,
    annotationDirection,
    annotationTextColor
  } = options

  waitMilliseconds = waitMilliseconds || 0
  clickLocatorSelector = clickLocatorSelector || undefined
  annotationText = annotationText || ""
  paddingPixel = paddingPixel || 4
  annotationDirection = annotationDirection || "bottom"
  annotationTextColor = annotationTextColor || "red"

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

    const response = await fetch(`${baseUrl()}/diagrams/${result.diagramId}/deployments/${deploymentId}/screenshot`, {
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

  if (clickLocatorSelector !== undefined) {
    const locator = page.locator(clickLocatorSelector!)
    const bounding = (await locator.boundingBox())!
    const annotation = {
      x: bounding.x,
      y: bounding.y,
      width: bounding.width,
      height: bounding.height,
      text: annotationText,
      paddingPixel,
      direction: annotationDirection,
      textColor: annotationTextColor,
    }

    result.annotations[key] = annotation

    await locator.click()
  }
}
