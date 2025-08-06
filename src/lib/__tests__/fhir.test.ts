import { createVitals, getPatient, getVitals } from '../fhir'
import type { Client } from 'fhirclient'

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

describe('FHIR Utility Functions', () => {
  let mockClient: jest.Mocked<Client>

  beforeEach(() => {
    mockClient = {
      patient: { id: '12724067' },
      user: { id: '12742069' },
      state: {
        serverUrl: 'https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d',
        tokenUri: 'https://authorization.cerner.com/token',
        scope: 'patient/Observation.read patient/Observation.write patient/Patient.read',
        clientId: 'd3a97514-e030-4c9e-8e64-7be8127528b9',
        tokenResponse: {
          access_token: 'mock-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'patient/Observation.read patient/Observation.write patient/Patient.read',
          issued_at: Date.now(),
          encounter: '97953480',
        },
      },
      request: jest.fn(),
      create: jest.fn(),
    } as any

    jest.clearAllMocks()
  })

  describe('getPatient', () => {
    it('should fetch patient data using client.patient.read', async () => {
      const mockPatient = {
        id: '12724067',
        resourceType: 'Patient',
        name: [{ given: ['John'], family: 'Doe' }],
        gender: 'male',
        birthDate: '1990-01-01',
      }

      mockClient.patient.read = jest.fn().mockResolvedValue(mockPatient)

      const result = await getPatient(mockClient)

      expect(result).toEqual(mockPatient)
      expect(mockClient.patient.read).toHaveBeenCalled()
    })

    it('should return null when no patient ID in context', async () => {
      mockClient.patient = { id: undefined }

      const result = await getPatient(mockClient)

      expect(result).toBeNull()
    })

    it('should return a minimal patient object when all methods fail', async () => {
      mockClient.patient.read = jest.fn().mockRejectedValue(new Error('Read failed'))
      mockClient.request = jest.fn().mockRejectedValue(new Error('Request failed'))
      mockClient.user = { read: jest.fn().mockRejectedValue(new Error('User read failed')) }

      const result = await getPatient(mockClient)

      expect(result).toEqual({
        id: '12724067',
        resourceType: 'Patient',
        name: [{ given: ['Patient'], family: '12724067' }],
        gender: 'unknown',
        birthDate: '1990-01-01',
      })
    })
  })

  describe('getVitals', () => {
    it('should fetch vitals successfully', async () => {
      const mockBundle = {
        entry: [
          {
            resource: {
              id: '1',
              resourceType: 'Observation',
              code: { coding: [{ code: '85354-9' }] },
              component: [
                { code: { coding: [{ code: '8480-6' }] }, valueQuantity: { value: 120 } },
                { code: { coding: [{ code: '8462-4' }] }, valueQuantity: { value: 80 } },
              ],
            },
          },
        ],
      }

      mockClient.request.mockResolvedValue(mockBundle)

      const result = await getVitals(mockClient)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockBundle.entry[0].resource)
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.stringContaining('Observation?patient=12724067&code=85354-9')
      )
    })

    it('should return empty array when fetch fails', async () => {
      mockClient.request.mockRejectedValue(new Error('Fetch failed'))

      const result = await getVitals(mockClient)

      expect(result).toEqual([])
    })

    it('should return empty array when no patient in context', async () => {
      mockClient.patient = { id: undefined }

      const result = await getVitals(mockClient)

      expect(result).toEqual([])
    })
  })

  describe('createVitals', () => {
    it('should create blood pressure observation successfully', async () => {
      const mockObservationResponse = {
        id: 'obs-123',
        resourceType: 'Observation',
        status: 'final',
      }

      mockClient.request.mockResolvedValue(mockObservationResponse)

      const vitals = { systolic: 120, diastolic: 80 }
      const result = await createVitals(mockClient, '12724067', vitals)

      expect(result).toBe(true)
      expect(mockClient.request).toHaveBeenCalledWith({
        url: 'Observation',
        method: 'POST',
        body: expect.stringContaining('Blood Pressure'),
        headers: {
          'Content-Type': 'application/fhir+json',
          Authorization: 'Bearer mock-access-token',
        },
      })
    })

    it('should create proper FHIR observation structure', async () => {
      mockClient.request.mockResolvedValue({ id: 'obs-123' })

      const vitals = { systolic: 140, diastolic: 90 }
      await createVitals(mockClient, '12724067', vitals)

      const requestCall = mockClient.request.mock.calls[0][0]
      const observationBody = JSON.parse(requestCall.body)

      expect(observationBody).toMatchObject({
        resourceType: 'Observation',
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs',
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '85354-9',
              display: 'Blood Pressure',
            },
          ],
        },
        subject: { reference: 'Patient/12724067' },
        component: [
          {
            code: {
              coding: [
                {
                  system: 'http://loinc.org',
                  code: '8480-6',
                  display: 'Systolic Blood Pressure',
                },
              ],
            },
            valueQuantity: {
              value: 140,
              unit: 'mmHg',
              system: 'http://unitsofmeasure.org',
              code: 'mm[Hg]',
            },
          },
          {
            code: {
              coding: [
                {
                  system: 'http://loinc.org',
                  code: '8462-4',
                  display: 'Diastolic Blood Pressure',
                },
              ],
            },
            valueQuantity: {
              value: 90,
              unit: 'mmHg',
              system: 'http://unitsofmeasure.org',
              code: 'mm[Hg]',
            },
          },
        ],
        encounter: { reference: 'Encounter/97953480' },
      })
    })

    it('should handle creation failure gracefully', async () => {
      mockClient.request.mockRejectedValue({
        status: 401,
        message: 'Unauthorized',
      })

      const vitals = { systolic: 120, diastolic: 80 }
      const result = await createVitals(mockClient, '12724067', vitals)

      expect(result).toBe(false)
    })

    it('should detect expired tokens', async () => {
      // Set token to be expired
      mockClient.state.tokenResponse!.issued_at = Date.now() - 4000000 // 4000 seconds ago
      mockClient.state.tokenResponse!.expires_in = 3600 // expires after 1 hour

      const vitals = { systolic: 120, diastolic: 80 }
      const result = await createVitals(mockClient, '12724067', vitals)

      expect(result).toBe(false)
    })

    it('should include encounter reference when available', async () => {
      mockClient.request.mockResolvedValue({ id: 'obs-123' })

      const vitals = { systolic: 120, diastolic: 80 }
      await createVitals(mockClient, '12724067', vitals)

      const requestCall = mockClient.request.mock.calls[0][0]
      const observationBody = JSON.parse(requestCall.body)

      expect(observationBody.encounter).toEqual({
        reference: 'Encounter/97953480',
      })
    })

    it('should include performer with correct practitioner reference', async () => {
      mockClient.request.mockResolvedValue({ id: 'obs-123' })

      const vitals = { systolic: 120, diastolic: 80 }
      await createVitals(mockClient, '12724067', vitals)

      const requestCall = mockClient.request.mock.calls[0][0]
      const observationBody = JSON.parse(requestCall.body)

      expect(observationBody.performer[0].reference).toBe('Practitioner/12742069')
    })
  })
})