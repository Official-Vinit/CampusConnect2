const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pollSchema = new Schema({
    question: {
        type: String,
        required: true,
        trim: true
    },
    options: [
        {
            text: { type: String, required: true },
            votes: { type: Number, default: 0 }
        }
    ],
    votedBy: [
        {
            type: Schema.Types.ObjectId,
            ref: 'User' // Reference to the User model
        }
    ],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Poll', pollSchema);