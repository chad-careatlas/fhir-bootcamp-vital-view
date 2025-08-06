"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import FHIR from "fhirclient";
import type { Client } from "fhirclient/lib/types";
import { getPatient, getVitals, createVitals } from "@/lib/fhir";
import type { Patient, Observation } from "@/lib/types";
import { PatientBanner } from "@/components/PatientBanner";
import { VitalsDisplay } from "@/components/VitalsDisplay";
import { VitalsForm } from "@/components/VitalsForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Terminal, Power } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function AppContent() {
  const [client, setClient] = useState<Client | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const loadData = useCallback(async (fhirClient: Client) => {
    setLoading(true);
    setError(null);
    try {
      // First, let's just try to get the patient context without fetching
      const patientId = fhirClient.patient.id;
      console.log('Patient context ID:', patientId);
      
      if (patientId) {
        // Fetch patient data and vitals in parallel
        const [patientResult, vitalsResult] = await Promise.allSettled([
          getPatient(fhirClient),
          getVitals(fhirClient)
        ]);
        
        // Handle patient data
        if (patientResult.status === 'fulfilled' && patientResult.value) {
          console.log('Successfully fetched patient data');
          setPatient(patientResult.value);
        } else {
          console.warn('Could not fetch full patient details');
          // The getPatient function will return a fallback patient object
          if (patientResult.status === 'rejected') {
            // Try to get the fallback from a fresh call
            const fallbackPatient = await getPatient(fhirClient);
            if (fallbackPatient) {
              setPatient(fallbackPatient);
            }
          }
        }
        
        // Handle vitals data
        if (vitalsResult.status === 'fulfilled') {
          setObservations(vitalsResult.value);
        } else {
          console.warn('Could not fetch vitals');
          setObservations([]);
        }
      }
    } catch (e: any) {
      console.error('Load data error:', e);
      // Don't show error - allow app to function for writes
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initializeClient = async () => {
      try {
        console.log('Attempting to initialize FHIR client...');
        
        // Add fetch interceptor to log headers
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
          const [url, options] = args;
          console.log('=== FETCH REQUEST ===');
          console.log('URL:', url);
          console.log('Method:', options?.method || 'GET');
          console.log('Headers:', options?.headers);
          console.log('Body:', options?.body);
          return originalFetch.apply(this, args);
        };
        
        const fhirClient = await FHIR.oauth2.ready();
        console.log('FHIR client initialized:', fhirClient);
        console.log('Full client state:', fhirClient.state);
        
        // Log the OAuth endpoints being used
        console.log('=== OAUTH CONFIGURATION ===');
        console.log('Token endpoint:', fhirClient.state.tokenUri);
        console.log('Authorization endpoint:', fhirClient.state.authorizeUri);
        console.log('Client ID:', fhirClient.state.clientId);
        console.log('Redirect URI:', fhirClient.state.redirectUri);
        
        // Debug: Check what scopes we actually got
        const tokenResponse = fhirClient.state.tokenResponse;
        console.log('Token response:', tokenResponse);
        console.log('Granted scopes:', tokenResponse?.scope);
        console.log('Access token (first 20 chars):', tokenResponse?.access_token?.substring(0, 20) + '...');
        console.log('Token expires in:', tokenResponse?.expires_in, 'seconds');
        console.log('Patient ID:', fhirClient.patient.id);
        console.log('User ID:', tokenResponse?.user);
        console.log('Encounter ID:', tokenResponse?.encounter);
        console.log('Server URL:', fhirClient.state.serverUrl);
        
        // Check if we have write scopes
        const scopes = tokenResponse?.scope?.split(' ') || [];
        const hasWriteScope = scopes.some(s => 
          s.includes('write') || 
          s.includes('.c') || 
          s.includes('.crs') || 
          s.includes('.cud')
        );
        console.log('Has write permissions:', hasWriteScope);
        
        // Test the token by making a simple request
        console.log('=== TESTING TOKEN VALIDITY ===');
        try {
          const testUrl = `${fhirClient.state.serverUrl}/metadata`;
          const testResponse = await fetch(testUrl, {
            headers: {
              'Authorization': `Bearer ${tokenResponse?.access_token}`,
              'Accept': 'application/fhir+json'
            }
          });
          console.log('Token test response:', testResponse.status);
          if (!testResponse.ok) {
            console.error('Token test failed:', await testResponse.text());
          } else {
            console.log('Token is valid and working!');
          }
        } catch (testError) {
          console.error('Token test error:', testError);
        }
        
        setClient(fhirClient);
        await loadData(fhirClient);
      } catch (err) {
        console.error('FHIR client initialization error:', err);
        setError("Failed to authorize with FHIR server. Please launch the application from your EHR system.");
        setLoading(false);
      }
    };
    initializeClient();
  }, [loadData]);


  const handleVitalsSubmit = async (data: { systolic?: number; diastolic?: number; spO2?: number }) => {
    if (!client || !patient?.id) {
      toast({ variant: "destructive", title: "Error", description: "Application is not properly initialized." });
      return;
    }
    setIsSubmitting(true);
    const success = await createVitals(client, patient.id, data);
    if (success) {
      const vitalsData = await getVitals(client);
      setObservations(vitalsData);
    }
    setIsSubmitting(false);
  };
  
  // Check context for patient banner setting
  const hidePatientBanner = client?.state?.tokenResponse?.hide_patient_banner;
  const showPatientBanner = hidePatientBanner !== true; // Show unless explicitly hidden

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-primary font-headline">VitalView</h1>
          <p className="text-muted-foreground">Loading patient data...</p>
        </header>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto flex h-screen items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-lg">
          <header className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-primary font-headline">VitalView</h1>
          </header>
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Application Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
           <div className="mt-6 text-center">
              <Link href="/launch">
                <Button>
                  <Power className="mr-2 h-4 w-4" /> Go to Launch Page
                </Button>
              </Link>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary font-headline">VitalView</h1>
        <p className="text-muted-foreground">Review and enter vital signs for your patient.</p>
      </header>
      
      <main className="max-w-4xl mx-auto">

        {showPatientBanner && <PatientBanner patient={patient} />}
        
        {/* Sandbox limitation notice - only show if using fallback patient */}
        {patient && patient.name?.[0]?.given?.[0] === 'Patient' && (
          <Alert className="mb-4">
            <AlertDescription>
              Note: Using limited patient data. Full demographics may not be available in sandbox.
            </AlertDescription>
          </Alert>
        )}
        <VitalsForm onSubmit={handleVitalsSubmit} isSubmitting={isSubmitting} />
        <VitalsDisplay observations={observations} />
      </main>
    </div>
  );
}

