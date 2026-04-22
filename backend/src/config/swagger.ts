import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Verifact API',
      version: '1.0.0',
      description:
        'REST API for Verifact — AI-Powered Rumor Detection & Fact-Checking Social Platform.',
      contact: { name: 'Verifact Team', email: 'dev@verifact.app' },
    },
    servers: [
      { url: `http://localhost:${config.port}/api/v1`, description: 'Development' },
      { url: 'https://api.verifact.app/api/v1', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token from /auth/login (expires in 15m)',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'CLAIM_NOT_FOUND' },
                message: { type: 'string', example: 'Claim not found' },
                details: { type: 'object' },
              },
            },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            hasMore: { type: 'boolean' },
            cursor: { type: 'string', nullable: true },
            total: { type: 'number', nullable: true },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.controller.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
