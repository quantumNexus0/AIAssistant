import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import CaseAnalyzerTab from './CaseAnalyzerTab';

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
        ok: true,
        json: async () => []
    })));
});

afterEach(() => {
    vi.resetAllMocks();
});

test('adds evidence item when the plus button is clicked', async () => {
    const user = userEvent.setup();

    render(<CaseAnalyzerTab model="llama3.2" language="english" />);

    const evidenceInput = screen.getByPlaceholderText(/e\.g\. FIR copy, Bank Statement, Email log/i);
    await user.type(evidenceInput, 'FIR copy');

    const addButton = screen.getByRole('button', { name: /add evidence/i });
    await user.click(addButton);

    expect(await screen.findByText('FIR copy')).toBeInTheDocument();
});