function Welcome() {
  return (
    <div className="container mx-auto flex h-screen items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-lg text-center">
         <header className="mb-8">
          <h1 className="text-4xl font-bold text-primary font-headline">VitalView</h1>
         </header>
         <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Welcome!</AlertTitle>
          <AlertDescription>
            This is a SMART on FHIR application. Please launch it from your EHR.
          </AlertDescription>
         </Alert>
         <div className="mt-6">
          <Link href="/launch">
            <Button>
              <Power className="mr-2 h-4 w-4" /> Go to Launch Page
            </Button>
          </Link>
         </div>
      </div>
    </div>
  );
}


function LaunchHandler() {
  const searchParams = useSearchParams();
  const iss = searchParams.get('iss');
  const launch = searchParams.get('launch');

  useEffect(() => {
    if (!iss || !launch) {
      console.error('Missing required launch parameters');
      return;
    }

    // Using localhost with trailing slash as registered in Cerner
    const redirectUri = "http://localhost:9002/";
    
    // SMART v1 scope format - use .read and .write
    FHIR.oauth2.authorize({
      clientId: "d3a97514-e030-4c9e-8e64-7be8127528b9",
      scope: "patient/Patient.read patient/Observation.read patient/Observation.write launch openid fhirUser offline_access",
      redirectUri: redirectUri,
      iss: iss,
      launch: launch,
    });
  }, [iss, launch]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center p-4">
        <h1 className="text-2xl font-bold text-primary font-headline">Launching VitalView...</h1>
        <p className="text-muted-foreground">Please wait while we securely connect to your EHR.</p>
        <div className="w-full max-w-md space-y-4 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <p className="text-sm text-muted-foreground">You will be redirected momentarily.</p>
        </div>
      </div>
    </div>
  );
}

