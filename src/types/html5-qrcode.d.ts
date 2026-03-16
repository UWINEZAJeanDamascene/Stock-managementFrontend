declare module 'html5-qrcode' {
  export class Html5Qrcode {
    constructor(elementIdOrConfig: string | any);
    start(cameraIdOrConfig: any, config?: any, qrCodeSuccessCallback?: (decodedText: string, decodedResult?: any) => void, qrCodeErrorCallback?: (errorMessage: string) => void): Promise<void>;
    stop(): Promise<void>;
    clear(): void;
  }
  export { Html5Qrcode };
}
