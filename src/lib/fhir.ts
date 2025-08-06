import type { Client } from "fhirclient/lib/types";
import type { Patient, Observation } from "./types";
import { toast } from "@/hooks/use-toast";

const BP_CODE = '85354-9';
const SYSTOLIC_CODE = '8480-6';
const DIASTOLIC_CODE = '8462-4';
const SPO2_CODE = '59408-5';

export async function getPatient(client: Client): Promise<Patient | null> {
  try {
    const patient = await client.patient.read();
    return patient as Patient;
  } catch (error) {
    console.error("Failed to fetch patient data:", error);
    toast({ variant: "destructive", title: "Error", description: "Could not fetch patient data." });
    return null;
  }
}

export async function getVitals(client: Client): Promise<Observation[]> {
    if (!client.patient?.id) {
        toast({ variant: "destructive", title: "Error", description: "No patient in context." });
        return [];
    }
    try {
        const response = await client.request(`Observation?patient=${client.patient.id}&code=${BP_CODE},${SPO2_CODE}&_sort=-date&_count=20`);
        const bundle = response as fhir2.Bundle;
        return bundle.entry?.map((e) => e.resource as Observation) || [];
    } catch (error) {
        console.error("Failed to fetch vitals:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch vital signs." });
        return [];
    }
}

