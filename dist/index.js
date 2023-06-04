var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import fetch from 'node-fetch';
import process from 'node:process';
import FormData from 'form-data';
import { setTimeout } from 'timers/promises';
const result = { diagramId: "", screenshotItemAttributes: [] };
let deploymentId = null;
const deploymentToken = process.env.SCREENRIGHT_DEPLOYMENT_TOKEN || '';
const baseUrl = () => {
    return `${process.env.SCREENRIGHT_ENDPOINT}/client_api`;
};
const errorOccurred = (message) => {
    console.error('[ScreenRight] Error occurred', message);
    deploymentId = null;
};
export const initializeScreenwright = (diagramId) => __awaiter(void 0, void 0, void 0, function* () {
    const _diagramId = process.env.SCREENRIGHT_DIAGRAM_ID;
    if (!_diagramId || !deploymentToken) {
        errorOccurred('Not set require environments.');
        return;
    }
    result.diagramId = _diagramId;
    try {
        const response = yield fetch(`${baseUrl()}/diagrams/${result.diagramId}/deployments`, {
            method: 'POST',
            body: JSON.stringify({ deployment_token: deploymentToken }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            errorOccurred('Failed create deployment.');
        }
        const body = yield response.text();
        const json = JSON.parse(body);
        deploymentId = json.id;
    }
    catch (e) {
        errorOccurred(e.message);
    }
});
export const finalize = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!deploymentId) {
        return;
    }
    yield fetch(`${baseUrl()}/diagrams/${result.diagramId}/deployments/${deploymentId}/done_upload`, {
        method: 'PUT',
        body: JSON.stringify({ deployment_token: deploymentToken, blueprint: JSON.stringify({ screenshotItemAttributes: result.screenshotItemAttributes }) }),
        headers: { 'Content-Type': 'application/json' }
    });
    deploymentId = null;
});
/**
 * Get screen capture.
 * @param {Page} page - Playwright's page object.
 * @param {string} key - Unique key. cannot contain slashes.
 * @param {string} title - Page title.
 * @param {string|null} [parentKey] - Parent page key. Creates a hierarchical structure.
 * @param {{ waitMilliseconds: number }} [options] - Wait milliseconds before capture.
*/
export const capture = (page, key, title, parentKey, options = { waitMilliseconds: 0 }) => __awaiter(void 0, void 0, void 0, function* () {
    if (deploymentId === null) {
        return;
    }
    if (0 <= key.indexOf('/')) {
        errorOccurred('Capture argument[key] cannot contain slashes.');
        return;
    }
    const { waitMilliseconds } = options;
    if (waitMilliseconds) {
        const nWaitMilliseconds = Number(waitMilliseconds);
        if (0 < waitMilliseconds) {
            yield setTimeout(waitMilliseconds);
        }
    }
    const fileName = `${key}.jpg`;
    try {
        const buffer = yield page.screenshot({ fullPage: true, type: 'jpeg' });
        const formData = new FormData();
        formData.append('file', buffer, fileName);
        const response = yield fetch(`${baseUrl()}/diagrams/${result.diagramId}/deployments/${deploymentId}/screenshot`, {
            method: 'POST',
            headers: {
                'X-File-Key': key,
                'X-Deployment-Token': deploymentToken,
            },
            body: formData
        });
        if (!response.ok) {
            errorOccurred('Faild screenshot upload');
            return;
        }
    }
    catch (e) {
        errorOccurred(`capture: ${key}, ${e.message}`);
        return;
    }
    const attribute = {
        key,
        title,
        url: page.url(),
        children: [],
    };
    if (parentKey) {
        const searchParent = (attributes) => {
            for (let i = 0; i < attributes.length; i++) {
                if (attributes[i].key === parentKey) {
                    attributes[i].children.push(attribute);
                    break;
                }
                searchParent(attributes[i].children);
            }
        };
        searchParent(result.screenshotItemAttributes);
    }
    else {
        result.screenshotItemAttributes.push(attribute);
    }
});
