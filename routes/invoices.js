const express = require("express");
const ExpressError = require("../expressError")
const router = express.Router();
const db = require("../db");


router.get('/', async (req, res, next) => {
    try {
        const results = await db.query('SELECT * FROM invoices');
        return res.json({invoices: results.rows})
    } catch (e) {
        return next(e)
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const results = await db.query(`SELECT * FROM invoices JOIN companies ON comp_code = companies.code WHERE id = $1 `, [id])
        if (!results.rows.length) {
            throw new ExpressError(`Can't find invoice with id ${id}`, 404)
        }
        const {amt, paid, add_date, paid_date, code, name, description} = results.rows[0];
        return res.json({ invoice: {
                                    id: id,
                                    comp_code: code,
                                    amt: amt,
                                    add_date: add_date,
                                    paid_date: paid_date,
                                    company: {
                                        code: code,
                                        name: name,
                                        description: description
                                        }  
                                    }
                        })
    } catch (e) {
        return next(e)
    }
})

router.post('/', async (req, res, next) => {
    try {
        const { comp_code, amt } = req.body;
        const results = await db.query('INSERT INTO invoices (comp_code, amt) VALUES ($1, $2) RETURNING id, comp_code, amt, paid, add_date, paid_date', [comp_code, amt])
        return res.status(201).json({invoice: results.rows[0] })
    } catch (e) {
        return next(e)
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        let results;
        const {id} = req.params;
        const {amt, paid} = req.body;
        const invoice = await db.query('SELECT id FROM invoices WHERE id = $1', [id]);
        if (!invoice.rows) {
            throw new ExpressError(`Can't find invoice with id of ${id}`, 404)
        }
        if (paid.toLowerCase() === 'true') {
            let paid_date = new Date(Date.now());
            results = await db.query(
                `UPDATE invoices SET amt=$1, paid=$2, paid_date=$3
                    WHERE id = $4
                    RETURNING id, comp_code, amt, paid, add_date, paid_date`,
                [amt, paid, paid_date, id]
                );
            return res.json({ invoice: results.rows[0] })
        }
        results = await db.query(
            `UPDATE invoices SET amt=$1, paid=$2, paid_date=$3
                WHERE id = $4
                RETURNING id, comp_code, amt, paid, add_date, paid_date`,
            [amt || 0, paid, null, id]
            );
        return res.json({ invoice: results.rows[0] })

    } catch (e) {
        return next(e)
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        const results = db.query("DELETE FROM invoices WHERE id = $1", [req.params.id])
        return res.json({status: "DELETED"})
    } catch (e) {
        return next(e)
    }
})


module.exports = router;