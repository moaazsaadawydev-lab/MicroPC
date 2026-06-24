import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  uploadFile(
    file: Express.Multer.File,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'micro-pc',
          resource_type: 'auto',
        },
        (error: any, result: any) => {
          if (error) {
            console.error('Detailed Cloudinary Reject Error:', error);
            return reject(error);
          }
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  deleteFile(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const parts = url.split('/micro-pc/');
        if (parts.length < 2) {
          return reject(new Error('Invalid URL or folder not found in URL'));
        }
        const publicIdWithFolder = `micro-pc/${parts[1].split('.')[0]}`;

        cloudinary.uploader.destroy(publicIdWithFolder, (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve(result);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}
