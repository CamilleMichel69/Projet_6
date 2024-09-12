const Book = require('../models/book');

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

exports.getBestRating = (req, res, next) => {
    Book.find()
    .then(books => {
        // Trier les livres par note moyenne descendante
        const sortedBooks = books.sort((a, b) => b.averageRating - a.averageRating);
        // Renvoyer seulement les 3 premiers livres
        res.status(200).json(sortedBooks.slice(0, 3));
    })
    .catch(error => res.status(400).json({ error }));
};

exports.createBook = (req, res, next) => {
    delete req.body.userId;
    const book = new Book({
        ...req.body
    });
    book.save()
    .then(() => res.status(201).json({message: 'Livre enregistré !'}))
    .catch(error => res.status(400).json({error}));
};

exports.modifyBook = (req, res, next) => {
    Book.updateOne({ _id: req.params.id }, { ...req.body, _id: req.params.id })
      .then(() => res.status(200).json({ message: 'Livre modifié !'}))
      .catch(error => res.status(400).json({ error }));
};

exports.deleteBook = (req, res, next) => {
    Book.deleteOne({ _id: req.params.id })
      .then(() => res.status(200).json({ message: 'Livre supprimé !'}))
      .catch(error => res.status(400).json({ error }));
};

exports.createRating = (req, res, next) => {
    const { userId, rating } = req.body;

    // Vérifier que la note est valide (entre 0 et 5)
    if (rating < 0 || rating > 5) {
        return res.status(400).json({ message: "La note doit être comprise entre 0 et 5." });
    }

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
        book.ratings.push({ userId, rating });

        // Calculer la nouvelle note moyenne
        const totalRatings = book.ratings.length;
        const averageRating = book.ratings.reduce((acc, curr) => acc + curr.rating, 0) / totalRatings;

        // Mettre à jour la note moyenne et sauvegarder le livre
        book.averageRating = averageRating;

        return book.save();
    })
    .then(updatedBook => res.status(200).json(updatedBook))
    .catch(error => res.status(400).json({ error }));
};

