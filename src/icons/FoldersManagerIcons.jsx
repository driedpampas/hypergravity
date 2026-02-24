import { BackArrowIcon } from './CommonIcons';

export function FolderBackIcon(props) {
    return <BackArrowIcon {...props} />;
}

export function FolderEmptyIcon(props) {
    return (
        <svg viewBox="0 -960 960 960" fill="currentColor" {...props}>
            <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z" />
        </svg>
    );
}

export function FolderAddIcon(props) {
    return (
        <svg viewBox="0 -960 960 960" fill="currentColor" {...props}>
            <path d="M560-320h80v-80h80v-80h-80v-80h-80v80h-80v80h80v80ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z" />
        </svg>
    );
}

export function FolderFilledIcon(props) {
    return (
        <svg viewBox="0 -960 960 960" fill="currentColor" {...props}>
            <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Z" />
        </svg>
    );
}

export function FolderDeleteIcon(props) {
    return (
        <svg viewBox="0 -960 960 960" fill="currentColor" {...props}>
            <path d="M580-280h80q25 0 42.5-17.5T720-340v-160h40v-60H660v-40h-80v40H480v60h40v160q0 25 17.5 42.5T580-280Zm0-220h80v160h-80v-160ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z" />
        </svg>
    );
}
