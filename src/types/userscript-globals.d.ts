declare const GM_info:
    | {
          script?: {
              name?: string;
          };
      }
    | undefined;

declare function GM_getValue<T = unknown>(key: string, defaultValue?: T): T | Promise<T>;
declare function GM_setValue<T = unknown>(key: string, value: T): void | Promise<void>;
declare function GM_deleteValue(key: string): void | Promise<void>;
declare function GM_listValues(): string[] | Promise<string[]>;
declare function GM_addValueChangeListener(
    key: string,
    callback: (
        name: string,
        oldValue: unknown,
        newValue: unknown,
        remote: boolean
    ) => void
): number | string;
declare function GM_removeValueChangeListener(listenerId: number | string): void;
declare function GM_openInTab(url: string, options?: unknown): unknown;

declare global {
    interface Window {
        __HG_DEBUG_TOKEN_COUNTER__?: boolean;
    }
}

export {};
