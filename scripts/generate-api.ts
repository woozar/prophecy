import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

// Import all path registrations (side effects)
import '../src/lib/openapi/paths';
import { generateOpenAPIDocument } from '../src/lib/openapi/registry';

const outputPath = './src/lib/api-client/openapi.json';

// Ensure directory exists
mkdirSync(dirname(outputPath), { recursive: true });

// Generate and write OpenAPI spec
const doc = generateOpenAPIDocument();
writeFileSync(outputPath, JSON.stringify(doc, null, 2));

console.log(`OpenAPI spec generated: ${outputPath}`);
console.log(`Registered ${Object.keys(doc.paths || {}).length} paths`);
