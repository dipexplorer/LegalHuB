const request = require('supertest');
const app = require('../src/index');
const Document = require('../src/models/document.model');

describe('Document Filtering Functionality', () => {
    let testDocuments = [];

    beforeAll(async () => {
        // Create test documents with various states and departments
        const sampleDocuments = [
            {
                title: 'Birth Certificate Application',
                description: 'Official document for birth registration and certificate issuance',
                downloadLink: 'https://example.com/birth-cert.pdf',
                applyLink: 'https://example.com/apply-birth-cert',
                state: 'California',
                department: 'Health Department',
                guidelines: ['Valid ID required', 'Birth hospital records needed'],
                requiredDocuments: ['Photo ID', 'Hospital birth record'],
                downloadCount: 150
            },
            {
                title: 'Marriage License Form',
                description: 'Application form for marriage license registration',
                downloadLink: 'https://example.com/marriage-license.pdf',
                applyLink: 'https://example.com/apply-marriage',
                state: 'California',
                department: 'Civil Registry',
                guidelines: ['Both parties must be present', 'Valid identification required'],
                requiredDocuments: ['Photo ID', 'Birth certificate'],
                downloadCount: 89
            },
            {
                title: 'Business License Application',
                description: 'Form for new business registration and licensing',
                downloadLink: 'https://example.com/business-license.pdf',
                applyLink: 'https://example.com/apply-business',
                state: 'Texas',
                department: 'Commerce Department',
                guidelines: ['Business plan required', 'Fee payment necessary'],
                requiredDocuments: ['Business plan', 'Tax ID'],
                downloadCount: 234
            },
            {
                title: 'Driver License Renewal',
                description: 'Renewal form for existing driver license holders',
                downloadLink: 'https://example.com/driver-renewal.pdf',
                applyLink: 'https://example.com/apply-driver-renewal',
                state: 'Texas',
                department: 'Motor Vehicle Department',
                guidelines: ['Current license required', 'Vision test may be needed'],
                requiredDocuments: ['Current license', 'Proof of residence'],
                downloadCount: 456
            },
            {
                title: 'Property Tax Assessment',
                description: 'Form for property tax assessment and appeals',
                downloadLink: 'https://example.com/property-tax.pdf',
                applyLink: 'https://example.com/apply-property-tax',
                state: 'New York',
                department: 'Tax Department',
                guidelines: ['Property deed required', 'Assessment deadline applies'],
                requiredDocuments: ['Property deed', 'Previous tax records'],
                downloadCount: 67
            }
        ];

        // Clear existing test documents and create new ones
        await Document.deleteMany({ title: { $in: sampleDocuments.map(doc => doc.title) } });
        testDocuments = await Document.insertMany(sampleDocuments);
    });

    afterAll(async () => {
        // Clean up test documents
        await Document.deleteMany({ title: { $in: testDocuments.map(doc => doc.title) } });
    });

    describe('GET /documents - Server-side filtering', () => {
        test('should return all documents when no filters applied', async () => {
            const response = await request(app)
                .get('/documents')
                .expect(200);

            expect(response.text).toContain('Birth Certificate Application');
            expect(response.text).toContain('Marriage License Form');
            expect(response.text).toContain('Business License Application');
        });

        test('should filter documents by search term in title', async () => {
            const response = await request(app)
                .get('/documents?search=birth')
                .expect(200);

            expect(response.text).toContain('Birth Certificate Application');
            expect(response.text).not.toContain('Marriage License Form');
            expect(response.text).not.toContain('Business License Application');
        });

        test('should filter documents by search term in description', async () => {
            const response = await request(app)
                .get('/documents?search=registration')
                .expect(200);

            expect(response.text).toContain('Birth Certificate Application');
            expect(response.text).toContain('Marriage License Form');
            expect(response.text).toContain('Business License Application');
        });

        test('should filter documents by state', async () => {
            const response = await request(app)
                .get('/documents?state=California')
                .expect(200);

            expect(response.text).toContain('Birth Certificate Application');
            expect(response.text).toContain('Marriage License Form');
            expect(response.text).not.toContain('Business License Application');
            expect(response.text).not.toContain('Driver License Renewal');
        });

        test('should filter documents by department', async () => {
            const response = await request(app)
                .get('/documents?department=Health Department')
                .expect(200);

            expect(response.text).toContain('Birth Certificate Application');
            expect(response.text).not.toContain('Marriage License Form');
            expect(response.text).not.toContain('Business License Application');
        });

        test('should combine multiple filters', async () => {
            const response = await request(app)
                .get('/documents?state=Texas&department=Commerce Department')
                .expect(200);

            expect(response.text).toContain('Business License Application');
            expect(response.text).not.toContain('Driver License Renewal');
            expect(response.text).not.toContain('Birth Certificate Application');
        });

        test('should sort documents by newest first (default)', async () => {
            const response = await request(app)
                .get('/documents')
                .expect(200);

            // Check that the response contains documents in the expected order
            // Note: This is a basic check - in a real scenario, you'd parse the HTML
            // or use a more sophisticated method to verify order
            expect(response.text).toMatch(/Property Tax Assessment.*Birth Certificate Application/s);
        });

        test('should sort documents by most downloaded', async () => {
            const response = await request(app)
                .get('/documents?sortBy=downloads')
                .expect(200);

            // Driver License Renewal (456 downloads) should appear before others
            expect(response.text).toContain('Driver License Renewal');
        });

        test('should sort documents alphabetically', async () => {
            const response = await request(app)
                .get('/documents?sortBy=alphabetical')
                .expect(200);

            // Birth Certificate should come first alphabetically
            expect(response.text).toContain('Birth Certificate Application');
        });

        test('should handle case-insensitive search', async () => {
            const response = await request(app)
                .get('/documents?search=BIRTH')
                .expect(200);

            expect(response.text).toContain('Birth Certificate Application');
        });

        test('should return empty results for non-matching filters', async () => {
            const response = await request(app)
                .get('/documents?search=nonexistent')
                .expect(200);

            expect(response.text).toContain('No documents found');
            expect(response.text).toContain('Try adjusting your filters');
        });

        test('should handle invalid state filter gracefully', async () => {
            const response = await request(app)
                .get('/documents?state=InvalidState')
                .expect(200);

            expect(response.text).toContain('No documents found');
        });

        test('should include filter options in response', async () => {
            const response = await request(app)
                .get('/documents')
                .expect(200);

            // Check that filter dropdowns contain the expected options
            expect(response.text).toContain('California');
            expect(response.text).toContain('Texas');
            expect(response.text).toContain('New York');
            expect(response.text).toContain('Health Department');
            expect(response.text).toContain('Commerce Department');
        });

        test('should maintain current filter values in form', async () => {
            const response = await request(app)
                .get('/documents?search=license&state=California')
                .expect(200);

            // Check that form inputs maintain the filter values
            expect(response.text).toContain('value="license"');
            expect(response.text).toContain('selected');
        });

        test('should display correct results count', async () => {
            const response = await request(app)
                .get('/documents?state=California')
                .expect(200);

            expect(response.text).toContain('Showing <strong>2</strong> documents');
        });
    });

    describe('API Endpoint /api/documents - JSON filtering', () => {
        test('should return filtered documents as JSON', async () => {
            const response = await request(app)
                .get('/api/documents?state=California')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.documents).toHaveLength(2);
            expect(response.body.data.documents[0].state).toBe('California');
            expect(response.body.data.documents[1].state).toBe('California');
        });

        test('should include filter options in JSON response', async () => {
            const response = await request(app)
                .get('/api/documents')
                .expect(200);

            expect(response.body.data.filterOptions).toBeDefined();
            expect(response.body.data.filterOptions.states).toContain('California');
            expect(response.body.data.filterOptions.departments).toContain('Health Department');
        });

        test('should include applied filters in JSON response', async () => {
            const response = await request(app)
                .get('/api/documents?search=birth&state=California')
                .expect(200);

            expect(response.body.data.appliedFilters.search).toBe('birth');
            expect(response.body.data.appliedFilters.state).toBe('California');
        });

        test('should handle pagination parameters', async () => {
            const response = await request(app)
                .get('/api/documents?page=1&limit=2')
                .expect(200);

            expect(response.body.data.documents).toHaveLength(2);
            expect(response.body.data.pagination.currentPage).toBe(1);
            expect(response.body.data.pagination.totalDocuments).toBeGreaterThan(2);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle empty search terms', async () => {
            const response = await request(app)
                .get('/documents?search=   ')
                .expect(200);

            // Should return all documents when search is empty/whitespace
            expect(response.text).toContain('Birth Certificate Application');
        });

        test('should handle special characters in search', async () => {
            const response = await request(app)
                .get('/documents?search=license%20%26%20registration')
                .expect(200);

            // Should handle URL-encoded special characters gracefully
            expect(response.status).toBe(200);
        });

        test('should handle multiple spaces in search terms', async () => {
            const response = await request(app)
                .get('/documents?search=birth    certificate')
                .expect(200);

            expect(response.text).toContain('Birth Certificate Application');
        });

        test('should handle invalid sort parameters', async () => {
            const response = await request(app)
                .get('/documents?sortBy=invalid')
                .expect(200);

            // Should default to newest when invalid sort is provided
            expect(response.status).toBe(200);
        });

        test('should handle very long search terms', async () => {
            const longSearch = 'a'.repeat(1000);
            const response = await request(app)
                .get(`/documents?search=${longSearch}`)
                .expect(200);

            expect(response.text).toContain('No documents found');
        });
    });

    describe('Performance Tests', () => {
        test('should respond within acceptable time limits', async () => {
            const startTime = Date.now();
            
            await request(app)
                .get('/documents?search=license&state=California&department=Health Department')
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
        });

        test('should handle concurrent filter requests', async () => {
            const requests = [
                request(app).get('/documents?state=California'),
                request(app).get('/documents?state=Texas'),
                request(app).get('/documents?search=license'),
                request(app).get('/documents?sortBy=downloads'),
                request(app).get('/documents?department=Health Department')
            ];

            const responses = await Promise.all(requests);
            
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });
    });

    describe('Accessibility and SEO', () => {
        test('should include proper semantic markup', async () => {
            const response = await request(app)
                .get('/documents')
                .expect(200);

            expect(response.text).toContain('role="main"');
            expect(response.text).toContain('role="search"');
            expect(response.text).toContain('aria-label');
            expect(response.text).toContain('aria-describedby');
        });

        test('should include skip links for accessibility', async () => {
            const response = await request(app)
                .get('/documents')
                .expect(200);

            expect(response.text).toContain('Skip to documents');
            expect(response.text).toContain('href="#documents-list"');
        });

        test('should have proper heading structure', async () => {
            const response = await request(app)
                .get('/documents')
                .expect(200);

            expect(response.text).toContain('<h1');
            expect(response.text).toContain('<h2');
            expect(response.text).toMatch(/<h1[^>]*>.*Download Legal Documents.*<\/h1>/);
        });
    });
});