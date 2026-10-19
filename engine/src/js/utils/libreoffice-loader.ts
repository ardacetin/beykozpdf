/**
 * LibreOffice WASM Converter Wrapper
 *
 * Uses @matbee/libreoffice-converter package for document conversion.
 * Handles progress tracking and provides simpler API.
 */

import { WorkerBrowserConverter } from '@matbee/libreoffice-converter/browser';
import type { InputFormat } from '@matbee/libreoffice-converter/browser';

const LIBREOFFICE_LOCAL_PATH = import.meta.env.BASE_URL + 'libreoffice-wasm/';
const LIBREOFFICE_SCRIPT_EXTENSION =
  import.meta.env.VITE_LIBREOFFICE_SCRIPT_EXTENSION || 'js';
const LIBREOFFICE_BINARY_EXTENSION =
  import.meta.env.VITE_LIBREOFFICE_BINARY_EXTENSION || 'gz';

export interface LoadProgress {
  phase: 'loading' | 'initializing' | 'converting' | 'complete' | 'ready';
  percent: number;
  message: string;
}

export type ProgressCallback = (progress: LoadProgress) => void;

// Singleton for converter instance
let converterInstance: LibreOfficeConverter | null = null;

// The LibreOffice WASM build occasionally deadlocks inside lok_documentLoad
// and never answers. Allow generous time for large files, then restart the
// engine and retry instead of leaving the user on a spinner forever.
const CONVERSION_ATTEMPTS = 3;
const conversionTimeout = (file: File) =>
  30_000 + Math.ceil(file.size / 1_000_000) * 30_000;

class ConversionStalledError extends Error {}

// Start-up reports progress only between stages: nothing while the ~77 MB of
// engine files download (slow links), then steps every second or so.
async function untilStalled(
  task: Promise<void>,
  progress: () => { percent: number; at: number }
): Promise<void> {
  let timer: ReturnType<typeof setInterval> | undefined;
  const stalled = new Promise<never>((_, reject) => {
    timer = setInterval(() => {
      const { percent, at } = progress();
      const quiet = Date.now() - at;
      if (quiet > (percent > 55 ? 30_000 : 300_000)) {
        reject(new ConversionStalledError('LibreOffice did not start'));
      }
    }, 1000);
  });
  try {
    await Promise.race([task, stalled]);
  } finally {
    clearInterval(timer);
  }
}

