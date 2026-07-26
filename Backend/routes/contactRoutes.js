const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { addContact, getContacts, deleteContact } = require('../controllers/contactController');

router.post('/', verifyToken, addContact);
router.get('/', verifyToken, getContacts);
router.delete('/:contactId', verifyToken, deleteContact);

module.exports = router;