function AuthChecker() {
  const searchParams = useSearchParams();
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);
  
  const hasAuthParams = searchParams.has('code') && searchParams.has('state');
  const hasLaunchParams = searchParams.has('iss') && searchParams.has('launch');
  const hasError = searchParams.has('error');

  // Debug logging and check for OAuth callback
  useEffect(() => {
    console.log('URL params:', Object.fromEntries(searchParams.entries()));
    console.log('Hash params:', window.location.hash);
    console.log('Has auth params:', hasAuthParams);
    console.log('Has launch params:', hasLaunchParams);
    console.log('Has error:', hasError);
    
    // Check if this might be an OAuth callback even without visible params
    // The fhirclient library might handle the params internally
    if (window.location.pathname === '/' && !hasLaunchParams && !hasError) {
      // Check for any SMART session data
      try {
        const keys = Object.keys(sessionStorage);
        const hasSmartSession = keys.some(key => 
          key.includes('SMART') || 
          key.includes('smart') || 
          key === 'authorization_state'
        );
        
        // Also check if we just came from an OAuth flow
        const referrer = document.referrer;
        const fromCerner = referrer.includes('cerner.com') || referrer.includes('authorization');
        
        if (hasSmartSession || hasAuthParams || fromCerner) {
          console.log('Detected OAuth callback - has SMART session or came from auth');
          setIsOAuthCallback(true);
        }
      } catch (e) {
        console.error('Error checking session storage:', e);
      }
    }
  }, [searchParams, hasAuthParams, hasLaunchParams, hasError]);

  // Handle OAuth errors
  if (hasError) {
    const error = searchParams.get('error');
    const errorUri = searchParams.get('error_uri');
    return (
      <div className="container mx-auto flex h-screen items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-lg">
          <header className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-primary font-headline">VitalView</h1>
          </header>
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Authorization Error</AlertTitle>
            <AlertDescription>
              {error === 'invalid_request' ? 'The authorization request was invalid. Please try launching again from your EHR.' : `Error: ${error}`}
              {errorUri && (
                <div className="mt-2">
                  <a href={errorUri} target="_blank" rel="noopener noreferrer" className="text-sm underline">
                    View error details
                  </a>
                </div>
              )}
            </AlertDescription>
          </Alert>
          <div className="mt-6 text-center">
            <Link href="/">
              <Button>
                <Power className="mr-2 h-4 w-4" /> Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Handle SMART launch
  if (hasLaunchParams) {
    return <LaunchHandler />;
  }

  // Handle OAuth callback - check for any SMART session
  if (hasAuthParams || isOAuthCallback) {
    return <AppContent />;
  }
  
  // Also check if FHIR client might be ready
  try {
    // More aggressive check for any SMART session
    const keys = Object.keys(sessionStorage);
    const hasAnySmartData = keys.some(key => 
      key.toLowerCase().includes('smart') || 
      key.includes('authorization') ||
      sessionStorage.getItem(key)?.includes('fhir')
    );
    
    if (hasAnySmartData) {
      return <AppContent />;
    }
  } catch (e) {
    // Ignore sessionStorage errors
  }

  return <Welcome />;
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthChecker />
    </Suspense>
  );
}
