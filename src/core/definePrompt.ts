import type { z } from 'zod';
import type { PromptDefinition } from './types.js';

export function definePrompt<TArgs extends z.ZodTypeAny>(
  definition: PromptDefinition<TArgs>,
): PromptDefinition<TArgs> {
  if (!definition.name) {
    throw new Error('definePrompt: `name` is required.');
  }
  if (typeof definition.build !== 'function') {
    throw new Error(`definePrompt: prompt "${definition.name}" needs a build() function.`);
  }
  return definition;
}
