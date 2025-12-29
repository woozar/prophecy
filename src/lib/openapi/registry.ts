import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

export const registry = new OpenAPIRegistry();

// Register security scheme for cookie-based authentication
registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'session',
  description: 'Session cookie authentication using JWT',
});

/**
 * Generate the complete OpenAPI document from all registered paths.
 */
export function generateOpenAPIDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Prophezeiung API',
      version: '1.0.0',
      description: 'API for the Prophezeiung prediction platform',
    },
    servers: [{ url: 'http://localhost:3001', description: 'Development' }],
    security: [{ cookieAuth: [] }],
  });
}
