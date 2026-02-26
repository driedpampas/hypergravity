import type { JSX } from 'preact';

type IconProps = JSX.SVGAttributes<SVGSVGElement>;

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
