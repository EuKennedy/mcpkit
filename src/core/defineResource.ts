import type { ResourceDefinition } from './types.js';

export function defineResource(definition: ResourceDefinition): ResourceDefinition {
  if (!definition.uri) {
    throw new Error('defineResource: `uri` is required.');
  }
  if (!definition.name) {
    throw new Error('defineResource: `name` is required.');
  }
  if (typeof definition.read !== 'function') {
    throw new Error(`defineResource: resource "${definition.name}" needs a read() function.`);
  }
  return definition;
}
