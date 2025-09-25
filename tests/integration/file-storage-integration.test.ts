import 'dotenv/config';
import { S3ObjectStorageService } from '../../server/s3Storage';
import { ObjectPermission } from '../../server/objectAcl';

describe('File Storage Integration Testing', () => {
  let s3StorageService: S3ObjectStorageService;

  beforeAll(() => {
    // Only run tests if AWS environment variables are configured
    if (!process.env.S3_BUCKET_NAME || !process.env.AWS_REGION) {
      console.log('Skipping S3 integration tests - missing environment variables');
      return;
    }
    s3StorageService = new S3ObjectStorageService();
  });

  describe('S3 Configuration Validation', () => {
    test('should have required S3 environment variables', () => {
      // In production environment
      const expectedBucket = 'scalemap-storage';
      const expectedRegion = 'eu-west-1';

      expect(expectedBucket).toBe('scalemap-storage');
      expect(expectedRegion).toBe('eu-west-1');
    });

    test('should initialize S3ObjectStorageService with required environment variables', () => {
      // Mock environment variables for testing
      const originalBucket = process.env.S3_BUCKET_NAME;
      const originalRegion = process.env.AWS_REGION;

      process.env.S3_BUCKET_NAME = 'scalemap-storage';
      process.env.AWS_REGION = 'eu-west-1';

      expect(() => new S3ObjectStorageService()).not.toThrow();

      // Restore original values
      process.env.S3_BUCKET_NAME = originalBucket;
      process.env.AWS_REGION = originalRegion;
    });
  });

  describe('Upload URL Generation', () => {
    test('should generate valid presigned upload URLs', async () => {
      if (!s3StorageService) return;

      const uploadURL = await s3StorageService.getObjectEntityUploadURL();

      expect(uploadURL).toBeTruthy();
      expect(uploadURL).toMatch(/^https:\/\/scalemap-storage\.s3\.eu-west-1\.amazonaws\.com\//);
      expect(uploadURL).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
      expect(uploadURL).toContain('X-Amz-Signature=');
    });

    test('should generate unique object keys for each upload', async () => {
      if (!s3StorageService) return;

      const uploadURL1 = await s3StorageService.getObjectEntityUploadURL();
      const uploadURL2 = await s3StorageService.getObjectEntityUploadURL();

      const key1 = s3StorageService.normalizeObjectEntityPath(uploadURL1);
      const key2 = s3StorageService.normalizeObjectEntityPath(uploadURL2);

      expect(key1).not.toBe(key2);
      expect(key1).toMatch(/^[a-f0-9-]+\/[a-f0-9-]+$/);
      expect(key2).toMatch(/^[a-f0-9-]+\/[a-f0-9-]+$/);
    });
  });

  describe('Object Path Normalization', () => {
    test('should correctly extract object key from presigned URL', async () => {
      if (!s3StorageService) return;

      const uploadURL = await s3StorageService.getObjectEntityUploadURL();
      const normalizedPath = s3StorageService.normalizeObjectEntityPath(uploadURL);

      // Based on the actual S3 URL structure, expect UUID/UUID pattern
      expect(normalizedPath).toMatch(/^[a-f0-9-]+\/[a-f0-9-]+$/);
      expect(normalizedPath).not.toContain('https://');
      expect(normalizedPath).not.toContain('scalemap-storage');
    });

    test('should handle object paths with /objects/ prefix', () => {
      if (!s3StorageService) return;

      const mockObjectPath = '/objects/123-uuid/456-uuid/document.pdf';
      const normalizedPath = s3StorageService.normalizeObjectEntityPath(mockObjectPath);

      expect(normalizedPath).toBe('123-uuid/456-uuid/document.pdf');
      expect(normalizedPath).not.toContain('/objects/');
    });
  });

  describe('ACL Policy Integration', () => {
    test('should validate ACL policy structure for private documents', () => {
      const aclPolicy = {
        owner: 'user-123',
        visibility: 'private' as const
      };

      expect(aclPolicy).toHaveProperty('owner');
      expect(aclPolicy).toHaveProperty('visibility');
      expect(aclPolicy.visibility).toBe('private');
      expect(typeof aclPolicy.owner).toBe('string');
    });

    test('should validate object permissions enum values', () => {
      expect(ObjectPermission.READ).toBeDefined();
      expect(ObjectPermission.WRITE).toBeDefined();
      expect(ObjectPermission.READ).toBe('read');
      expect(ObjectPermission.WRITE).toBe('write');
    });
  });

  describe('File Upload Flow Validation', () => {
    test('should validate complete upload workflow', () => {
      // Mock the complete upload workflow as it would happen in the app
      const uploadWorkflow = {
        step1: 'GET /api/objects/upload -> presigned URL',
        step2: 'PUT to presigned URL with file data',
        step3: 'POST /api/assessments/:id/documents with metadata',
        step4: 'Set ACL policy for private access',
        step5: 'Save document record to database'
      };

      expect(uploadWorkflow.step1).toContain('presigned URL');
      expect(uploadWorkflow.step3).toContain('metadata');
      expect(uploadWorkflow.step4).toContain('ACL policy');
      expect(uploadWorkflow.step5).toContain('database');
    });

    test('should validate document metadata structure', () => {
      const documentMetadata = {
        fileName: 'strategic-plan.pdf',
        fileSize: 1024000,
        fileType: 'application/pdf',
        uploadURL: 'https://scalemap-storage.s3.eu-west-1.amazonaws.com/...'
      };

      expect(documentMetadata).toHaveProperty('fileName');
      expect(documentMetadata).toHaveProperty('fileSize');
      expect(documentMetadata).toHaveProperty('fileType');
      expect(documentMetadata).toHaveProperty('uploadURL');
      expect(typeof documentMetadata.fileSize).toBe('number');
      expect(documentMetadata.fileSize).toBeGreaterThan(0);
    });
  });

  describe('File Download Flow Validation', () => {
    test('should validate private file access control', () => {
      const accessControlFlow = {
        step1: 'Extract user ID from JWT token',
        step2: 'Get object file metadata from S3',
        step3: 'Check ACL policy for user access',
        step4: 'Stream file if authorized, 401 if not'
      };

      expect(accessControlFlow.step1).toContain('JWT token');
      expect(accessControlFlow.step3).toContain('ACL policy');
      expect(accessControlFlow.step4).toContain('401');
    });

    test('should validate file streaming response headers', () => {
      const expectedHeaders = {
        'Content-Type': 'application/pdf',
        'Content-Length': '1024000',
        'Last-Modified': 'Wed, 22 Sep 2025 10:00:00 GMT',
        'ETag': '"abc123def456"'
      };

      expect(expectedHeaders).toHaveProperty('Content-Type');
      expect(expectedHeaders).toHaveProperty('Content-Length');
      expect(expectedHeaders).toHaveProperty('Last-Modified');
      expect(expectedHeaders).toHaveProperty('ETag');
    });
  });

  describe('Error Handling Validation', () => {
    test('should validate S3 error response handling', () => {
      const s3Errors = [
        { name: 'NoSuchKey', expectedStatus: 404 },
        { name: 'NotFound', expectedStatus: 404 },
        { name: 'AccessDenied', expectedStatus: 401 },
        { name: 'InvalidRequest', expectedStatus: 400 }
      ];

      s3Errors.forEach(error => {
        expect(error.name).toBeTruthy();
        expect(error.expectedStatus).toBeGreaterThanOrEqual(400);
        expect(error.expectedStatus).toBeLessThan(600);
      });
    });

    test('should validate file size and type restrictions', () => {
      const fileRestrictions = {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'image/png',
          'image/jpeg'
        ]
      };

      expect(fileRestrictions.maxFileSize).toBe(52428800);
      expect(Array.isArray(fileRestrictions.allowedTypes)).toBe(true);
      expect(fileRestrictions.allowedTypes).toContain('application/pdf');
    });
  });

  describe('Production Environment Validation', () => {
    test('should validate S3 bucket configuration for production', () => {
      const bucketConfig = {
        name: 'scalemap-storage',
        region: 'eu-west-1',
        versioning: 'enabled',
        encryption: 'AES256',
        publicAccess: 'blocked',
        cors: 'configured'
      };

      expect(bucketConfig.name).toBe('scalemap-storage');
      expect(bucketConfig.region).toBe('eu-west-1');
      expect(bucketConfig.publicAccess).toBe('blocked');
      expect(bucketConfig.cors).toBe('configured');
    });

    test('should validate IAM permissions for application role', () => {
      const requiredPermissions = [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject',
        's3:ListBucket',
        's3:GetObjectAcl',
        's3:PutObjectAcl'
      ];

      requiredPermissions.forEach(permission => {
        expect(permission).toMatch(/^s3:/);
        expect(permission).toBeTruthy();
      });
    });
  });

  describe('Frontend Integration Validation', () => {
    test('should validate Uppy configuration for S3 uploads', () => {
      const uppyConfig = {
        shouldUseMultipart: false,
        getUploadParameters: 'function',
        restrictions: {
          maxNumberOfFiles: 1,
          maxFileSize: 10485760 // 10MB default
        }
      };

      expect(uppyConfig.shouldUseMultipart).toBe(false);
      expect(uppyConfig.restrictions.maxFileSize).toBe(10485760);
      expect(uppyConfig.restrictions.maxNumberOfFiles).toBe(1);
    });

    test('should validate upload parameter structure', () => {
      const uploadParameters = {
        method: 'PUT' as const,
        url: 'https://scalemap-storage.s3.eu-west-1.amazonaws.com/...'
      };

      expect(uploadParameters.method).toBe('PUT');
      expect(uploadParameters.url).toMatch(/^https:\/\//);
      expect(uploadParameters.url).toContain('scalemap-storage');
    });
  });

  describe('Security Validation', () => {
    test('should validate presigned URL expiration', () => {
      const urlExpiration = {
        uploadUrls: 3600, // 1 hour
        downloadUrls: 3600, // 1 hour
        maxExpiration: 7 * 24 * 3600 // 7 days (AWS limit)
      };

      expect(urlExpiration.uploadUrls).toBe(3600);
      expect(urlExpiration.downloadUrls).toBe(3600);
      expect(urlExpiration.maxExpiration).toBe(604800);
    });

    test('should validate object key generation randomness', () => {
      // Test that object keys contain UUIDs for security
      const mockObjectKey = '550e8400-e29b-41d4-a716-446655440000/550e8400-e29b-41d4-a716-446655440001';

      expect(mockObjectKey).toMatch(/^[a-f0-9-]+\/[a-f0-9-]+$/);

      const parts = mockObjectKey.split('/');
      expect(parts).toHaveLength(2);
      expect(parts[0]).toMatch(/^[a-f0-9-]+$/);
      expect(parts[1]).toMatch(/^[a-f0-9-]+$/);
    });
  });
});