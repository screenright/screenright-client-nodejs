import { Page } from '@playwright/test';
export declare const initializeScreenwright: (diagramId?: string) => Promise<void>;
export declare const finalize: () => Promise<void>;
type AnnotationDirection = "top" | "right" | "bottom" | "left";
type AnnotationTextColor = "red" | "blue" | "black" | "white" | "yellow" | "green";
type CaptureOptions = {
    waitMilliseconds?: number;
    clickLocatorSelector?: string | undefined;
    annotationText?: string | undefined;
    paddingPixel?: number | undefined;
    annotationDirection?: AnnotationDirection | undefined;
    annotationTextColor?: AnnotationTextColor | undefined;
};
/**
 * Get screen capture.
 * @param {Page} page - Playwright's page object.
 * @param {string} key - Unique key. cannot contain slashes.
 * @param {string} title - Page title.
 * @param {string|null} [parentKey] - Parent page key. Creates a hierarchical structure.
 * @param {{ waitMilliseconds: number = 0, clickLocatorSelector: string, annotationText: string = "", paddingPixel: number = 4, annotationDirection: AnnotationDirection = "bottom", AnnotationTextColor = "red" }} [options] - Wait milliseconds before capture.
*/
export declare const capture: (page: Page, key: string, title: string, parentKey?: string | undefined, options?: CaptureOptions) => Promise<void>;
export {};
