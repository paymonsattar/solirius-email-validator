import path from 'path';
import { parseCSVFile } from '../../src/utils/csvParser';
import { ValidationError } from '../../src/errors';

describe('CSV Parser', () => {
  const fixturesDir = path.join(__dirname, '../fixtures');

  describe('parseCSVFile', () => {
    describe('valid files', () => {
      it('should parse a valid CSV file with correct columns', async () => {
        const filePath = path.join(fixturesDir, 'valid.csv');
        const result = await parseCSVFile(filePath);

        expect(result.totalRecords).toBe(3);
        expect(result.rows).toHaveLength(3);
        expect(result.rows[0]).toEqual({
          name: 'John Doe',
          email: 'john@example.com',
        });
      });

      it('should handle mixed valid and invalid emails', async () => {
        const filePath = path.join(fixturesDir, 'mixed.csv');
        const result = await parseCSVFile(filePath);

        expect(result.totalRecords).toBe(5);
        expect(result.rows).toHaveLength(5);
      });

      it('should trim whitespace from values', async () => {
        const filePath = path.join(fixturesDir, 'valid.csv');
        const result = await parseCSVFile(filePath);

        // All values should be trimmed
        result.rows.forEach(row => {
          expect(row.name).toBe(row.name.trim());
          expect(row.email).toBe(row.email.trim());
        });
      });
    });

    describe('invalid files', () => {
      it('should throw ValidationError for missing required columns', async () => {
        const filePath = path.join(fixturesDir, 'missing-columns.csv');

        await expect(parseCSVFile(filePath)).rejects.toThrow(ValidationError);
        await expect(parseCSVFile(filePath)).rejects.toThrow(/Missing required columns/);
      });

      it('should throw ValidationError for empty file', async () => {
        const filePath = path.join(fixturesDir, 'empty.csv');

        await expect(parseCSVFile(filePath)).rejects.toThrow(ValidationError);
        await expect(parseCSVFile(filePath)).rejects.toThrow(/empty|no valid headers/i);
      });

      it('should throw ValidationError for non-existent file', async () => {
        const filePath = path.join(fixturesDir, 'non-existent.csv');

        await expect(parseCSVFile(filePath)).rejects.toThrow(ValidationError);
        await expect(parseCSVFile(filePath)).rejects.toThrow(/File not found/);
      });
    });

    describe('security - input sanitization', () => {
      it('should sanitize SQL injection attempts in email', async () => {
        const filePath = path.join(fixturesDir, 'malicious.csv');
        const result = await parseCSVFile(filePath);

        // Find the SQL injection row
        const sqlRow = result.rows.find(r => r.name.includes('SQL'));
        
        // Email should be sanitized - quotes and semicolons removed
        expect(sqlRow?.email).not.toContain("'");
        expect(sqlRow?.email).not.toContain(';');
        // Note: -- stays because - is valid in emails, but the dangerous SQL is broken
        expect(sqlRow?.email).not.toContain("');");
      });

      it('should sanitize XSS attempts in email', async () => {
        const filePath = path.join(fixturesDir, 'malicious.csv');
        const result = await parseCSVFile(filePath);

        // Find the XSS row
        const xssRow = result.rows.find(r => r.name.includes('XSS'));
        
        // Email should have script tags removed
        expect(xssRow?.email).not.toContain('<script>');
        expect(xssRow?.email).not.toContain('</script>');
        expect(xssRow?.email).not.toContain('<');
        expect(xssRow?.email).not.toContain('>');
      });

      it('should sanitize HTML injection attempts', async () => {
        const filePath = path.join(fixturesDir, 'malicious.csv');
        const result = await parseCSVFile(filePath);

        // Find the HTML injection row
        const htmlRow = result.rows.find(r => r.name.includes('HTML'));
        
        // Email should have HTML tags removed
        expect(htmlRow?.email).not.toContain('<img');
        expect(htmlRow?.email).not.toContain('onerror');
      });

      it('should sanitize dangerous characters in name field', async () => {
        const filePath = path.join(fixturesDir, 'malicious.csv');
        const result = await parseCSVFile(filePath);

        // All names should be sanitized
        result.rows.forEach(row => {
          expect(row.name).not.toContain('<');
          expect(row.name).not.toContain('>');
          expect(row.name).not.toContain("'");
          expect(row.name).not.toContain('"');
        });
      });
    });
  });
});