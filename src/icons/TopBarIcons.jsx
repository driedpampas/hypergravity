export function WideToggleIcon(props) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path class="hg-arrow-left" d="M9 5l-7 7 7 7V5z" />
            <path class="hg-arrow-right" d="M15 5v14l7-7-7-7z" />
        </svg>
    );
}

export function ExportIcon(props) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
        </svg>
    );
}
