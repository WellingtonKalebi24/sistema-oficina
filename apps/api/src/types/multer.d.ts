declare module "multer" {
  import type { Request, RequestHandler } from "express";

  export type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

  export type DiskStorageOptions = {
    destination?:
      | string
      | ((
          req: Request,
          file: Express.Multer.File,
          callback: (error: Error | null, destination: string) => void,
        ) => void);
    filename?: (
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, filename: string) => void,
    ) => void;
  };

  export type Options = {
    fileFilter?: (req: Request, file: Express.Multer.File, callback: FileFilterCallback) => void;
    limits?: {
      fields?: number;
      fileSize?: number;
      files?: number;
    };
    storage?: StorageEngine;
  };

  export type StorageEngine = {
    _handleFile(
      req: Request,
      file: Express.Multer.File,
      callback: (error?: unknown, info?: Partial<Express.Multer.File>) => void,
    ): void;
    _removeFile(
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null) => void,
    ): void;
  };

  export type Multer = {
    single(fieldName: string): RequestHandler;
  };

  export function diskStorage(options: DiskStorageOptions): StorageEngine;

  export default function multer(options?: Options): Multer;
}

declare namespace Express {
  namespace Multer {
    type File = {
      destination: string;
      encoding: string;
      fieldname: string;
      filename: string;
      mimetype: string;
      originalname: string;
      path: string;
      size: number;
    };
  }
}
