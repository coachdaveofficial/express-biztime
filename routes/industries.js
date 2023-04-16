const express = require("express");
const ExpressError = require("../expressError")
const router = new express.Router();
const db = require("../db");
const slugify = require("slugify");

router.get('/', async (req, res, next) => {
    try {
        const results = await db.query(
            `SELECT i.industry, c.code AS comp_code
             FROM industries AS i
             LEFT JOIN industries_companies AS ic
             ON i.code = ic.ind_code
             LEFT JOIN companies AS c
             ON ic.comp_code = c.code
            `
          );
        const groupedResults = results.rows.reduce((acc, { industry, comp_code }) => {
            if (!acc[industry]) {
              acc[industry] = [comp_code];
            } else {
              acc[industry].push(comp_code);
            }
            return acc;
          }, {});
        return res.json({industries: groupedResults })

    } catch (e) {
        return next(e)
    }
});

router.post('/', async (req, res, next) => {
    try {
        const {industry} = req.body;
        const results = await db.query('INSERT INTO industries VALUES ($1, $2) RETURNING code, industry', [slugify(industry, {remove: /[*+~.()'"!:@]/g, lower: true}), industry])
        return res.status(201).json({ industry: results.rows[0]}) 

    } catch (e) {
        return next(e)
    }
});

router.post('/:ind_code/companies', async (req, res, next) => {
    try {
        const comp_code = req.body.comp_code;
        const {ind_code} = req.params;
        const results = await db.query(`INSERT INTO industries_companies VALUES ($1, $2) RETURNING comp_code, ind_code`, [ind_code, comp_code])
        if (!results.rows[0]) {
            throw new ExpressError('Error creating association', 404)
        }
        return res.status(201.).json({message: `Associated ${results.rows[0].comp_code} with ${results.rows[0].ind_code}`});
    } catch(e) {
        return next(e);
    }
})


module.exports = router;