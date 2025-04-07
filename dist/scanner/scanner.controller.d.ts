import { ScannerService } from './scanner.service';
export declare class ScannerController {
    private readonly scannerService;
    constructor(scannerService: ScannerService);
    scanToken(body: any): Promise<any>;
}
