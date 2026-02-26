declare global {
    const GM_info:
        | {
              script?: {
                  name?: string;
                  version?: string;
              };
          }
        | undefined;

    function GM_getValue<T = unknown>(key: string, defaultValue?: T): T | Promise<T>;
    function GM_setValue<T = unknown>(key: string, value: T): void | Promise<void>;
    function GM_deleteValue(key: string): void | Promise<void>;
    function GM_listValues(): string[] | Promise<string[]>;
    function GM_addValueChangeListener(
        key: string,
        callback: (name: string, oldValue: unknown, newValue: unknown, remote: boolean) => void
    ): number | string;
    function GM_removeValueChangeListener(listenerId: number | string): void;
    function GM_openInTab(url: string, options?: unknown): unknown;
}

export {};
