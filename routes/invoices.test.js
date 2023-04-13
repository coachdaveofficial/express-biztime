process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../app');
const db = require('../db');

let testInvoice;
let testCompanies;
beforeEach(async () => {
    const compResult = await db.query(`INSERT INTO companies (code, name, description) VALUES ('apple', 'Apple Computer', 'Maker of OSX.'), ('ibm', 'IBM', 'Big blue.') 
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

        let namesAndCodes = [];
        for (let obj of testCompanies) {
            namesAndCodes.push({code: obj.code, name: obj.name})
        };
        const response = await request(app).get('/companies');
        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Object);
        expect(response.body).toEqual({
            companies: namesAndCodes
        })
    })
})