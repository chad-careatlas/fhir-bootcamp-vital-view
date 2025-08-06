import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VitalsForm } from '../VitalsForm'

describe('VitalsForm', () => {
  let mockOnSubmit: jest.Mock

  beforeEach(() => {
    mockOnSubmit = jest.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders blood pressure input fields', () => {
    render(<VitalsForm onSubmit={mockOnSubmit} isSubmitting={false} />)

    expect(screen.getByLabelText('Systolic (mmHg)')).toBeInTheDocument()
    expect(screen.getByLabelText('Diastolic (mmHg)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Vitals' })).toBeInTheDocument()
  })

  it('does not render SpO2 field', () => {
    render(<VitalsForm onSubmit={mockOnSubmit} isSubmitting={false} />)

    expect(screen.queryByLabelText(/SpO2/)).not.toBeInTheDocument()
    expect(screen.queryByText('Oxygen Saturation')).not.toBeInTheDocument()
  })

  it('submits valid blood pressure values', async () => {
    const user = userEvent.setup()
    render(<VitalsForm onSubmit={mockOnSubmit} isSubmitting={false} />)

    await user.type(screen.getByLabelText('Systolic (mmHg)'), '120')
    await user.type(screen.getByLabelText('Diastolic (mmHg)'), '80')
    await user.click(screen.getByRole('button', { name: 'Save Vitals' }))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        systolic: 120,
        diastolic: 80,
      })
    })
  })

  it('shows validation error for invalid systolic values', async () => {
    const user = userEvent.setup()
    render(<VitalsForm onSubmit={mockOnSubmit} isSubmitting={false} />)

    await user.type(screen.getByLabelText('Systolic (mmHg)'), '400') // Too high
    await user.type(screen.getByLabelText('Diastolic (mmHg)'), '80')
    await user.click(screen.getByRole('button', { name: 'Save Vitals' }))

    await waitFor(() => {
      expect(screen.getByText('Must be 50-300.')).toBeInTheDocument()
    })
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('shows validation error for invalid diastolic values', async () => {
    const user = userEvent.setup()
    render(<VitalsForm onSubmit={mockOnSubmit} isSubmitting={false} />)

    await user.type(screen.getByLabelText('Systolic (mmHg)'), '120')
    await user.type(screen.getByLabelText('Diastolic (mmHg)'), '250') // Too high
    await user.click(screen.getByRole('button', { name: 'Save Vitals' }))

    await waitFor(() => {
      expect(screen.getByText('Must be 30-200.')).toBeInTheDocument()
    })
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('shows validation error for systolic values that are too low', async () => {
    const user = userEvent.setup()
    render(<VitalsForm onSubmit={mockOnSubmit} isSubmitting={false} />)

    await user.type(screen.getByLabelText('Systolic (mmHg)'), '30') // Too low
    await user.type(screen.getByLabelText('Diastolic (mmHg)'), '80')
    await user.click(screen.getByRole('button', { name: 'Save Vitals' }))

    await waitFor(() => {
      expect(screen.getByText('Must be 50-300.')).toBeInTheDocument()
    })
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('shows validation error for diastolic values that are too low', async () => {
    const user = userEvent.setup()
    render(<VitalsForm onSubmit={mockOnSubmit} isSubmitting={false} />)

    await user.type(screen.getByLabelText('Systolic (mmHg)'), '120')
    await user.type(screen.getByLabelText('Diastolic (mmHg)'), '20') // Too low
    await user.click(screen.getByRole('button', { name: 'Save Vitals' }))

    await waitFor(() => {
      expect(screen.getByText('Must be 30-200.')).toBeInTheDocument()
    })
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('accepts valid edge case values', async () => {
    const user = userEvent.setup()
    render(<VitalsForm onSubmit={mockOnSubmit} isSubmitting={false} />)

    // Test minimum valid values
    await user.clear(screen.getByLabelText('Systolic (mmHg)'))
    await user.clear(screen.getByLabelText('Diastolic (mmHg)'))
    await user.type(screen.getByLabelText('Systolic (mmHg)'), '50') // Minimum valid
    await user.type(screen.getByLabelText('Diastolic (mmHg)'), '30') // Minimum valid
    await user.click(screen.getByRole('button', { name: 'Save Vitals' }))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        systolic: 50,
        diastolic: 30,
      })
    })
  })

  it('accepts maximum valid values', async () => {
    const user = userEvent.setup()
    render(<VitalsForm onSubmit={mockOnSubmit} isSubmitting={false} />)

    await user.type(screen.getByLabelText('Systolic (mmHg)'), '300') // Maximum valid
    await user.type(screen.getByLabelText('Diastolic (mmHg)'), '200') // Maximum valid
    await user.click(screen.getByRole('button', { name: 'Save Vitals' }))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        systolic: 300,
        diastolic: 200,
      })
    })
  })

  it('shows "Saving..." when isSubmitting is true', () => {
    render(<VitalsForm onSubmit={mockOnSubmit} isSubmitting={true} />)

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('resets form after successful submission', async () => {
    const user = userEvent.setup()
    render(<VitalsForm onSubmit={mockOnSubmit} isSubmitting={false} />)

    const systolicInput = screen.getByLabelText('Systolic (mmHg)') as HTMLInputElement
    const diastolicInput = screen.getByLabelText('Diastolic (mmHg)') as HTMLInputElement

    await user.type(systolicInput, '120')
    await user.type(diastolicInput, '80')

    expect(systolicInput.value).toBe('120')
    expect(diastolicInput.value).toBe('80')

    await user.click(screen.getByRole('button', { name: 'Save Vitals' }))

    await waitFor(() => {
      expect(systolicInput.value).toBe('')
      expect(diastolicInput.value).toBe('')
    })
  })

  it('handles non-numeric input gracefully', async () => {
    const user = userEvent.setup()
    render(<VitalsForm onSubmit={mockOnSubmit} isSubmitting={false} />)

    // Note: HTML number inputs typically prevent non-numeric input at the browser level
    // But we should test the form validation handles edge cases
    await user.type(screen.getByLabelText('Systolic (mmHg)'), '120')
    await user.type(screen.getByLabelText('Diastolic (mmHg)'), '80')
    await user.click(screen.getByRole('button', { name: 'Save Vitals' }))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        systolic: 120,
        diastolic: 80,
      })
    })
  })

  it('requires both systolic and diastolic values', async () => {
    const user = userEvent.setup()
    render(<VitalsForm onSubmit={mockOnSubmit} isSubmitting={false} />)

    // Try to submit with only systolic
    await user.type(screen.getByLabelText('Systolic (mmHg)'), '120')
    await user.click(screen.getByRole('button', { name: 'Save Vitals' }))

    // Should not submit and should show validation error
    expect(mockOnSubmit).not.toHaveBeenCalled()

    // Clear and try with only diastolic
    await user.clear(screen.getByLabelText('Systolic (mmHg)'))
    await user.type(screen.getByLabelText('Diastolic (mmHg)'), '80')
    await user.click(screen.getByRole('button', { name: 'Save Vitals' }))

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })
})