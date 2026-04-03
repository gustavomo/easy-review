import { describe, it, expect } from 'vitest';
// import { buildPrompt } from '../../easy-review/cli/PromptBuilder';

describe('PromptBuilder', () => {
  // PROJ-03: project analysis prepended when available
  it.todo('prepends project analysis context_text when projectAnalysis is provided');
  it.todo('omits project analysis section when projectAnalysis is null');
  it.todo('includes pr_number, pr_title, author, description, and commit messages in prompt');
  it.todo('includes the diff text in the prompt body');
  it.todo('instructs the model to use the 6-section structured format');
});
