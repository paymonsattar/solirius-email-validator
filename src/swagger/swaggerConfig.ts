/**
 * Swagger/OpenAPI Configuration
 */

import swaggerJsDoc from 'swagger-jsdoc';

const swaggerOptions: swaggerJsDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'File Upload API',
      version: '1.0.0',
      description: `
## CSV Email Validation API

Upload CSV files containing email addresses for validation.
Processing happens asynchronously - poll the status endpoint for results.

### Workflow

1. **Upload** - POST /upload with CSV file
2. **Poll** - GET /status/{uploadId} until status is "completed" or "failed"
3. **Results** - Response includes validation details for each email

### CSV Format

The CSV file must have columns: \`name\` and \`email\`

\`\`\`csv
name,email
John Doe,john@example.com
Jane Smith,jane@example.com
\`\`\`
      `,
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
    ],
    tags: [
      { name: 'Upload', description: 'File upload operations' },
      { name: 'Status', description: 'Status check operations' },
      { name: 'Health', description: 'Health check operations' },
    ],
    paths: {
      '/upload': {
        post: {
          tags: ['Upload'],
          summary: 'Upload a single CSV file',
          description: 'Upload a CSV file with name and email columns for email validation. Processing happens asynchronously.',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['file'],
                  properties: {
                    file: {
                      type: 'string',
                      format: 'binary',
                      description: 'CSV file with name and email columns',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '202': {
              description: 'File accepted for processing',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/UploadResponse',
                  },
                  example: {
                    uploadId: '550e8400-e29b-41d4-a716-446655440000',
                    message: 'File uploaded successfully. Processing started.',
                  },
                },
              },
            },
            '400': {
              description: 'Invalid request (no file, wrong type, etc.)',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '413': {
              description: 'File too large',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '429': {
              description: 'Rate limit exceeded',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/upload/multiple': {
        post: {
          tags: ['Upload'],
          summary: 'Upload multiple CSV files',
          description: 'Upload multiple CSV files for batch processing. Each file gets its own uploadId.',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['files'],
                  properties: {
                    files: {
                      type: 'array',
                      items: {
                        type: 'string',
                        format: 'binary',
                      },
                      description: 'Array of CSV files',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '202': {
              description: 'Files accepted for processing',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/MultiUploadResponse',
                  },
                },
              },
            },
            '400': {
              description: 'Invalid request',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/status/{uploadId}': {
        get: {
          tags: ['Status'],
          summary: 'Get upload processing status',
          description: 'Poll this endpoint to check processing progress and get results when complete.',
          parameters: [
            {
              name: 'uploadId',
              in: 'path',
              required: true,
              description: 'UUID returned from upload endpoint',
              schema: {
                type: 'string',
                format: 'uuid',
              },
            },
          ],
          responses: {
            '200': {
              description: 'Status retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      { $ref: '#/components/schemas/ProcessingStatus' },
                      { $ref: '#/components/schemas/CompletedStatus' },
                      { $ref: '#/components/schemas/FailedStatus' },
                    ],
                  },
                  examples: {
                    processing: {
                      summary: 'Processing in progress',
                      value: {
                        uploadId: '550e8400-e29b-41d4-a716-446655440000',
                        status: 'processing',
                        progress: '45%',
                      },
                    },
                    completed: {
                      summary: 'Processing completed',
                      value: {
                        uploadId: '550e8400-e29b-41d4-a716-446655440000',
                        status: 'completed',
                        totalRecords: 100,
                        processedRecords: 100,
                        failedRecords: 3,
                        details: [
                          { name: 'John Doe', email: 'invalid-email', error: 'Invalid email format' },
                        ],
                      },
                    },
                    failed: {
                      summary: 'Processing failed',
                      value: {
                        uploadId: '550e8400-e29b-41d4-a716-446655440000',
                        status: 'failed',
                        error: 'CSV parsing error: missing required columns',
                        processedRecords: 0,
                        failedRecords: 0,
                        details: [],
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Invalid uploadId format',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '404': {
              description: 'Upload not found or expired',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/status/{uploadId}/detailed': {
        get: {
          tags: ['Status'],
          summary: 'Get detailed upload status',
          description: 'Returns full status object including timestamps and all metadata.',
          parameters: [
            {
              name: 'uploadId',
              in: 'path',
              required: true,
              description: 'UUID returned from upload endpoint',
              schema: {
                type: 'string',
                format: 'uuid',
              },
            },
          ],
          responses: {
            '200': {
              description: 'Detailed status retrieved',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/DetailedStatus',
                  },
                },
              },
            },
            '404': {
              description: 'Upload not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check endpoint',
          description: 'Returns server and database health status. Used by load balancers and monitoring.',
          responses: {
            '200': {
              description: 'Server is healthy',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthResponse',
                  },
                  example: {
                    status: 'healthy',
                    timestamp: '2024-01-15T10:30:00.000Z',
                    database: 'connected',
                  },
                },
              },
            },
            '503': {
              description: 'Server is unhealthy',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthResponse',
                  },
                  example: {
                    status: 'unhealthy',
                    timestamp: '2024-01-15T10:30:00.000Z',
                    database: 'disconnected',
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        UploadResponse: {
          type: 'object',
          properties: {
            uploadId: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for tracking this upload',
            },
            message: {
              type: 'string',
              description: 'Human-readable status message',
            },
          },
          required: ['uploadId', 'message'],
        },
        MultiUploadResponse: {
          type: 'object',
          properties: {
            uploads: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/UploadResponse',
              },
            },
            message: {
              type: 'string',
            },
          },
          required: ['uploads', 'message'],
        },
        ProcessingStatus: {
          type: 'object',
          properties: {
            uploadId: {
              type: 'string',
              format: 'uuid',
            },
            status: {
              type: 'string',
              enum: ['processing'],
            },
            progress: {
              type: 'string',
              description: 'Progress percentage (e.g., "45%")',
            },
          },
          required: ['uploadId', 'status', 'progress'],
        },
        CompletedStatus: {
          type: 'object',
          properties: {
            uploadId: {
              type: 'string',
              format: 'uuid',
            },
            status: {
              type: 'string',
              enum: ['completed'],
            },
            totalRecords: {
              type: 'integer',
              description: 'Total records in CSV',
            },
            processedRecords: {
              type: 'integer',
              description: 'Number of records processed',
            },
            failedRecords: {
              type: 'integer',
              description: 'Number of invalid emails',
            },
            details: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/FailedRecord',
              },
              description: 'Details of failed validations',
            },
          },
          required: ['uploadId', 'status', 'totalRecords', 'processedRecords', 'failedRecords', 'details'],
        },
        FailedStatus: {
          type: 'object',
          properties: {
            uploadId: {
              type: 'string',
              format: 'uuid',
            },
            status: {
              type: 'string',
              enum: ['failed'],
            },
            error: {
              type: 'string',
              description: 'Error message describing why processing failed',
            },
            processedRecords: {
              type: 'integer',
            },
            failedRecords: {
              type: 'integer',
            },
            details: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/FailedRecord',
              },
            },
          },
          required: ['uploadId', 'status', 'error'],
        },
        DetailedStatus: {
          type: 'object',
          properties: {
            uploadId: {
              type: 'string',
              format: 'uuid',
            },
            status: {
              type: 'string',
              enum: ['processing', 'completed', 'failed'],
            },
            totalRecords: {
              type: 'integer',
            },
            processedRecords: {
              type: 'integer',
            },
            failedRecords: {
              type: 'integer',
            },
            progress: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
            },
            details: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/FailedRecord',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
            },
            error: {
              type: 'string',
            },
          },
          required: ['uploadId', 'status', 'totalRecords', 'processedRecords', 'failedRecords', 'progress', 'details', 'createdAt'],
        },
        FailedRecord: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name from CSV row',
            },
            email: {
              type: 'string',
              description: 'Email that failed validation',
            },
            error: {
              type: 'string',
              description: 'Reason for validation failure',
            },
          },
          required: ['name', 'email', 'error'],
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy'],
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            database: {
              type: 'string',
              enum: ['connected', 'disconnected', 'error'],
            },
          },
          required: ['status', 'timestamp', 'database'],
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type/name',
            },
            message: {
              type: 'string',
              description: 'Human-readable error message',
            },
            details: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Additional error details (validation errors, etc.)',
            },
          },
          required: ['error', 'message'],
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsDoc(swaggerOptions);