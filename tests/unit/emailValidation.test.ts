import { validateEmailBatch, EmailValidationRecord } from '../../src/services/emailValidationService';

describe('Email Validation Service', () => {
  describe('validateEmailBatch', () => {
    describe('format validation (instant)', () => {
      it('should instantly reject emails without @', async () => {
        const records = [{ name: 'Test', email: 'invalid-email' }];
        const startTime = Date.now();
        
        const results = await validateEmailBatch(records, 'test-upload');
        const elapsed = Date.now() - startTime;

        expect(results[0].valid).toBe(false);
        expect(results[0].error).toBe('Invalid email format');
        // Should be instant (less than 500ms, not waiting for mock API)
        expect(elapsed).toBeLessThan(500);
      });

      it('should instantly reject emails without dot after @', async () => {
        const records = [{ name: 'Test', email: 'user@nodot' }];
        
        const results = await validateEmailBatch(records, 'test-upload');

        expect(results[0].valid).toBe(false);
        expect(results[0].error).toBe('Invalid email format');
      });

      it('should instantly reject emails with nothing before @', async () => {
        const records = [{ name: 'Test', email: '@example.com' }];
        
        const results = await validateEmailBatch(records, 'test-upload');

        expect(results[0].valid).toBe(false);
        expect(results[0].error).toBe('Invalid email format');
      });

      it('should instantly reject emails with dot immediately after @', async () => {
        const records = [{ name: 'Test', email: 'user@.com' }];
        
        const results = await validateEmailBatch(records, 'test-upload');

        expect(results[0].valid).toBe(false);
        expect(results[0].error).toBe('Invalid email format');
      });

      it('should instantly reject emails ending with dot', async () => {
        const records = [{ name: 'Test', email: 'user@example.' }];
        
        const results = await validateEmailBatch(records, 'test-upload');

        expect(results[0].valid).toBe(false);
        expect(results[0].error).toBe('Invalid email format');
      });
    });

    describe('valid format emails (mock API)', () => {
      it('should process valid format emails through mock API', async () => {
        const records = [{ name: 'Test', email: 'valid@example.com' }];
        
        const results = await validateEmailBatch(records, 'test-upload');

        // Result should exist (either valid or invalid from mock API)
        expect(results[0]).toBeDefined();
        expect(results[0].email).toBe('valid@example.com');
        expect(results[0].name).toBe('Test');
        // valid could be true or false due to 15% random failure
        expect(typeof results[0].valid).toBe('boolean');
        // If invalid, should have error message from mock API (not format error)
        if (!results[0].valid) {
          expect(results[0].error).toBe('Mailbox not found');
        }
      });

      it('should handle multiple valid emails concurrently', async () => {
        const records = [
          { name: 'User1', email: 'user1@example.com' },
          { name: 'User2', email: 'user2@example.com' },
          { name: 'User3', email: 'user3@example.com' },
        ];
        
        const results = await validateEmailBatch(records, 'test-upload');

        expect(results).toHaveLength(3);
        results.forEach((result, index) => {
          expect(result.email).toBe(records[index].email);
          expect(result.name).toBe(records[index].name);
          expect(typeof result.valid).toBe('boolean');
        });
      });
    });

    describe('mixed batch processing', () => {
      it('should process mixed valid and invalid emails correctly', async () => {
        const records = [
          { name: 'Valid', email: 'valid@example.com' },
          { name: 'Invalid', email: 'invalid-no-at' },
          { name: 'Also Valid', email: 'also@valid.org' },
        ];
        
        const results = await validateEmailBatch(records, 'test-upload');

        expect(results).toHaveLength(3);
        
        // Invalid format should fail with format error
        expect(results[1].valid).toBe(false);
        expect(results[1].error).toBe('Invalid email format');
        
        // Valid format emails should have been processed (result may vary due to random)
        expect(typeof results[0].valid).toBe('boolean');
        expect(typeof results[2].valid).toBe('boolean');
      });

      it('should return results in original order', async () => {
        const records = [
          { name: 'First', email: 'first@example.com' },
          { name: 'Second', email: 'invalid' },
          { name: 'Third', email: 'third@example.com' },
        ];
        
        const results = await validateEmailBatch(records, 'test-upload');

        expect(results[0].name).toBe('First');
        expect(results[1].name).toBe('Second');
        expect(results[2].name).toBe('Third');
        
        // Second should always be invalid format
        expect(results[1].valid).toBe(false);
        expect(results[1].error).toBe('Invalid email format');
      });
    });

    describe('progress callbacks', () => {
      it('should call onUpdate callback for each processed email', async () => {
        const records = [
          { name: 'User1', email: 'user1@example.com' },
          { name: 'User2', email: 'invalid' },
        ];
        
        const updates: { count: number; records: EmailValidationRecord[] }[] = [];
        
        await validateEmailBatch(records, 'test-upload', async (emailRecords, processedCount) => {
          updates.push({ count: processedCount, records: [...emailRecords] });
        });

        // Should have been called twice (once per email)
        expect(updates.length).toBe(2);
        
        // Final update should show all processed
        const finalUpdate = updates[updates.length - 1];
        expect(finalUpdate.count).toBe(2);
      });

      it('should update email status in callback', async () => {
        const records = [{ name: 'Invalid', email: 'invalid' }];
        
        let finalRecords: EmailValidationRecord[] = [];
        
        await validateEmailBatch(records, 'test-upload', async (emailRecords) => {
          finalRecords = emailRecords;
        });

        expect(finalRecords[0].status).toBe('invalid');
        expect(finalRecords[0].error).toBe('Invalid email format');
      });
    });

    describe('edge cases', () => {
      it('should handle empty batch', async () => {
        const records: Array<{ name: string; email: string }> = [];
        
        const results = await validateEmailBatch(records, 'test-upload');

        expect(results).toHaveLength(0);
      });

      it('should trim email whitespace', async () => {
        const records = [{ name: 'Test', email: '  user@example.com  ' }];
        
        const results = await validateEmailBatch(records, 'test-upload');

        expect(results[0].email).toBe('user@example.com');
      });
    });

    describe('error handling', () => {
      it('should handle API errors gracefully and return invalid with error message', async () => {
        const records = [
          { name: 'User1', email: 'user1@example.com' },
          { name: 'User2', email: 'user2@example.com' },
          { name: 'User3', email: 'user3@example.com' },
          { name: 'User4', email: 'user4@example.com' },
          { name: 'User5', email: 'user5@example.com' },
        ];
        
        const results = await validateEmailBatch(records, 'test-upload');

        // All should complete (no crashes)
        expect(results).toHaveLength(5);
        
        // Each result should have valid structure
        results.forEach(result => {
          expect(result).toHaveProperty('name');
          expect(result).toHaveProperty('email');
          expect(result).toHaveProperty('valid');
          expect(typeof result.valid).toBe('boolean');
          
          // If invalid, should have an error message
          if (!result.valid) {
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
          }
        });
      });
    });
  });
});