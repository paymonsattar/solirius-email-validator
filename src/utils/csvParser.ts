/**
 * CSV Parser Utility
 * 
 * Handles parsing and validation of uploaded CSV files.
 * Uses streaming to handle large files without memory issues.
 */

import fs from 'fs';
import csv from 'csv-parser';
import { CsvRow, ParsedCsv } from '../schemas';
import { ValidationError } from '../errors';
import { logger } from '../config';

/**
 * Required columns in CSV file
 */
const REQUIRED_COLUMNS = ['name', 'email'] as const;

/**
 * Maximum field length
 * 
 * Prevents DoS via extremely long strings
 */
const MAX_FIELD_LENGTH = 255;

/**
 * Sanitises input to prevent XSS and SQL injection
 * 
 * @param value - Raw input value
 * @returns Sanitised value
 */
function sanitiseInput(value: string): string {
  return value
    .trim()
    // Remove HTML tags (prevents XSS)
    .replace(/<[^>]*>/g, '')
    // Remove SQL-dangerous characters
    .replace(/['";`\\]/g, '')
    // Remove null bytes (prevents null byte injection)
    .replace(/\0/g, '')
    // Limit length (prevents DoS)
    .substring(0, MAX_FIELD_LENGTH);
}

/**
 * Sanitises email specifically
 * 
 * @param email - Raw email value
 * @returns Sanitised email
 */
function sanitiseEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    // Remove any HTML tags
    .replace(/<[^>]*>/g, '')
    // Only keep valid email characters: alphanumeric, @, ., _, -, +
    .replace(/[^a-z0-9@._\-+]/g, '')
    // Limit length
    .substring(0, MAX_FIELD_LENGTH);
}

/**
 * Parses a CSV file and validates its structure
 * 
 * @param filePath - Absolute path to CSV file
 * @returns Parsed rows and total count
 * @throws ValidationError if file is invalid
 */
export function parseCSVFile(filePath: string): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    let headersValidated = false;
    let rowNumber = 0;

    if (!fs.existsSync(filePath)) {
      reject(new ValidationError(`File not found: ${filePath}`, 404));

      return;
    }

    const stream = fs.createReadStream(filePath)
      .pipe(csv({
        // Normalise headers to lowercase for case-insensitive matching
        mapHeaders: ({ header }: { header: string }) => header.trim().toLowerCase(),
        
        // Trim whitespace from all values
        mapValues: ({ value }: { value: string }) => value.trim(),
      }));

    // Validate structure before processing rows
    stream.on('headers', (headers: string[]) => {
      const normalisedHeaders = headers.map(h => h.toLowerCase());
      
      // Find any missing required columns
      const missingColumns = REQUIRED_COLUMNS.filter(
        col => !normalisedHeaders.includes(col)
      );

      if (missingColumns.length > 0) {
        // Stop reading immediately on validation failure
        stream.destroy();

        reject(new ValidationError(
          `Missing required columns: ${missingColumns.join(', ')}. ` +
          `CSV must have columns: ${REQUIRED_COLUMNS.join(', ')}`
        ));
        return;
      }

      headersValidated = true;
      logger.debug('CSV headers validated', { headers: normalisedHeaders });
    });

    // Process each row
    stream.on('data', (row: Record<string, string>) => {
      rowNumber++;

      // Skip empty rows
      if (row.name && row.email) {
        // Prevent XSS and SQL injection attacks
        const sanitisedName = sanitiseInput(row.name);
        const sanitisedEmail = sanitiseEmail(row.email);

        // Only add if sanitised values are still valid
        if (sanitisedName && sanitisedEmail) {
          rows.push({
            name: sanitisedName,
            email: sanitisedEmail,
          });
        } else {
          logger.warn('Row rejected after sanitisation', {
            rowNumber,
            originalName: row.name.substring(0, 50),
            originalEmail: row.email.substring(0, 50),
          });
        }
      } else {
        // Continue processing despite bad rows. Some rows might be malformed,
        // but valid rows should still process
        logger.warn('Skipping row with missing data', { 
          rowNumber, 
          hasName: !!row.name, 
          hasEmail: !!row.email 
        });
      }
    });

    // All data processed successfully
    stream.on('end', () => {
      // Empty file won't trigger headers event
      if (!headersValidated) {
        reject(new ValidationError('CSV file is empty or has no valid headers'));
        return;
      }

      logger.info('CSV parsing completed', { 
        totalRows: rowNumber, 
        validRows: rows.length 
      });
      
      resolve({ 
        rows, 
        totalRecords: rows.length 
      });
    });

    // Handle stream errors (corrupt file, encoding issues)
    stream.on('error', (error: Error) => {
      logger.error('CSV stream error', { error: error.message });
      reject(new ValidationError(`Failed to parse CSV: ${error.message}`));
    });
  });
}