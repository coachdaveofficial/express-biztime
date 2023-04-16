const express = require("express");
const ExpressError = require("../expressError")
const router = new express.Router();
const db = require("../db");
const slugify = require("slugify")

router.get('/', async (req, res, next) => {
    try {
        const results = await db.query("SELECT code, name FROM companies");
        return res.json({companies: results.rows })
    } catch (e) {
        return next(e)
    }
});

router.get('/:code', async (req, res, next) => {
    try {
        const { code } = req.params;
        const compResults = await db.query('SELECT * FROM companies WHERE code = $1', [code])
        const invResults = await db.query('SELECT id FROM invoices WHERE comp_code = $1', [code])
        const indResults = await db.query('SELECT ind_code FROM industries_companies WHERE comp_code = $1', [code])
        if (!compResults.rows.length) {
            throw new ExpressError(`Can't find company with code of ${code}`, 404)
        }
        const company = compResults.rows[0];
        const invoices = invResults.rows;
        const industries = indResults.rows;
        company.invoices = invoices.map(inv => inv.id);
        company.industries = industries.map(ind => ind.ind_code)

        return res.json({ company: company })
    } catch (e) {
        return next(e)
    }
});

router.post('/', async (req, res, next) => {
    try {
        const {name, description } = req.body;
        const results = await db.query('INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING code, name, description', [slugify(name, {remove: /[*+~.()'"!:@]/g, lower: true}), name, description]);
        return res.status(201).json({ company: results.rows[0]}) 
    } catch (e) {
        return next(e)
    }
});

router.put('/:code', async (req, res, next) => {
    try {
        const {code} = req.params;
        const {name, description} = req.body;
        const results = await db.query('UPDATE companies SET name=$1, description=$2 WHERE code=$3 RETURNING code, name, description', [name, description, code])
        if (!results.rows.length) {
            throw new ExpressError(`Can't update company with code of ${code}`, 404)
        }
        return res.json({ company: results.rows[0]})
    } catch (e) {
        return next(e)
    }
})

router.delete('/:code', async (req, res, next) => {
    try {
        const results = db.query('DELETE FROM companies WHERE code = $1', [req.params.code])
        return res.json({ msg: "DELETED"})
    } catch (e) {
        return next(e)
    }
})

module.exports = router;