export interface Patient {
  id?: string;
  name?: {
    family: string;
    given: string[];
  }[];
  birthDate?: string;
  gender?: string;
}

export interface Observation {
  id?: string;
  resourceType: 'Observation';
  status: 'final' | 'preliminary' | 'corrected' | 'entered-in-error';
  code: {
    coding?: {
      system: string;
      code: string;
      display: string;
    }[];
    text: string;
  };
  subject: {
    reference: string;
  };
  effectiveDateTime: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system: string;
    code: string;
  };
  component?: {
    code: {
      coding?: {
        system: string;
        code: string;
        display: string;
      }[];
    };
    valueQuantity: {
      value: number;
      unit: string;
      system: string;
      code: string;
    };
  }[];
}
