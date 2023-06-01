import { Page } from '@playwright/test';
export declare const initializeScreenwright: () => Promise<void>;
export declare const finalize: () => Promise<void>;
/**
 * Get screen capture.
 * @param {Page} page - Playwright's page object.
 * @param {string} key - Unique key. cannot contain slashes.
 * @param {string} title - Page title.
 * @param {string|null} [parentKey] - Parent page key. Creates a hierarchical structure.
 * @param {{ waitMilliseconds: number }} [options] - Wait milliseconds before capture.
*/
export declare const capture: (page: Page, key: string, title: string, parentKey?: string, options?: {
    waitMilliseconds: number;
}) => Promise<void>;
