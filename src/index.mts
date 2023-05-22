import * as fs from 'fs'
import { Page } from '@playwright/test'
import fetch from 'node-fetch'

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

export const initializeScreenwright = async () => {

  const baseUrl = `${process.env.SCREENRIGHT_ENDPOINT}/client_api`
  const diagramId = process.env.SCREENRIGHT_DIAGRAM_ID
  const deploymentToken = process.env.SCREENRIGHT_DEVELOPMENT_TOKEN
  const response = await fetch(`${baseUrl}/diagrams/${diagramId}/deployments`, {
    method: 'POST',
    body: JSON.stringify({ deployment_token: deploymentToken }),
    headers: { 'Content-Type': 'application/json' }
  })

  const body = await response.text()
  const json = JSON.parse(body)
  deploymentId = json.id

  process.on('exit', async (exitCode) => {
    if (exitCode === 0) {
      fs.writeFileSync(
        `${tmpDir}/result.json`,
        JSON.stringify({
          screenshotItemAttributes: result.screenshotItemAttributes,
        })
      )

      await fetch(`${baseUrl}/diagrams/${diagramId}/deployments/${deploymentId}/done_upload`, {
        method: 'PUT',
        body: JSON.stringify({ deployment_token: deploymentToken }),
        headers: { 'Content-Type': 'application/json' }
      })

    }
  })
}

initializeScreenwright()
export const capture = async (
  page: Page,
  key: string,
  title: string,
  parentKey?: string
) => {
  if (deploymentId === null) {
    return
  }

  fs.mkdirSync(tmpDir, { recursive: true })
  const path = `${tmpDir}/${key}.png`
  await page.screenshot({ path, fullPage: true })

  const attribute: ScreenshotItemAttribute = {
    key,
    title,
    src: path,
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