export class LibreOfficeConverter {
  private converter: WorkerBrowserConverter | null = null;
  private initialized = false;
  private initializing = false;
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || LIBREOFFICE_LOCAL_PATH;
  }

  async initialize(onProgress?: ProgressCallback): Promise<void> {
    if (this.initialized) return;

    if (this.initializing) {
      while (this.initializing) {
        await new Promise((r) => setTimeout(r, 100));
      }
      return;
    }

    this.initializing = true;
    let progressCallback = onProgress; // Store original callback

    try {
      progressCallback?.({
        phase: 'loading',
        percent: 0,
        message: 'Loading conversion engine...',
      });

      const start = () => {
        progress = { percent: 0, at: Date.now() };
        this.converter = new WorkerBrowserConverter({
          sofficeJs: `${this.basePath}soffice.${LIBREOFFICE_SCRIPT_EXTENSION}`,
          sofficeWasm: `${this.basePath}soffice.wasm.${LIBREOFFICE_BINARY_EXTENSION}`,
          sofficeData: `${this.basePath}soffice.data.${LIBREOFFICE_BINARY_EXTENSION}`,
          sofficeWorkerJs: `${this.basePath}soffice.worker.${LIBREOFFICE_SCRIPT_EXTENSION}`,
          browserWorkerJs: `${this.basePath}browser.worker.global.${LIBREOFFICE_SCRIPT_EXTENSION}`,
          verbose: false,
          onProgress: (info: {
            phase: string;
            percent: number;
            message: string;
          }) => {
            progress = { percent: info.percent, at: Date.now() };
            if (progressCallback && !this.initialized) {
              const simplifiedMessage = `Loading conversion engine (${Math.round(info.percent)}%)...`;
              progressCallback({
                phase: info.phase as LoadProgress['phase'],
                percent: info.percent,
                message: simplifiedMessage,
              });
            }
          },
          onReady: () => {
            console.log('[LibreOffice] Ready!');
          },
          onError: (error: Error) => {
            console.error('[LibreOffice] Error:', error);
          },
        });

        return this.converter.initialize();
      };
      let progress = { percent: 0, at: Date.now() };
      for (let attempt = 1; ; attempt++) {
        try {
          await untilStalled(start(), () => progress);
          break;
        } catch (error) {
          if (!(error instanceof ConversionStalledError)) throw error;
          console.warn(
            `[LibreOffice] Engine start stalled (attempt ${attempt}/${CONVERSION_ATTEMPTS}); restarting`
          );
          this.terminate();
          if (attempt >= CONVERSION_ATTEMPTS) {
            throw new Error(
              'Dönüştürme motoru başlatılamadı. Lütfen sayfayı yenileyip yeniden deneyin.'
            );
          }
        }
      }
      this.initialized = true;

      // Call completion message
      progressCallback?.({
        phase: 'ready',
        percent: 100,
        message: 'Conversion engine ready!',
      });

      // Null out the callback to prevent any late-firing progress updates
      progressCallback = undefined;
    } finally {
      this.initializing = false;
    }
  }

  isReady(): boolean {
    return this.initialized && this.converter !== null;
  }

  async convertToPdf(file: File): Promise<Blob> {
    for (let attempt = 1; ; attempt++) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const stalled = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(new ConversionStalledError('LibreOffice did not respond')),
          conversionTimeout(file)
        );
      });
      try {
        return await Promise.race([this.convertOnce(file), stalled]);
      } catch (error) {
        if (!(error instanceof ConversionStalledError)) throw error;
        console.warn(
          `[LibreOffice] Conversion stalled (attempt ${attempt}/${CONVERSION_ATTEMPTS}); restarting the engine`
        );
        this.terminate();
        if (attempt >= CONVERSION_ATTEMPTS) {
          throw new Error(
            'Dönüştürme motoru yanıt vermedi. Lütfen yeniden deneyin.'
          );
        }
        await this.initialize();
      } finally {
        clearTimeout(timer);
      }
    }
  }

  // destroy() waits for the worker to acknowledge, which a deadlocked worker
  // never does; terminating it also stops its nested soffice threads.
  private terminate(): void {
    const converter = this.converter as unknown as {
      worker?: Worker | null;
    } | null;
    converter?.worker?.terminate();
    this.converter = null;
    this.initialized = false;
  }

  private async convertOnce(file: File): Promise<Blob> {
    if (!this.converter) {
      throw new Error('Converter not initialized');
    }

    console.log(`[LibreOffice] Converting ${file.name} to PDF...`);
    console.log(
      `[LibreOffice] File type: ${file.type}, Size: ${file.size} bytes`
    );

    try {
      console.log(`[LibreOffice] Reading file as ArrayBuffer...`);
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      console.log(`[LibreOffice] File loaded, ${uint8Array.length} bytes`);

      console.log(`[LibreOffice] Calling converter.convert() with buffer...`);
      const startTime = Date.now();

      // Detect input format - critical for CSV to apply import filters
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      console.log(`[LibreOffice] Detected format from extension: ${ext}`);

      const result = await this.converter.convert(
        uint8Array,
        {
          outputFormat: 'pdf',
          inputFormat: ext as InputFormat,
        },
        file.name
      );

      const duration = Date.now() - startTime;
      console.log(
        `[LibreOffice] Conversion complete! Duration: ${duration}ms, Size: ${result.data.length} bytes`
      );

      // Create a copy to avoid SharedArrayBuffer type issues
      const data = new Uint8Array(result.data);
      return new Blob([data], { type: result.mimeType });
    } catch (error) {
      console.error(`[LibreOffice] Conversion FAILED for ${file.name}:`, error);
      console.error(`[LibreOffice] Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async wordToPdf(file: File): Promise<Blob> {
    return this.convertToPdf(file);
  }

  async pptToPdf(file: File): Promise<Blob> {
    return this.convertToPdf(file);
  }

  async excelToPdf(file: File): Promise<Blob> {
    return this.convertToPdf(file);
  }

  async destroy(): Promise<void> {
    if (this.converter) {
      await this.converter.destroy();
    }
    this.converter = null;
    this.initialized = false;
  }
}

export function getLibreOfficeConverter(
  basePath?: string
): LibreOfficeConverter {
  if (!converterInstance) {
    converterInstance = new LibreOfficeConverter(basePath);
  }
  return converterInstance;
}
