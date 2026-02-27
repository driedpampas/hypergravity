export type RefreshTopBarFn = () => void;

export function refreshTopBar(refresh: RefreshTopBarFn): void {
    refresh();
}
