import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from './objectAcl';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

export class S3ObjectNotFoundError extends Error {
  constructor() {
    super("S3 Object not found");
    this.name = "S3ObjectNotFoundError";
    Object.setPrototypeOf(this, S3ObjectNotFoundError.prototype);
  }
}

export class S3ObjectStorageService {
  constructor() {
    if (!process.env.S3_BUCKET_NAME) {
      throw new Error('S3_BUCKET_NAME environment variable is required');
    }
    if (!process.env.AWS_REGION) {
      throw new Error('AWS_REGION environment variable is required');
    }
  }

  // Generate a presigned URL for direct S3 upload
  async getObjectEntityUploadURL(): Promise<string> {
    const objectKey = `${randomUUID()}/${randomUUID()}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
      ContentType: 'application/octet-stream', // Will be overridden by client
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600 // 1 hour
    });

    return signedUrl;
  }

  // Extract object key from presigned URL
  normalizeObjectEntityPath(uploadURL: string): string {
    try {
      // If it's a full URL, extract the object key
      if (uploadURL.startsWith('https://')) {
        const url = new URL(uploadURL);
        // Remove the leading slash and extract the object key
        return url.pathname.slice(1);
      }

      // If it's a path like /objects/something, remove the /objects/ prefix
      if (uploadURL.startsWith('/objects/')) {
        return uploadURL.replace('/objects/', '');
      }

      // Otherwise, return as-is
      return uploadURL;
    } catch (error) {
      throw new Error('Invalid upload URL format');
    }
  }

  // Get object file info by path
  async getObjectEntityFile(objectPath: string): Promise<{ key: string, bucket: string }> {
    const cleanPath = objectPath.startsWith('/objects/')
      ? objectPath.replace('/objects/', '')
      : objectPath;

    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: cleanPath,
      });

      await s3Client.send(command);

      return {
        key: cleanPath,
        bucket: BUCKET_NAME
      };
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        throw new S3ObjectNotFoundError();
      }
      throw error;
    }
  }

  // Check if user can access the object
  async canAccessObjectEntity(params: {
    objectFile: { key: string, bucket: string };
    userId: string;
    requestedPermission: ObjectPermission;
  }): Promise<boolean> {
    const { objectFile, userId, requestedPermission } = params;

    try {
      // Get ACL policy from S3 object metadata
      const aclPolicy = await this.getObjectAclPolicy(objectFile.key);

      if (!aclPolicy) {
        // No ACL policy found - deny access for security
        console.warn(`No ACL policy found for object: ${objectFile.key}`);
        return false;
      }

      // Validate visibility setting first for security
      if (aclPolicy.visibility !== "public" && aclPolicy.visibility !== "private") {
        console.warn(`Access denied: Unknown visibility setting '${aclPolicy.visibility}' for object: ${objectFile.key}`);
        return false;
      }

      // Public objects are always accessible for read
      if (
        aclPolicy.visibility === "public" &&
        requestedPermission === ObjectPermission.READ
      ) {
        return true;
      }

      // Access control requires the user id
      if (!userId) {
        console.warn(`Access denied: No user ID provided for object: ${objectFile.key}`);
        return false;
      }

      // The owner of the object can always access it (for valid visibility settings)
      if (aclPolicy.owner === userId) {
        return true;
      }

      // For private objects, only the owner has access
      // Future enhancement: implement ACL rules for group access
      if (aclPolicy.visibility === "private") {
        console.warn(`Access denied: User ${userId} is not owner of private object: ${objectFile.key}`);
        return false;
      }

      // Default deny for unhandled cases
      return false;
    } catch (error) {
      console.error('Error checking object access:', error);
      return false;
    }
  }

  // Get ACL policy from S3 object metadata
  async getObjectAclPolicy(objectKey: string): Promise<ObjectAclPolicy | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
      });

      const response = await s3Client.send(command);
      const aclPolicyJson = response.Metadata?.['acl-policy'];

      if (!aclPolicyJson) {
        return null;
      }

      return JSON.parse(aclPolicyJson) as ObjectAclPolicy;
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  // Set ACL policy for an object
  async trySetObjectEntityAclPolicy(uploadURL: string, policy: ObjectAclPolicy): Promise<void> {
    const objectKey = this.normalizeObjectEntityPath(uploadURL);

    try {
      // Store ACL policy in S3 object metadata
      const copyCommand = new CopyObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
        CopySource: `${BUCKET_NAME}/${objectKey}`,
        Metadata: {
          'acl-policy': JSON.stringify(policy)
        },
        MetadataDirective: 'REPLACE'
      });

      await s3Client.send(copyCommand);
      console.log(`ACL policy set for ${objectKey}:`, policy);
    } catch (error) {
      console.error(`Error setting ACL policy for ${objectKey}:`, error);
      throw error;
    }
  }

  // Download object and stream to response
  async downloadObject(objectFile: { key: string, bucket: string }, res: Response): Promise<void> {
    try {
      const command = new GetObjectCommand({
        Bucket: objectFile.bucket,
        Key: objectFile.key,
      });

      const response = await s3Client.send(command);

      if (!response.Body) {
        throw new Error('Empty response body from S3');
      }

      // Set appropriate headers
      if (response.ContentType) {
        res.setHeader('Content-Type', response.ContentType);
      }
      if (response.ContentLength) {
        res.setHeader('Content-Length', response.ContentLength);
      }
      if (response.LastModified) {
        res.setHeader('Last-Modified', response.LastModified.toUTCString());
      }
      if (response.ETag) {
        res.setHeader('ETag', response.ETag);
      }

      // Stream the file content
      const stream = response.Body as NodeJS.ReadableStream;
      stream.pipe(res);
    } catch (error: any) {
      console.error('Error downloading object from S3:', error);
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        throw new S3ObjectNotFoundError();
      }
      throw error;
    }
  }

  // Generate presigned URL for file download
  async getPresignedDownloadUrl(objectKey: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  // Delete an object
  async deleteObject(objectKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
    });

    await s3Client.send(command);
  }

  // List objects with prefix
  async listObjects(prefix: string = ''): Promise<Array<{ key: string, size?: number, lastModified?: Date }>> {
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: 1000,
    });

    const response = await s3Client.send(command);

    return (response.Contents || []).map(obj => ({
      key: obj.Key!,
      size: obj.Size,
      lastModified: obj.LastModified,
    }));
  }

  // Check if object exists
  async objectExists(objectKey: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
      });

      await s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  // Get object metadata
  async getObjectMetadata(objectKey: string): Promise<{
    contentType?: string;
    contentLength?: number;
    lastModified?: Date;
    etag?: string;
  }> {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
    });

    const response = await s3Client.send(command);

    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      etag: response.ETag,
    };
  }
}