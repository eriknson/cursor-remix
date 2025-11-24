type ClipboardInterceptorOptions = {
    projectRoot?: string;
    highlightColor?: string;
    highlightStyleId?: string;
    logClipboardEndpoint?: string | null;
    reactGrabUrl?: string;
};
declare function registerClipboardInterceptor(options?: ClipboardInterceptorOptions): () => void;

type LoadOptions = {
    url?: string;
};
declare function loadReactGrabRuntime(options?: LoadOptions): Promise<void>;

export { type ClipboardInterceptorOptions, loadReactGrabRuntime, registerClipboardInterceptor };
