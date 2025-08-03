const request = require('supertest');
const app = require('../src/index');
const Document = require('../src/models/document.model');

describe('Document Filtering Performance Tests', () => {
    let largeDataset = [];

    beforeAll(async () => {
        // Create a large dataset for performance testing
        const states = ['California', 'Texas', 'New York', 'Florida', 'Illinois'];
        const departments = ['Health Department', 'Commerce Department', 'Tax Department', 'Motor Vehicle Department', 'Civil Registry'];
        const documentTypes = ['Certificate', 'License', 'Permit', 'Registration', 'Application'];

        const documents = [];
        for (let i = 0; i < 100; i++) {
            documents.push({
                title: `${documentTypes[i % documentTypes.length]} Document ${i + 1}`,
                description: `This is a test document for performance testing. Document number ${i + 1} contains various information and details that might be searched for.`,
                downloadLink: `https://example.com/document-${i + 1}.pdf`,
                applyLink: `https://example.com/apply-document-${i + 1}`,
                state: states[i % states.length],
                department: departments[i % departments.length],
                guidelines: [`Guideline 1 for document ${i + 1}`, `Guideline 2 for document ${i + 1}`],
                requiredDocuments: [`Required doc 1 for ${i + 1}`, `Required doc 2 for ${i + 1}`],
                downloadCount: Math.floor(Math.random() * 1000)
            });
        }

        // Clear existing test documents and create new ones
        await Document.deleteMany({ title: { $regex: /^(Certificate|License|Permit|Registration|Application) Document \d+$/ } });
        largeDataset = await Document.insertMany(documents);
    });

    afterAll(async () => {
        // Clean up test documents
        await Document.deleteMany({ title: { $regex: /^(Certificate|License|Permit|Registration|Application) Document \d+$/ } });
    });

    describe('Response Time Requirements', () => {
        test('should respond to unfiltered requests within 2 seconds', async () => {
            const startTime = Date.now();
            
            const response = await request(app)
                .get('/documents')
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(2000);
            expect(response.text).toContain('Document');
        });

        test('should respond to search filter within 200ms', async () => {
            const startTime = Date.now();
            
            const response = await request(app)
                .get('/documents?search=certificate')
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(200);
            expect(response.text).toContain('Certificate');
        });

        test('should respond to state filter within 200ms', async () => {
            const startTime = Date.now();
            
            const response = await request(app)
                .get('/documents?state=California')
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(200);
        });

        test('should respond to department filter within 200ms', async () => {
            const startTime = Date.now();
            
            const response = await request(app)
                .get('/documents?department=Health Department')
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(200);
        });

        test('should respond to combined filters within 200ms', async () => {
            const startTime = Date.now();
            
            const response = await request(app)
                .get('/documents?search=license&state=Texas&department=Commerce Department')
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(200);
        });

        test('should respond to sort operations within 200ms', async () => {
            const startTime = Date.now();
            
            const response = await request(app)
                .get('/documents?sortBy=downloads')
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(200);
        });
    });

    describe('Concurrent Request Handling', () => {
        test('should handle 10 concurrent filter requests efficiently', async () => {
            const requests = Array(10).fill().map((_, index) => {
                return request(app)
                    .get(`/documents?search=document&state=${index % 2 === 0 ? 'California' : 'Texas'}`)
                    .expect(200);
            });

            const startTime = Date.now();
            const responses = await Promise.all(requests);
            const totalTime = Date.now() - startTime;

            // All requests should complete within 3 seconds total
            expect(totalTime).toBeLessThan(3000);
            
            // All responses should be successful
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.text).toContain('Document');
            });
        });

        test('should handle mixed API and page requests concurrently', async () => {
            const requests = [
                request(app).get('/documents?search=certificate'),
                request(app).get('/api/documents?state=California'),
                request(app).get('/documents?department=Health Department'),
                request(app).get('/api/documents?sortBy=downloads'),
                request(app).get('/documents?search=license&state=Texas')
            ];

            const startTime = Date.now();
            const responses = await Promise.all(requests);
            const totalTime = Date.now() - startTime;

            expect(totalTime).toBeLessThan(2000);
            
            responses.forEach((response, index) => {
                expect(response.status).toBe(200);
                if (index % 2 === 1) {
                    // API responses should be JSON
                    expect(response.body.success).toBe(true);
                } else {
                    // Page responses should be HTML
                    expect(response.text).toContain('Document');
                }
            });
        });
    });

    describe('Memory and Resource Usage', () => {
        test('should not cause memory leaks with repeated requests', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // Make 50 requests to test for memory leaks
            for (let i = 0; i < 50; i++) {
                await request(app)
                    .get(`/documents?search=document${i % 10}`)
                    .expect(200);
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            // Memory increase should be reasonable (less than 50MB)
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        });

        test('should handle large result sets efficiently', async () => {
            const startTime = Date.now();
            
            // Request that should return many results
            const response = await request(app)
                .get('/documents?search=document')
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            
            // Should still respond quickly even with many results
            expect(responseTime).toBeLessThan(1000);
            expect(response.text).toContain('Document');
        });
    });

    describe('Database Query Optimization', () => {
        test('should use efficient queries for text search', async () => {
            // This test would ideally monitor database query performance
            // For now, we test that complex searches still perform well
            const startTime = Date.now();
            
            const response = await request(app)
                .get('/documents?search=test document performance various information')
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(300);
        });

        test('should efficiently handle multiple filter combinations', async () => {
            const filterCombinations = [
                'search=certificate&state=California',
                'search=license&department=Health Department',
                'state=Texas&department=Commerce Department&sortBy=downloads',
                'search=application&state=New York&sortBy=alphabetical',
                'department=Motor Vehicle Department&sortBy=newest'
            ];

            const requests = filterCombinations.map(params => 
                request(app).get(`/documents?${params}`).expect(200)
            );

            const startTime = Date.now();
            const responses = await Promise.all(requests);
            const totalTime = Date.now() - startTime;

            // All complex queries should complete within 1 second total
            expect(totalTime).toBeLessThan(1000);
            
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });
    });

    describe('Pagination Performance', () => {
        test('should handle pagination efficiently', async () => {
            const startTime = Date.now();
            
            const response = await request(app)
                .get('/api/documents?page=1&limit=10')
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(200);
            
            expect(response.body.data.documents).toHaveLength(10);
            expect(response.body.data.pagination).toBeDefined();
        });

        test('should handle large page numbers efficiently', async () => {
            const startTime = Date.now();
            
            const response = await request(app)
                .get('/api/documents?page=10&limit=5')
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            expect(responseTime).toBeLessThan(200);
        });
    });

    describe('Stress Testing', () => {
        test('should handle rapid successive requests', async () => {
            const requests = [];
            const searchTerms = ['certificate', 'license', 'permit', 'registration', 'application'];
            
            // Create 25 rapid requests
            for (let i = 0; i < 25; i++) {
                requests.push(
                    request(app)
                        .get(`/documents?search=${searchTerms[i % searchTerms.length]}`)
                        .expect(200)
                );
            }

            const startTime = Date.now();
            const responses = await Promise.all(requests);
            const totalTime = Date.now() - startTime;

            // Should handle all requests within 5 seconds
            expect(totalTime).toBeLessThan(5000);
            
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });
    });
});