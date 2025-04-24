const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    role: {
        type: String,
        enum: ['student', 'teacher'],
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    photo:{
        type: String,
        default: 'https://res.cloudinary.com/dqj0xg3zv/image/upload/v1698236482/Default-Profile-Picture-1_1_oj4j5c.png'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    posts: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Post'
        }
    ],
    followers: { type: Number, default: 0 }, // Add this field
    favourites:[
        {
            type: Schema.Types.ObjectId,
            ref: 'Post'
        }
    ]
});


module.exports = mongoose.model('User', userSchema);