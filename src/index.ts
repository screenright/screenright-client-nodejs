import * as fs from 'fs'
import { Page } from '@playwright/test'
import fetch from 'node-fetch'
import process from 'node:process'
import FormData from 'form-data'

type ScreenshotItemAttribute = {
  key: string
  title: string
  src: string
  childrens: ScreenshotItemAttribute[]
}

type Result = {
  screenshotItemAttributes: ScreenshotItemAttribute[]
}

const tmpDir = 'screenright/tmp'

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

  fs.writeFileSync(
    `${tmpDir}/result.json`,
    JSON.stringify({
      screenshotItemAttributes: result.screenshotItemAttributes,
    })
  )

  const diagramId = process.env.SCREENRIGHT_DIAGRAM_ID
  await fetch(`${baseUrl()}/diagrams/${diagramId}/deployments/${deploymentId}/done_upload`, {
    method: 'PUT',
    body: JSON.stringify({ deployment_token: deploymentToken, blueprint: { screenshotItemAttributes: result.screenshotItemAttributes } }),
    headers: { 'Content-Type': 'application/json' }
  })

  deploymentId = null
}

export const capture = async (
  page: Page,
  key: string,
  title: string,
  parentKey?: string
) => {
  if (deploymentId === null) {
    return
  }

  const fileName = `${key}.png`
  const outPath = `${tmpDir}/${fileName}`
  try {
    fs.mkdirSync(tmpDir, { recursive: true })
    const buffer = new Uint8Array(await page.screenshot({ path: outPath, fullPage: true }))
    const formData = new FormData()

    formData.append('file', fs.createReadStream(outPath))

    const diagramId = process.env.SCREENRIGHT_DIAGRAM_ID
    const response = await fetch(`${baseUrl()}/diagrams/${diagramId}/deployments/${deploymentId}/screenshot`, {
      method: 'POST',
      headers: {
        'X-File-Key': key,
        'X-Deployment-Token': deploymentToken
      },
      body: formData
    })

    if (!response.ok) {
      errorOccurred('Faild screenshot upload')
      return
    }
  } catch(e: any) {
    errorOccurred(`capture: ${key}, ${outPath}, ${e.message}`)
    return
  }

  const attribute: ScreenshotItemAttribute = {
    key,
    title,
    src: outPath,
    childrens: [],
  }

  if (parentKey) {
    const searchParent = (attributes: ScreenshotItemAttribute[]) => {
      for (let i = 0; i < attributes.length; i++) {
        if (attributes[i].key === parentKey) {
          attributes[i].childrens.push(attribute)
          break
        }

        searchParent(attributes[i].childrens)
      }
    }

    searchParent(result.screenshotItemAttributes)
  } else {
    result.screenshotItemAttributes.push(attribute)
  }
}
