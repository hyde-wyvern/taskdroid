// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Documentation } from './Documentation';

it('documents concepts, CLI, and focused MCP document tools', () => {
  render(<Documentation />);
  expect(screen.getByRole('heading', { name: 'Taskdroid documentation' })).toBeTruthy();
  expect(screen.getByText('list_documents, get_document, update_document')).toBeTruthy();
  expect(screen.getByText('taskdroid init --manage-agent-instructions')).toBeTruthy();
});
