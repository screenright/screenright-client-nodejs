var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as fs from 'fs';
import fetch from 'node-fetch';
const tmpDir = 'screenright/tmp';
const result = { screenshotItemAttributes: [] };
let deploymentId = null;
export const initializeScreenwright = () => __awaiter(void 0, void 0, void 0, function* () {
    const baseUrl = `${process.env.SCREENRIGHT_ENDPOINT}/client_api`;
    const diagramId = process.env.SCREENRIGHT_DIAGRAM_ID;
    const deploymentToken = process.env.SCREENRIGHT_DEVELOPMENT_TOKEN;
    const response = yield fetch(`${baseUrl}/diagrams/${diagramId}/deployments`, {
        method: 'POST',
        body: JSON.stringify({ deployment_token: deploymentToken }),
        headers: { 'Content-Type': 'application/json' }
    });
    const body = yield response.text();
    const json = JSON.parse(body);
    deploymentId = json.id;
    process.on('exit', (exitCode) => __awaiter(void 0, void 0, void 0, function* () {
        if (exitCode === 0) {
            fs.writeFileSync(`${tmpDir}/result.json`, JSON.stringify({
                screenshotItemAttributes: result.screenshotItemAttributes,
            }));
            yield fetch(`${baseUrl}/diagrams/${diagramId}/deployments/${deploymentId}/done_upload`, {
                method: 'PUT',
                body: JSON.stringify({ deployment_token: deploymentToken }),
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }));
});
initializeScreenwright();
export const capture = (page, key, title, parentKey) => __awaiter(void 0, void 0, void 0, function* () {
    if (deploymentId === null) {
        return;
    }
    fs.mkdirSync(tmpDir, { recursive: true });
    const path = `${tmpDir}/${key}.png`;
    yield page.screenshot({ path, fullPage: true });
    const attribute = {
        key,
        title,
        src: path,
        childrens: [],
    };
    if (parentKey) {
        const searchParent = (attributes) => {
            for (let i = 0; i < attributes.length; i++) {
                if (attributes[i].key === parentKey) {
                    attributes[i].childrens.push(attribute);
                    break;
                }
                searchParent(attributes[i].childrens);
            }
        };
        searchParent(result.screenshotItemAttributes);
    }
    else {
        result.screenshotItemAttributes.push(attribute);
    }
});
