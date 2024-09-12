const express = require('express');
const auth = require('../middleware/auth');
const upload = require('../middleware/multer-config');
const router = express.Router();
const bookCtrl = require('../controllers/books');

router.get('/', bookCtrl.getAllBooks);
router.get('/:id', bookCtrl.getOneBook);
router.get('/bestrating', bookCtrl.getBestRating);
router.post('/', auth, upload, bookCtrl.createBook);
router.put('/:id', auth, bookCtrl.modifyBook);
router.delete('/:id', auth, bookCtrl.deleteBook);
router.post('/:id/rating', auth, bookCtrl.createRating);

module.exports = router;