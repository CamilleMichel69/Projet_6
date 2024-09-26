const Book = require('../models/book');
const sharp = require('sharp');
const fs = require('fs');

exports.getAllBooks = (req, res, next) => {
    Book.find()
    .then(books => res.status(200).json(books))
    .catch(error => res.status(400).json({error}));
};

exports.getOneBook = (req, res, next) => {
    Book.findOne({ _id: req.params.id })
      .then(book => res.status(200).json(book))
      .catch(error => res.status(404).json({ error }));
};

exports.createBook = (req, res, next) => {
    const bookObject = JSON.parse(req.body.book);
    delete bookObject._id;
    delete bookObject._userId;

    const uploadedImagePath = req.file.path;
    const compressedImagePath = `images/compressed-${req.file.filename.split('.')[0]}.webp`;

    sharp(uploadedImagePath)
        .resize({ width: 206, height: 260 })
        .webp({ quality: 80 })
        .toFile(compressedImagePath)
        .then(() => {
            fs.unlink(uploadedImagePath, (err) => {
                if (err) {
                    console.error('Erreur lors de la suppression de l\'image originale :', err);
                } else {
                    console.log('Image originale supprimée avec succès');
                }
            });

            const book = new Book({
                ...bookObject,
                userId: req.auth.userId,
                imageUrl: `${req.protocol}://${req.get('host')}/${compressedImagePath}`,
                averageRating: bookObject.ratings[0]?.grade || 0
            });

            book.save()
                .then(() => res.status(201).json({ message: 'Livre enregistré avec succès !' }))
                .catch(error => res.status(400).json({ error }));
        })
        .catch(error => {
            console.error('Erreur lors de la compression de l\'image :', error);
            res.status(500).json({ error: 'Erreur lors de la compression de l\'image' });
        });
};

exports.modifyBook = (req, res, next) => {
    Book.findOne({ _id: req.params.id })
        .then((book) => {
            if (book.userId != req.auth.userId) {
                return res.status(401).json({ message: 'Not authorized' });
            }

            const bookObject = req.file ? {
                ...JSON.parse(req.body.book),
                imageUrl: `${req.protocol}://${req.get('host')}/images/compressed-${req.file.filename.split('.')[0]}.webp`
            } : { ...req.body };
            delete bookObject._userId;

            const handleBookUpdate = () => {
                Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id })
                    .then(() => res.status(200).json({ message: 'Livre modifié!' }))
                    .catch((error) => res.status(400).json({ error }));
            };

            if (req.file) {
                const uploadedImagePath = req.file.path;
                const compressedImagePath = `images/compressed-${req.file.filename.split('.')[0]}.webp`;

                // Compresser l'image et supprimer l'ancienne
                sharp(uploadedImagePath)
                    .resize({ width: 206, height: 260 })
                    .webp({ quality: 80 })
                    .toFile(compressedImagePath)
                    .then(() => {
                        fs.unlink(uploadedImagePath, (err) => {
                            if (err) {
                                console.error('Erreur lors de la suppression de l\'image originale :', err);
                            } else {
                                console.log('Image originale supprimée avec succès');
                            }
                        });
                        handleBookUpdate();
                    })
                    .catch((error) => {
                        console.error('Erreur lors de la compression de l\'image :', error);
                        res.status(500).json({ error: 'Erreur lors de la compression de l\'image' });
                    });
            } else {
                handleBookUpdate();
            }
        })
        .catch((error) => {
            res.status(400).json({ error });
        });
};


exports.deleteBook = (req, res, next) => {
    Book.findOne({ _id: req.params.id})
        .then(book => {
            if (book.userId != req.auth.userId) {
                res.status(401).json({message: 'Not authorized'});
            } else {
                const filename = book.imageUrl.split('/images/')[1];
                fs.unlink(`images/${filename}`, () => {
                    Book.deleteOne({_id: req.params.id})
                        .then(() => { res.status(200).json({message: 'Livre supprimé !'})})
                        .catch(error => res.status(401).json({ error }));
                });
            }
        })
        .catch( error => {
            res.status(500).json({ error });
        });
};

exports.getBestRating = (req, res, next) => {
    Book.find()
    .then(books => {
        const sortedBooks = books.sort((a, b) => b.averageRating - a.averageRating);
        res.status(200).json(sortedBooks.slice(0, 3));
    })
    .catch(error => res.status(400).json({ error }));
};


exports.createRating = (req, res, next) => {
    const { rating } = req.body;
    const userId = req.auth.userId;

    // Vérifier que la note est valide (entre 1 et 5)
    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "La note doit être comprise entre 1 et 5." });
    }

    // Chercher le livre par son ID
    Book.findOne({ _id: req.params.id })
        .then(book => {
            if (!book) {
                return res.status(404).json({ message: "Livre non trouvé." });
            }

            // Vérifier si l'utilisateur a déjà noté le livre
            const existingRating = book.ratings.find(r => r.userId === userId);
            if (existingRating) {
                return res.status(400).json({ message: "Vous avez déjà noté ce livre." });
            }

            // Ajouter la nouvelle note
            book.ratings.push({ userId, grade: rating });

            // Calculer la nouvelle note moyenne avec un chiffre après la virgule
            const totalRatings = book.ratings.length;
            const totalRatingSum = book.ratings.reduce((acc, curr) => acc + curr.grade, 0);
            book.averageRating = (totalRatingSum / totalRatings).toFixed(1);

            // Sauvegarder le livre avec la nouvelle note
            book.save()
                .then(updatedBook => res.status(200).json(updatedBook))
                .catch(error => res.status(400).json({ error }));
        })
        .catch(error => res.status(500).json({ error }));
};


