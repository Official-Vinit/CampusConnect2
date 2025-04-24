const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = new Schema({
    author:{
        type: String
    },
    authorId: {
        type: String, // Author's user ID
    },
    caption: {    
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 100
    },
    image: { type: String, 
        default:"https://img.freepik.com/free-photo/lone-tree_181624-46361.jpg?t=st=1743673444~exp=1743677044~hmac=2736bacbadd43d6d760c6d47966225bb0feeec0a308cc74ec1484ca93b2c50c1&w=1380",
        set:(v)=>v===""?
        "https://img.freepik.com/free-photo/lone-tree_181624-46361.jpg?t=st=1743673444~exp=1743677044~hmac=2736bacbadd43d6d760c6d47966225bb0feeec0a308cc74ec1484ca93b2c50c1&w=1380"
        :v },
    upvotes: { 
        type: Number,
        default: 0
    },
    downvotes: { 
        type: Number,
        default: 0
    },
    createdAt: { 
        type: Date,
        default: Date.now
    },
    votedBy: [
        {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    ], 
    comments: [
        {
            text: {
                type: String,
                trim: true
            },
            author: {
                type: String,
                // required: true,
                trim: true
            },
            createdAt: {
                type: Date,
                default: Date.now
            },
            reactions: [
                {
                    love: {
                        type: Number,
                        default: 0
                    },
                    laugh: {
                        type: Number,
                        default: 0
                    },
                    wow: {
                        type: Number,
                        default: 0
                    },
                    like: {
                        type: Number,
                        default: 0
                    }
                }
            ],
            replies: [
                {
                    text: String,
                    author: String,
                    createdAt: { type: Date, default: Date.now }
                }
            ],
        }
    ],

});

module.exports = mongoose.model('Post', postSchema);