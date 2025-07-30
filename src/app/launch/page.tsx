"use client";

import { useEffect } from "react";
import FHIR from "fhirclient";
import { Skeleton } from "@/components/ui/skeleton";

export default function LaunchPage() {
  useEffect(() => {
    FHIR.oauth2.authorize({
      clientId: "enter_your_client_id_here", // This must be obtained from your FHIR server's developer portal
      scope: "launch/patient patient/Observation.read patient/Observation.write patient/Patient.read openid fhirUser",
      redirectUri: "/",
      // The 'iss' (issuer) parameter is automatically read from the launch URL query parameters
    });
  }, []);

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
