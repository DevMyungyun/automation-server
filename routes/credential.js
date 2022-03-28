const express = require('express');
const router = express.Router();
const rsa = require('node-rsa');
const db = require('../db/db.js');
const addslashes = require('../db/addslashes.js');

const credBuilder = require('../dto/credBuilder');
const sql = require('../db/sql/credentialSql.js');

const conf = require('../config.js');
const key = new rsa(conf.rsa);

// Post credential (Insert)
router.post('/', (req, res, next) => {
	// let vname = req.body.name ? addslashes(req.body.name) : "";
	// let vcontent = req.body.content ? addslashes(req.body.content) : "";
	// let vmid = req.body.mid ? addslashes(req.body.mid) : "";
	// let vmpw = req.body.mpw ? addslashes(req.body.mpw) : "";
	// let vtype = req.body.type ? addslashes(req.body.type) : "";
	// let vpk = req.body.private_key ? addslashes(req.body.private_key) : "";
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

	encryptedPw = key.encrypt(dto.mpw, 'base64');
	encryptePK = key.encrypt(dto.private_key, 'base64');

	console.log(dto);
	db.iquery(sql.post(), [dto.name, dto.content, dto.mid
							, encryptedPw, encryptePK, dto.type], (err, rows) => {
		if (err) {
			return next(err);
		}
		delete body.mpw;
		res.json(db.resultMsg('200'[0], body));
	});
});

/* PUT credential (Update) */
router.put('/', (req, res, next) => {
	// let vname = req.query.name ? addslashes(req.query.name) : "";
	// let vcontent = req.body.content ? addslashes(req.body.content) : "";
	// let vmid = req.body.mid ? addslashes(req.body.mid) : "";
	// let vmpw = req.body.mpw ? addslashes(req.body.mpw) : "";
	// let vpk = req.body.private_key ? addslashes(req.body.private_key) : "";
	let encryptedPw = '';
	let encryptePK = '';

	const body = req.body;
	const dto = new credBuilder().setName(req.query.name)
								.setContent(body.content)
								.setMid(body.mid)
								.setMpw(body.mpw)
								.setType(body.type)
								.setPrivate_key(body.private_key)
								.build();

	if(dto.mpw) encryptedPw = key.encrypt(dto.mpw, 'base64');
	if(dto.private_key)	encryptePK = key.encrypt(dto.private_key, 'base64');

	db.iquery(sql.update(encryptedPw, encryptePK), [dto.content, dto.mid
							, dto.type, dto.name], (err, rows) => {
		if (err) {
			return next(err);
		}
		res.json(db.resultMsg('200'[0], req.body));
	});
});

/* DELETE credential (delete) */
router.delete('/', (req, res, next) => {
	let name = req.query.name ? addslashes(req.query.name) : "";

	db.iquery(sql.delete(), [name], (err, rows) => {
		if (err) {
			return next(err);
		}
		res.json(db.resultMsg('200'[0], req.body));
	});

});

/* GET Credential (SELECT ONE) */
router.get('/o', (req, res, next) => {
	let name = req.query.name ? addslashes(req.query.name) : "";

	db.iquery(sql.getOneRow(), [name], (err, rows) => {
		if (err) {
			return next(err);
		}
		
		res.json(db.resultMsg('200'[0], rows.rows[0]));

	});
});

/* GET Credential listing. */
router.get('/', (req, res, next) => {
	let data = {};
	let page = req.query.page ? addslashes(req.query.page) : "";
	let pageSize = req.query.pageSize ? addslashes(req.query.pageSize) : "";
	let name = req.query.name ? addslashes(req.query.name) : "";

	if (page == "" || page < 1) {
		page = 1;
	}
	if (pageSize == "" || pageSize < 1) {
		pageSize = 15;
	}
	let start = (page - 1) * pageSize;

	db.iquery(sql.getList(name), [pageSize, start], (err, rows) => {
		if (err) {
			return next(err);
		}

		totalCount(req).then((result) => {
			data['rowCount'] = rows.rowCount;
			data['totalCount'] = result;
			data['page'] = page;
			data['pageSize'] = pageSize;
			data['list'] = rows.rows;

			res.json(db.resultMsg('200'[0], data));
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
			// console.log("total func: " + rows.rows[0].total);
			resolve(rows.rows[0].total);

		});
	});
}

module.exports = router;