/**
 * Altersgrenzen der Registrierung.
 * Grundlage: docs/PRODUCT-MASTER.md (D1) und die gesetzlichen Vorgaben.
 */

export const AGE = {
  /** Untergrenze für die Registrierung. Wird auch in der Datenbank erzwungen. */
  minimum: 10,
  /**
   * Unter 16 können Jugendliche nach DSGVO Art. 8 nicht selbst in die
   * Datenverarbeitung einwilligen — Deutschland nutzt die Obergrenze von 16.
   * Die Einwilligung der Eltern ist dann Pflicht.
   */
  ownConsent: 16,
  /**
   * Unter 18 sind Jugendliche nur beschränkt geschäftsfähig (§ 106 BGB).
   * Vertragspartner und Rechnungsempfänger sind zwingend die Eltern.
   */
  ownContract: 18,
} as const;

/** Alter in vollen Jahren am Stichtag. */
export function ageYears(dateOfBirth: string, on: Date = new Date()): number {
  const dob = new Date(dateOfBirth + "T00:00:00");
  let age = on.getFullYear() - dob.getFullYear();
  const monthDiff = on.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export type AgeRules = {
  age: number;
  tooYoung: boolean;
  /** Eltern müssen in die Datenverarbeitung einwilligen. */
  needsGuardianConsent: boolean;
  /** Eltern sind Vertragspartner und Rechnungsempfänger. */
  needsGuardianContract: boolean;
};

export function ageRules(dateOfBirth: string): AgeRules {
  const age = ageYears(dateOfBirth);
  return {
    age,
    tooYoung: age < AGE.minimum,
    needsGuardianConsent: age < AGE.ownConsent,
    needsGuardianContract: age < AGE.ownContract,
  };
}
