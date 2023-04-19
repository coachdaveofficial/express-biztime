process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../app');
const db = require('../db');

let testInvoice;
let testCompanies;
beforeEach(async () => {
    const compResult = await db.query(`INSERT INTO companies (code, name, description) VALUES ('apple', 'Apple Computer', 'Maker of OSX.')
    RETURNING code, name, description`)
    const invResult = await db.query(`INSERT INTO invoices (comp_code, amt, add_date) VALUES ('apple', 100, '2018-01-01')
    RETURNING id, comp_code, amt, paid, add_date, paid_date`)

    testCompanies = compResult.rows;
    testInvoice = invResult.rows[0];
});

afterEach(async () => {
    await db.query('DELETE FROM invoices')
    await db.query('DELETE FROM companies')
});

afterAll(async () => {
    await db.end()
});

describe("GET /invoices", () => {
    test("Gets an invoice object that contains all invoices", async () => {
        const response = await request(app).get('/invoices')
        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Object);
        expect(response.body.invoices.length).toBe(1);
        expect(response.body.invoices[0]).toHaveProperty('id', testInvoice.id);
        expect(response.body.invoices[0]).toHaveProperty('comp_code', testInvoice.comp_code);
        expect(response.body.invoices[0]).toHaveProperty('amt', testInvoice.amt);
        expect(response.body.invoices[0]).toHaveProperty('paid', testInvoice.paid);
        expect(response.body.invoices[0]).toHaveProperty('add_date', '2018-01-01T08:00:00.000Z');
        expect(response.body.invoices[0]).toHaveProperty('paid_date', null);
    });
});

describe("GET /companies", () => {
    test("Gets a companies object that contains all companies names and codes", async () => {

        
        const response = await request(app).get('/companies');
        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Object);
        expect(response.body).toEqual({
            companies: [{ name: testCompanies[0].name, code: testCompanies[0].code }]
        })
    })
})

describe("GET /invoices/:id", () => {
    test("Gets a singular invoice object by id", async () => {
        const response = await request(app).get(`/invoices/${testInvoice.id}`)
        const company = await request(app).get(`/companies/${testInvoice.comp_code}`)
        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Object);
        expect(response.body.invoice).toHaveProperty('id', String(testInvoice.id));
        expect(response.body.invoice).toHaveProperty('comp_code', testInvoice.comp_code);
        expect(response.body.invoice).toHaveProperty('amt', testInvoice.amt);
        expect(response.body.invoice).toHaveProperty('paid_date', testInvoice.paid_date);
        expect(response.body.invoice).toHaveProperty('add_date', '2018-01-01T08:00:00.000Z');
        expect(response.body.invoice).toHaveProperty('paid_date', null);
        expect(response.body.invoice.company).toHaveProperty('code', company.body.company.code)
        expect(response.body.invoice.company).toHaveProperty('name', company.body.company.name)
        expect(response.body.invoice.company).toHaveProperty('description', company.body.company.description)
    })
    test("Respond with 404 when invalid id provided", async () => {
        const response = await request(app).get(`/invoices/10000`);
        expect(response.statusCode).toBe(404)
    });
})
describe("GET /companies/:code", () => {
    test("Gets a singular company object by id", async () => {

        const response = await request(app).get(`/companies/${testCompanies[0].code}`)
        expect(response.statusCode).toBe(200);
        expect(response.body.company).toBeInstanceOf(Object);
        expect(response.body.company).toHaveProperty('code', testCompanies[0].code);
        expect(response.body.company).toHaveProperty('name', testCompanies[0].name)
        expect(response.body.company).toHaveProperty('description', testCompanies[0].description)
        
    })
    test("Respond with 404 when invalid id provided", async () => {
        const response = await request(app).get(`/companies/10000`);
        expect(response.statusCode).toBe(404)
    });
})

describe("POST /invoices", () => {
    test("Add an invoice", async () => {
        const response = await request(app).post('/invoices').send({comp_code: "apple", amt: 50});
        expect(response.statusCode).toBe(201);
        expect(response.body).toBeInstanceOf(Object);
        expect(response.body.invoice).toHaveProperty('comp_code', 'apple')
        expect(response.body.invoice).toHaveProperty('amt', 50);
        expect(response.body.invoice).toHaveProperty('add_date');
        expect(response.body.invoice).toHaveProperty('id');
        expect(response.body.invoice).toHaveProperty('paid_date', null);
        expect(response.body.invoice).toHaveProperty('paid', false);
    })
    test("Throw error if no comp_code or amt provided", async () => {
        const response = await request(app).post('/invoices');
        expect(response.statusCode).toBe(500);

    })
})

describe("POST /companies", () => {
    test("Add a company", async () => {
        const response = await request(app).post('/companies').send({name: "Testing", description: "This is a test"});
        expect(response.statusCode).toBe(201);
        expect(response.body).toBeInstanceOf(Object);
        expect(response.body.company).toHaveProperty('name', 'Testing')
        expect(response.body.company).toHaveProperty('description', 'This is a test')
    })
    test("Throw error if no name or description provided", async () => {
        const response = await request(app).post('/companies');
        expect(response.statusCode).toBe(500); 
    })
})

describe("PUT /invoices/:id", () => {
    test("Update an invoice amt and set paid to true", async () => {
        const response = await request(app).put(`/invoices/${testInvoice.id}`).send({"amt": "5", "paid": "true"});
        expect(response.statusCode).toBe(200);
        expect(response.body.invoice).toHaveProperty('amt', 5);
        expect(response.body.invoice).toHaveProperty('paid', true);
        expect(response.body.invoice.paid_date).toBeTruthy;

    })
    test("Update an invoice amt and set paid to false", async () => {
        const response = await request(app).put(`/invoices/${testInvoice.id}`).send({"amt": "5", "paid": "false"});
        expect(response.statusCode).toBe(200);
        expect(response.body.invoice).toHaveProperty('amt', 5);
        expect(response.body.invoice).toHaveProperty('paid', false);
        expect(response.body.invoice.paid_date).toBeNull;

    })
    
    test("Throw error if amt not provided", async () => {
        const response = await request(app).put(`/invoices/${testInvoice.id}`).send({"paid": "false"});
        expect(response.statusCode).toBe(500);
    })
    test("Throw error if paid not provided", async () => {
        const response = await request(app).put(`/invoices/${testInvoice.id}`).send({"amt": "5"});
        expect(response.statusCode).toBe(500);
    })
    test("Throw error if amt is NaN", async () => {
        const response = await request(app).put(`/invoices/${testInvoice.id}`).send({"amt": "test", "paid": "false"});
        expect(response.statusCode).toBe(500);
        expect(response.body).toHaveProperty('error')
    })
    test("Throw error if paid is not true/false", async () => {
        const response = await request(app).put(`/invoices/${testInvoice.id}`).send({"amt": "5", "paid": "test"});
        expect(response.statusCode).toBe(500);
        expect(response.body).toHaveProperty('error')
    })
})