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
const result = { screenshotItemAttributes: [] };
let deploymentId = null;
const deploymentToken = process.env.SCREENRIGHT_DEPLOYMENT_TOKEN || '';
const baseUrl = () => {
    return `${process.env.SCREENRIGHT_ENDPOINT}/client_api`;
};
const errorOccurred = (message) => {
    console.error('[ScreenRight] Error occurred', message);
    deploymentId = null;
};
export const initializeScreenwright = () => __awaiter(void 0, void 0, void 0, function* () {
    const diagramId = process.env.SCREENRIGHT_DIAGRAM_ID;
    if (!diagramId || !deploymentToken) {
        errorOccurred('Not set require environments.');
        return;
    }
    try {
        const response = yield fetch(`${baseUrl()}/diagrams/${diagramId}/deployments`, {
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
    const diagramId = process.env.SCREENRIGHT_DIAGRAM_ID;
    yield fetch(`${baseUrl()}/diagrams/${diagramId}/deployments/${deploymentId}/done_upload`, {
        method: 'PUT',
        body: JSON.stringify({ deployment_token: deploymentToken, blueprint: JSON.stringify({ screenshotItemAttributes: result.screenshotItemAttributes }) }),
        headers: { 'Content-Type': 'application/json' }
    });
    deploymentId = null;
});
export const capture = (page, key, title, parentKey) => __awaiter(void 0, void 0, void 0, function* () {
    if (deploymentId === null) {
        return;
    }
    const fileName = `${key}.jpg`;
    try {
        const buffer = yield page.screenshot({ fullPage: true, type: 'jpeg' });
        const formData = new FormData();
        formData.append('file', buffer, fileName);
        const diagramId = process.env.SCREENRIGHT_DIAGRAM_ID;
        const response = yield fetch(`${baseUrl()}/diagrams/${diagramId}/deployments/${deploymentId}/screenshot`, {
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
