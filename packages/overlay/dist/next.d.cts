export { S as ShipflowOverlayServerOptions, c as createNextHandler } from './createNextHandler-DAy_9x9m.cjs';
import 'next/server';

type NextConfig = Record<string, unknown>;
type ShipflowOverlayNextOptions = {
    enableInProduction?: boolean;
    reactGrabUrl?: string;
    logClipboardEndpoint?: string;
};
declare function withShipflowOverlay<T extends NextConfig = NextConfig>(config?: T, options?: ShipflowOverlayNextOptions): T & NextConfig;

export { type ShipflowOverlayNextOptions, withShipflowOverlay };
