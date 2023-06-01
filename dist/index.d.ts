import { Page } from '@playwright/test';
export declare const initializeScreenwright: () => Promise<void>;
export declare const finalize: () => Promise<void>;
export declare const capture: (page: Page, key: string, title: string, parentKey?: string) => Promise<void>;
