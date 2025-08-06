import { createVitals } from '../../lib/fhir'
import type { Client } from 'fhirclient'

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

describe('Vitals Workflow Integration Tests', () => {
  let mockClient: jest.Mocked<Client>
  let mockFetch: jest.Mock

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
          access_token: 'eyJ6aXAiOiJERUYiLCJr...mock-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'patient/Observation.read patient/Observation.write patient/Patient.read',
          issued_at: Date.now(),
          encounter: '97953480',
        },
      },
      request: jest.fn(),
    } as any

    // Reset all mocks
    jest.clearAllMocks()
  })

  describe('Blood Pressure Creation Workflow', () => {
    it('should successfully create a blood pressure observation with valid token', async () => {
      const mockObservationResponse = {
        id: 'obs-12345',
        resourceType: 'Observation',
        status: 'final',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '85354-9',
            display: 'Blood Pressure'
          }]
        },
        component: [
          {
            code: { coding: [{ system: 'http://loinc.org', code: '8480-6' }] },
            valueQuantity: { value: 120, unit: 'mmHg' }
          },
          {
            code: { coding: [{ system: 'http://loinc.org', code: '8462-4' }] },
            valueQuantity: { value: 80, unit: 'mmHg' }
          }
        ]
      }

      mockClient.request.mockResolvedValue(mockObservationResponse)

      const vitals = { systolic: 120, diastolic: 80 }
      const result = await createVitals(mockClient, '12724067', vitals)

      expect(result).toBe(true)
      
      // Verify the request was made with correct parameters
      expect(mockClient.request).toHaveBeenCalledWith({
        url: 'Observation',
        method: 'POST',
        body: expect.any(String),
        headers: {
          'Content-Type': 'application/fhir+json',
          'Authorization': 'Bearer eyJ6aXAiOiJERUYiLCJr...mock-token'
        }
      })

      // Verify the observation structure
      const requestCall = mockClient.request.mock.calls[0][0]
      const sentObservation = JSON.parse(requestCall.body)
      
      expect(sentObservation).toMatchObject({
        resourceType: 'Observation',
        status: 'final',
        category: expect.arrayContaining([
          expect.objectContaining({
            coding: expect.arrayContaining([
              expect.objectContaining({
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs'
              })
            ])
          })
        ]),
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '85354-9',
            display: 'Blood Pressure'
          }]
        },
        subject: { reference: 'Patient/12724067' },
        encounter: { reference: 'Encounter/97953480' },
        performer: [{
          extension: expect.any(Array),
          reference: 'Practitioner/12742069'
        }],
        component: [
          {
            code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic Blood Pressure' }] },
            valueQuantity: { value: 120, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' }
          },
          {
            code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic Blood Pressure' }] },
            valueQuantity: { value: 80, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' }
          }
        ]
      })
    })

    it('should handle authentication failure (401 Unauthorized)', async () => {
      mockClient.request.mockRejectedValue({
        status: 401,
        statusText: 'Unauthorized',
        message: 'code="urn:cerner:error:oauth2:resource-access:token-required"',
        response: {
          message: 'code="urn:cerner:error:oauth2:resource-access:token-required"',
          code: 401
        }
      })

      const vitals = { systolic: 120, diastolic: 80 }
      const result = await createVitals(mockClient, '12724067', vitals)

      expect(result).toBe(false)
      expect(mockClient.request).toHaveBeenCalled()
    })

    it('should handle validation failure (422 Unprocessable Entity)', async () => {
      mockClient.request.mockRejectedValue({
        status: 422,
        statusText: 'Unprocessable Entity',
        message: 'Validation failed',
        response: {
          resourceType: 'OperationOutcome',
          issue: [{
            severity: 'error',
            code: 'required',
            details: { text: 'Required field missing' }
          }]
        }
      })

      const vitals = { systolic: 120, diastolic: 80 }
      const result = await createVitals(mockClient, '12724067', vitals)

      expect(result).toBe(false)
    })

    it('should validate token expiration before making requests', async () => {
      // Set token to be expired
      mockClient.state.tokenResponse!.issued_at = Date.now() - 7200000 // 2 hours ago
      mockClient.state.tokenResponse!.expires_in = 3600 // expires after 1 hour

      const vitals = { systolic: 120, diastolic: 80 }
      const result = await createVitals(mockClient, '12724067', vitals)

      expect(result).toBe(false)
      expect(mockClient.request).not.toHaveBeenCalled()
    })

    it('should handle network errors gracefully', async () => {
      mockClient.request.mockRejectedValue(new Error('Network error'))

      const vitals = { systolic: 120, diastolic: 80 }
      const result = await createVitals(mockClient, '12724067', vitals)

      expect(result).toBe(false)
    })

    it('should include all required FHIR fields for Cerner compatibility', async () => {
      mockClient.request.mockResolvedValue({ id: 'obs-123' })

      const vitals = { systolic: 140, diastolic: 90 }
      await createVitals(mockClient, '12724067', vitals)

      const requestCall = mockClient.request.mock.calls[0][0]
      const observation = JSON.parse(requestCall.body)

      // Verify all required fields are present
      expect(observation).toHaveProperty('resourceType', 'Observation')
      expect(observation).toHaveProperty('status', 'final')
      expect(observation).toHaveProperty('category')
      expect(observation).toHaveProperty('code')
      expect(observation).toHaveProperty('subject')
      expect(observation).toHaveProperty('effectiveDateTime')
      expect(observation).toHaveProperty('performer')
      expect(observation).toHaveProperty('component')
      expect(observation).toHaveProperty('encounter')

      // Verify LOINC codes are correct
      expect(observation.code.coding[0].code).toBe('85354-9')
      expect(observation.component[0].code.coding[0].code).toBe('8480-6')
      expect(observation.component[1].code.coding[0].code).toBe('8462-4')

      // Verify values
      expect(observation.component[0].valueQuantity.value).toBe(140)
      expect(observation.component[1].valueQuantity.value).toBe(90)
      
      // Verify units
      expect(observation.component[0].valueQuantity.unit).toBe('mmHg')
      expect(observation.component[1].valueQuantity.unit).toBe('mmHg')
    })

    it('should handle edge case blood pressure values', async () => {
      mockClient.request.mockResolvedValue({ id: 'obs-123' })

      // Test minimum valid values
      let vitals = { systolic: 50, diastolic: 30 }
      let result = await createVitals(mockClient, '12724067', vitals)
      expect(result).toBe(true)

      // Test maximum valid values
      vitals = { systolic: 300, diastolic: 200 }
      result = await createVitals(mockClient, '12724067', vitals)
      expect(result).toBe(true)

      // Test typical high values
      vitals = { systolic: 180, diastolic: 110 }
      result = await createVitals(mockClient, '12724067', vitals)
      expect(result).toBe(true)
    })

    it('should log comprehensive debug information', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      mockClient.request.mockResolvedValue({ id: 'obs-123' })

      const vitals = { systolic: 120, diastolic: 80 }
      await createVitals(mockClient, '12724067', vitals)

      // Verify debug logging includes key information
      expect(consoleSpy).toHaveBeenCalledWith('=== CREATE VITALS DEBUG ===')
      expect(consoleSpy).toHaveBeenCalledWith('Patient ID:', '12724067')
      expect(consoleSpy).toHaveBeenCalledWith('Vitals data:', vitals)
      expect(consoleSpy).toHaveBeenCalledWith('Has Observation write:', true)

      consoleSpy.mockRestore()
    })
  })

  describe('End-to-End Blood Pressure Workflow', () => {
    it('should complete the full workflow: validation -> creation -> success', async () => {
      // Mock successful creation
      mockClient.request.mockResolvedValue({
        id: 'obs-final-test',
        resourceType: 'Observation',
        status: 'final'
      })

      // Test the complete workflow
      const patientId = '12724067'
      const vitals = { systolic: 130, diastolic: 85 }

      // Step 1: Token validation (implicit in createVitals)
      // Step 2: Observation creation
      const result = await createVitals(mockClient, patientId, vitals)

      // Step 3: Verify success
      expect(result).toBe(true)
      expect(mockClient.request).toHaveBeenCalledTimes(1)
      
      const requestArgs = mockClient.request.mock.calls[0][0]
      expect(requestArgs.method).toBe('POST')
      expect(requestArgs.url).toBe('Observation')
      expect(requestArgs.headers['Authorization']).toContain('Bearer')
      expect(requestArgs.headers['Content-Type']).toBe('application/fhir+json')
    })
  })
})