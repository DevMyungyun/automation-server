const express = require('express');
const router = express.Router();
const rsa = require('node-rsa');
const db = require('../db/db.js');
const addslashes = require('../db/addslashes.js');

const credBuilder = require('../dto/credBuilder');
const sql = require('../db/sql/credentialSql.js');

const conf = require('../config.js');
const key = new rsa(conf.rsa);
const encodeType = 'base64';

// Post credential (Insert)
router.post('/', (req, res, next) => {
	let encryptedPw = '';
	let encryptePK = '';

	const body = req.body;
	const dto = new credBuilder().setName(body.name)
								.setContent(body.content)
								.setMid(body.mid)
								.setMpw(body.mpw)
								.setType(body.type)
								.setPrivate_key(body.private_key)
								.build();

	encryptedPw = key.encrypt(dto.mpw, encodeType);
	encryptePK = key.encrypt(dto.private_key, encodeType);

	db.query(sql.post(), [dto.name, dto.content, dto.mid
							, encryptedPw, encryptePK, dto.type], (err, rows) => {
		if (err) {
			return next(err);
		}
		delete body.mpw;
		res.json(db.resultMsg('a001', body));
	});
});

/* PUT credential (Update) */
router.put('/:name', (req, res, next) => {
	let encryptedPw = '';
	let encryptePK = '';

	const body = req.body;
	const dto = new credBuilder().setName(req.params.name)
								.setContent(body.content)
								.setMid(body.mid)
								.setMpw(body.mpw)
								.setType(body.type)
								.setPrivate_key(body.private_key)
								.build();

	if(dto.mpw) encryptedPw = key.encrypt(dto.mpw, encodeType);
	if(dto.private_key)	encryptePK = key.encrypt(dto.private_key, encodeType);

	db.query(sql.update(encryptedPw, encryptePK), [dto.content, dto.mid
							, dto.type, dto.name], (err) => {
		if (err) return next(err);
		res.json(db.resultMsg('a001', req.body));
	});
});

/* DELETE credential (delete) */
router.delete('/:name', (req, res, next) => {
	let name = req.params.name ? addslashes(req.params.name) : '';

	db.query(sql.delete(), [name], (err, rows) => {
		if (err) {
			return next(err);
		}
		res.json(db.resultMsg('a001', req.body));
	});

});

/* GET Credential (SELECT ONE) */
router.get('/:name', (req, res, next) => {
	let code = 'a001';
	const name = req.params.name ? addslashes(req.params.name) : '';

	db.query(sql.getOneRow(), [name], (err, rows) => {
		if (err) return next(err);
		if (rows.rowCount === 0 ) code = 'a003'
		
		res.json(db.resultMsg(code, rows.rows));

	});
});

/* GET Credential listing. */
router.get('/', (req, res, next) => {
	let data = {};
	const page = req.query.page ? addslashes(req.query.page) : "";
	const pageSize = req.query.pageSize ? addslashes(req.query.pageSize) : "";
	const name = req.query.name ? addslashes(req.query.name) : "";

	if (page == "" || page < 1) {
		page = 1;
	}
	if (pageSize == "" || pageSize < 1) {
		pageSize = 15;
	}
	const start = (page - 1) * pageSize

	db.query(sql.getList(name), [pageSize, start], (err, rows) => {
		if (err) return next(err);

		totalCount(req).then((result) => {
			data['rowCount'] = rows.rowCount;
			data['totalCount'] = result;
			data['page'] = page;
			data['pageSize'] = pageSize;
			data['list'] = rows.rows;

			res.json(db.resultMsg('a001', data));
		}).catch((err) => {
			if (err) {
				console.error(err);
			}
		});
	});
});


function totalCount(req) {
	let data = {};
	let vname = req.query.name ? addslashes(req.query.name) : "";

	let stringQuery = sql.totalCount(vname)

	return new Promise((resolve, reject) => {
		db.query(stringQuery, [], (err, rows) => {
			if (err) {
				return reject(err);
			}
			resolve(rows.rows[0].total);

		});
	});
}

module.exports = router;