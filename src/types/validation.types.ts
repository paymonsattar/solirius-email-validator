/**
 * Type definitions for email validation operations
 * These types define the structure of validation results
 */

/**
 * Result from the mock email validation service
 */
export interface EmailValidationResult {
  valid: boolean;
}

/**
 * Detailed validation result for a single email
 * Includes the original data plus validation outcome
 */
export interface DetailedValidationResult {
  name: string;
  email: string;
  valid: boolean;
  error?: string;
}

/**
 * Aggregated validation results for an entire file
 */
export interface ValidationSummary {
  totalValidated: number;
  validCount: number;
  invalidCount: number;
  results: DetailedValidationResult[];
}