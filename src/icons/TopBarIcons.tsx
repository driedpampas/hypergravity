import type { SVGAttributes } from 'preact';

type IconProps = SVGAttributes<SVGSVGElement>;

export function ExportIcon(props: IconProps) {
    return (
        <svg
            viewBox="0 -960 960 960"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
            aria-hidden="true"
        >
            <title>Export icon</title>
            <path d="M160-80v-80h640v80H160Zm320-160L200-600h160v-280h240v280h160L480-240Z" />
        </svg>
    );
}

export function ExpandIcon(props: IconProps) {
    return (
        <svg
            viewBox="0 -960 960 960"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
            aria-hidden="true"
        >
            <title>Expand icon</title>
            <path d="M200-200v-240h66.67v173.33H440V-200H200Zm493.33-320v-173.33H520V-760h240v240h-66.67Z" />
        </svg>
    );
}

export function CollapseIcon(props: IconProps) {
    return (
        <svg
            viewBox="0 -960 960 960"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
            aria-hidden="true"
        >
            <title>Collapse icon</title>
            <path d="M440-440v240h-66.67v-173.33H200V-440h240Zm146.67-320v173.33H760V-520H520v-240h66.67Z" />
        </svg>
    );
}

export function EyeIcon(props: IconProps) {
    return (
        <svg
            viewBox="0 -960 960 960"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
            aria-hidden="true"
        >
            <title>Eye icon</title>
            <path d="M607.5-372.5Q660-425 660-500t-52.5-127.5Q555-680 480-680t-127.5 52.5Q300-575 300-500t52.5 127.5Q405-320 480-320t127.5-52.5Zm-204-51Q372-455 372-500t31.5-76.5Q435-608 480-608t76.5 31.5Q588-545 588-500t-31.5 76.5Q525-392 480-392t-76.5-31.5ZM214-281.5Q94-363 40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200q-146 0-266-81.5ZM480-500Zm207.5 160.5Q782-399 832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280q113 0 207.5-59.5Z" />
        </svg>
    );
}

export function EyeOffIcon(props: IconProps) {
    return (
        <svg
            viewBox="0 -960 960 960"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
            aria-hidden="true"
        >
            <title>Eye off icon</title>
            <path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z" />
        </svg>
    );
}

export function ClipboardExportIcon(props: IconProps) {
    return (
        <svg
            viewBox="0 -960 960 960"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
            aria-hidden="true"
        >
            <title>Clipboard export icon</title>
            <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h167q11-35 43-57.5t70-22.5q40 0 71.5 22.5T594-840h166q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560h-80v120H280v-120h-80v560Zm308.5-571.5Q520-783 520-800t-11.5-28.5Q497-840 480-840t-28.5 11.5Q440-817 440-800t11.5 28.5Q463-760 480-760t28.5-11.5Z" />
        </svg>
    );
}

export function TextSnippetIcon(props: IconProps) {
    return (
        <svg
            viewBox="0 -960 960 960"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
            aria-hidden="true"
        >
            <title>Text snippet icon</title>
            <path d="M200-200h560v-367L567-760H200v560Zm0 80q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h400l240 240v400q0 33-23.5 56.5T760-120H200Zm80-160h400v-80H280v80Zm0-160h400v-80H280v80Zm0-160h280v-80H280v80Zm-80 400v-560 560Z" />
        </svg>
    );
}

export function PictureAsPdfIcon(props: IconProps) {
    return (
        <svg
            viewBox="0 -960 960 960"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
            aria-hidden="true"
        >
            <title>PDF export icon</title>
            <path d="M360-460h40v-80h40q17 0 28.5-11.5T480-580v-40q0-17-11.5-28.5T440-660h-80v200Zm40-120v-40h40v40h-40Zm120 120h80q17 0 28.5-11.5T640-500v-120q0-17-11.5-28.5T600-660h-80v200Zm40-40v-120h40v120h-40Zm120 40h40v-80h40v-40h-40v-40h40v-40h-80v200ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z" />
        </svg>
    );
}

export function DocsIcon(props: IconProps) {
    return (
        <svg
            viewBox="0 -960 960 960"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
            aria-hidden="true"
        >
            <title>Docs export icon</title>
            <path d="M320-440h320v-80H320v80Zm0 120h320v-80H320v80Zm0 120h200v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z" />
        </svg>
    );
}

export function MarkdownIcon(props: IconProps) {
    return (
        <svg
            viewBox="0 -960 960 960"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
            aria-hidden="true"
        >
            <title>Markdown export icon</title>
            <path d="m640-360 120-120-42-43-48 48v-125h-60v125l-48-48-42 43 120 120ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm0 0v-480 480Zm60-120h60v-180h40v120h60v-120h40v180h60v-200q0-17-11.5-28.5T440-600H260q-17 0-28.5 11.5T220-560v200Z" />
        </svg>
    );
}

export function HtmlIcon(props: IconProps) {
    return (
        <svg
            viewBox="0 -960 960 960"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
            aria-hidden="true"
        >
            <title>HTML export icon</title>
            <path d="M0-360v-240h60v80h80v-80h60v240h-60v-100H60v100H0Zm310 0v-180h-70v-60h200v60h-70v180h-60Zm170 0v-200q0-17 11.5-28.5T520-600h180q17 0 28.5 11.5T740-560v200h-60v-180h-40v140h-60v-140h-40v180h-60Zm320 0v-240h60v180h100v60H800Z" />
        </svg>
    );
}

export function PrintMenuIcon(props: IconProps) {
    return (
        <svg
            viewBox="0 -960 960 960"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
            aria-hidden="true"
        >
            <title>Print export icon</title>
            <path d="M640-640v-120H320v120h-80v-200h480v200h-80Zm-480 80h640-640Zm560 100q17 0 28.5-11.5T760-500q0-17-11.5-28.5T720-540q-17 0-28.5 11.5T680-500q0 17 11.5 28.5T720-460Zm-80 260v-160H320v160h320Zm80 80H240v-160H80v-240q0-51 35-85.5t85-34.5h560q51 0 85.5 34.5T880-520v240H720v160Zm80-240v-160q0-17-11.5-28.5T760-560H200q-17 0-28.5 11.5T160-520v160h80v-80h480v80h80Z" />
        </svg>
    );
}