export async function createVitals(
  client: Client,
  patientId: string,
  vitals: { systolic: number; diastolic: number },
  demoMode: boolean = false
): Promise<boolean> {
  console.log('=== CREATE VITALS DEBUG ===');
  console.log('Patient ID:', patientId);
  console.log('Vitals data:', vitals);
  console.log('Client state:', {
    serverUrl: client.state.serverUrl,
    tokenUrl: client.state.tokenUri,
    scope: client.state.scope,
    clientId: client.state.clientId,
    patientId: client.patient?.id
  });
  console.log('Token info:', {
    scopes: client.state.tokenResponse?.scope,
    expiresIn: client.state.tokenResponse?.expires_in,
    tokenType: client.state.tokenResponse?.token_type,
    hasToken: !!client.state.tokenResponse?.access_token,
    tokenLength: client.state.tokenResponse?.access_token?.length
  });
  
  // Check if token might be expired
  const tokenIssuedAt = client.state.tokenResponse?.issued_at;
  const expiresIn = client.state.tokenResponse?.expires_in;
  if (tokenIssuedAt && expiresIn) {
    const expiryTime = tokenIssuedAt + (expiresIn * 1000);
    const now = Date.now();
    console.log('Token expiry check:', {
      issuedAt: new Date(tokenIssuedAt).toISOString(),
      expiresAt: new Date(expiryTime).toISOString(),
      currentTime: new Date(now).toISOString(),
      isExpired: now > expiryTime
    });
    
    if (now > expiryTime) {
      console.error('TOKEN IS EXPIRED!');
      toast({ variant: "destructive", title: "Token Expired", description: "Your session has expired. Please re-launch the app." });
      return false;
    }
  }
  
  // Check specific scope permissions
  const grantedScopes = client.state.tokenResponse?.scope?.split(' ') || [];
  console.log('Granted scopes:', grantedScopes);
  console.log('Has Observation write:', grantedScopes.some((s: string) => s.includes('Observation') && (s.includes('.c') || s.includes('write'))));
  
  // Check for encounter context
  const encounterId = client.state.tokenResponse?.encounter;
  console.log('Encounter context:', encounterId);
  
  const observations: Omit<Observation, 'id'>[] = [];
  const now = new Date().toISOString();

<<<<<<< ours
  if (vitals.systolic && vitals.diastolic) {
    observations.push({
||||||| ancestor
  // Create blood pressure observation
    observations.push({
=======
  // Create blood pressure observation
    const bpObservation: any = {
>>>>>>> theirs
      resourceType: 'Observation',
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'vital-signs',
          display: 'Vital Signs'
        }],
        text: 'Vital Signs'
      }],
      code: {
        coding: [{ system: 'http://loinc.org', code: BP_CODE, display: 'Blood Pressure' }],
        text: 'Blood Pressure'
      },
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime: now,
      performer: [{
        extension: [{
          valueCodeableConcept: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
              code: 'LA',
              display: 'legal authenticator'
            }],
            text: 'legal authenticator'
          },
          url: 'http://hl7.org/fhir/StructureDefinition/event-performerFunction'
        }],
        reference: `Practitioner/${client.user?.id || client.state.tokenResponse?.user || '12742069'}`
      }],
      component: [
        {
          code: { coding: [{ system: 'http://loinc.org', code: SYSTOLIC_CODE, display: 'Systolic Blood Pressure' }] },
          valueQuantity: { value: vitals.systolic, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' }
        },
        {
          code: { coding: [{ system: 'http://loinc.org', code: DIASTOLIC_CODE, display: 'Diastolic Blood Pressure' }] },
          valueQuantity: { value: vitals.diastolic, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' }
        }
      ]
    });
  }

  if (vitals.spO2) {
    observations.push({
      resourceType: 'Observation',
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'vital-signs',
          display: 'Vital Signs'
        }],
        text: 'Vital Signs'
      }],
      code: {
        coding: [{ 
          system: 'http://loinc.org', 
          code: '2708-6',
          display: 'Oxygen saturation in Arterial blood'
        }],
        text: 'Oxygen Saturation'
      },
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime: now,
      performer: [{
        extension: [{
          valueCodeableConcept: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
              code: 'LA',
              display: 'legal authenticator'
            }],
            text: 'legal authenticator'
          },
          url: 'http://hl7.org/fhir/StructureDefinition/event-performerFunction'
        }],
        reference: `Practitioner/${client.user?.id || client.state.tokenResponse?.user || '12742069'}`
      }],
      valueQuantity: { 
        value: vitals.spO2, 
        unit: '%', 
        system: 'http://unitsofmeasure.org', 
        code: '%' 
      }
    };
    
    if (encounterId) {
      bpObservation.encounter = { reference: `Encounter/${encounterId}` };
    }
    
    observations.push(bpObservation);

  if (observations.length === 0) {
    toast({ variant: "destructive", title: "No Data", description: "No vital signs data was provided to save." });
    return false;
  }

  const bundle = {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: observations.map(obs => ({
      resource: obs,
      request: {
        method: 'POST',
        url: 'Observation'
      }
    }))
  };

  try {
    console.log('=== CREATE OBSERVATION REQUEST ===');
<<<<<<< ours
    console.log('Number of observations to create:', observations.length);
    console.log('First observation to create:', JSON.stringify(observations[0], null, 2));
    
    // Test manual request with explicit Authorization header
    const accessToken = client.state.tokenResponse?.access_token;
    console.log('=== MANUAL REQUEST TEST ===');
    console.log('Access token available:', !!accessToken);
    console.log('Token type:', client.state.tokenResponse?.token_type);
||||||| ancestor
    console.log('Server URL:', client.state.serverUrl);
    console.log('Access token exists:', !!accessToken);
    console.log('Access token (first 30 chars):', accessToken.substring(0, 30) + '...');
    console.log('Token type:', client.state.tokenResponse?.token_type);
    console.log('Request body:', JSON.stringify(observations[0], null, 2));
=======
    console.log('Number of observations to create:', observations.length);
    console.log('First observation to create:', JSON.stringify(observations[0], null, 2));
>>>>>>> theirs
    
<<<<<<< ours
||||||| ancestor
    // The fhirclient library should handle authorization automatically
    // Try creating observations using the client methods
=======
    // Use the fhirclient library's built-in create method
>>>>>>> theirs
    const results = await Promise.allSettled(
      observations.map(async (obs) => {
        console.log('Creating observation:', obs.code.text);
        try {
<<<<<<< ours
          // Try using client.request instead of client.create to have more control
          const result = await client.request({
            url: 'Observation',
            method: 'POST',
            body: JSON.stringify(obs),
            headers: {
              'Content-Type': 'application/fhir+json',
              'Authorization': `Bearer ${accessToken}`
            }
||||||| ancestor
          // Method 1: Try manual fetch with explicit Authorization header first
          console.log('Attempting manual fetch with explicit Authorization header');
          const url = `${client.state.serverUrl}/Observation`;
          const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/fhir+json',
            'Accept': 'application/fhir+json'
          };
          
          console.log('Full request details:');
          console.log('URL:', url);
          console.log('Headers:', headers);
          
          const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(obs)
          });
          
          console.log('Response status:', response.status);
          console.log('Response headers:', Object.fromEntries(response.headers.entries()));
          
          if (!response.ok) {
            const errorBody = await response.text();
            console.error('Error response body:', errorBody);
            throw new Error(`HTTP ${response.status}: ${errorBody}`);
          }
          
          return await response.json();
          
        } catch (manualError: any) {
          console.error('Manual fetch failed:', manualError);
          
          // Method 2: Fallback to client.create if available
          if (typeof client.create === 'function') {
            console.log('Trying client.create method as fallback');
            try {
              return await client.create(obs);
            } catch (createError: any) {
              console.error('client.create also failed:', createError);
              throw createError;
            }
          }
          
          // Method 3: Try client.request
          console.log('Trying client.request method as final fallback');
          return await client.request({
            url: 'Observation',
            method: 'POST',
            body: obs,
            headers: {
              'Content-Type': 'application/fhir+json',
              'Accept': 'application/fhir+json'
            }
=======
          const result = await client.create(obs);
          console.log('Successfully created:', obs.code.text, result);
          return result;
        } catch (err: any) {
          console.error('Failed to create observation:', obs.code.text, err);
          console.error('Error details:', {
            status: err.status,
            statusText: err.statusText,
            message: err.message,
            response: err.response
>>>>>>> theirs
          });
<<<<<<< ours
          console.log('Successfully created:', obs.code.text, result);
          return result;
        } catch (err: any) {
          console.error('Failed to create observation:', obs.code.text, err);
          console.error('Error details:', {
            status: err.status,
            statusText: err.statusText,
            message: err.message,
            response: err.response
          });
          throw err;
||||||| ancestor
=======
          throw err;
>>>>>>> theirs
        }
      })
    );
    
    console.log('Save results:', results);
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;
    
    if (successCount > 0) {
      toast({ 
        title: "Success", 
        description: `${successCount} vital sign(s) saved successfully.${failCount > 0 ? ` ${failCount} failed.` : ''}` 
      });
      return true;
    } else {
      // Get the first error for debugging
      const firstError = results.find(r => r.status === 'rejected');
      console.error('First error details:', firstError);
      throw new Error('All save attempts failed');
    }
  } catch (error: any) {
    console.error("Failed to save vitals:", error);
    toast({ 
      variant: "destructive", 
      title: "Save Error", 
      description: error.message || "Could not save vital signs." 
    });
    return false;
  }
}
