const express = require('express')
const app = express();

const path = require("path");
app.set("views",path.join(__dirname,"views"));
app.set("view engine","ejs");
app.use(express.static(path.join(__dirname,"public")))
app.use(express.urlencoded({ extended: true }));

const ejsMate = require("ejs-mate");
app.engine("ejs", ejsMate);

const methodOverride = require('method-override');
app.use(methodOverride('_method'));

const mongoose = require('mongoose');
const Post = require('./models/post.js')
const User = require('./models/user.js')

async function main() {
    await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then(() => {
        console.log("Connected to MongoDB Atlas");
    }).catch(err => {
        console.error("Error connecting to MongoDB Atlas:", err);
    });
}

main();

//home route
app.get('/',(req,res)=>{
    res.render("index.ejs")
})

//login route
app.get('/login',(req,res)=>{
    res.render("login.ejs")
})

app.post('/login',async (req,res)=>{
    const{email,password} = req.body;
    const user = await User.findOne({email: email});
    if(!user){
        return res.send("User not registered")
    }
    if(user.password !== password){
        return res.send("Incorrect Password")
    }
    console.log(user._id)
    res.redirect(`/posts?userId=${user._id}`)
})

//register route
app.get('/register',(req,res)=>{
    res.render("register.ejs")
})

//register user
app.post('/register',async (req,res)=>{
    const {name,email,password,role} = req.body;
    const user = new User({role,name,email,password});
    await user.save();
    res.redirect(`/posts?userId=${user._id}`)
})

//post route
app.get('/posts',async (req,res)=>{
    const {userId} = req.query;
    const user = await User.findById(userId);
    console.log(userId)
    const posts = await Post.find({});
    res.render("posts.ejs",{posts,user})
})

//new post route
app.get('/posts/:id/new',async(req,res)=>{
    const {id} = req.params;
    const user = await User.findById(id);
    res.render("newPost.ejs",{user})
})

app.post('/posts/:id/new', async (req, res) => {
    const { id } = req.params;
    const { caption, image } = req.body;
    const user = await User.findById(id);
  
    const post = new Post({
      caption,
      image,
      author: user.name ,// Set the author's name
      authorId: id
    });
  
    await post.save();
    user.posts.push(post._id);
    await user.save();
  
    res.redirect(`/posts?userId=${user._id}`);
  });

//my posts route
app.get('/posts/:id/myPost',async (req,res)=>{
    const {id} = req.params;
    const user = await User.findById(id).populate('posts');
    console.log(user.posts)
    res.render("myPosts.ejs",{user})
})   

//delete post route
app.delete('/posts/:userid/:postid',async (req,res)=>{
    const {userid,postid} = req.params;
    await User.findByIdAndUpdate(userid,{$pull:{posts:postid}})
    await Post.findByIdAndDelete(postid);
    res.redirect(`/posts/${userid}/myposts`)
})

//edit post route
app.get('/posts/:userid/:postid/edit',async (req,res)=>{
    const {userid,postid} = req.params;
    const user = await User.findById(userid);
    const post = await Post.findById(postid);
    res.render("editPost.ejs",{user,post})
})

app.put('/posts/:userid/:postid', async (req, res) => {
    const { userid, postid } = req.params;
    const { caption, image } = req.body;
    let user =await User.findById(userid);
    await Post.findByIdAndUpdate(postid, { caption, image });
    res.redirect(`/posts?userId=${user._id}`);
});

//logout route
app.get('/logout',(req,res)=>{
    res.redirect('/')
})

// Delete user and their posts route
app.delete('/users/:userid', async (req, res) => {
    const { userid } = req.params;

    try {
        // Find the user
        const user = await User.findById(userid);
        if (!user) {
            return res.status(404).send("User not found");
        }

        // Delete all posts associated with the user
        await Post.deleteMany({ _id: { $in: user.posts } });

        // Delete the user
        await User.findByIdAndDelete(userid);

        res.redirect('/'); // Redirect to home or another page after deletion
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while deleting the user and their posts");
    }
});

// Upvote a post
app.post('/posts/:postid/:userid/upvote', async (req, res) => {
    const { postid,userid } = req.params;
    const post = await Post.findById(postid);
    if (post) {
        post.upvotes += 1;
        await post.save();
    }
    res.redirect(`/posts?userId=${userid}`); // Redirect to the same page
});

// Downvote a post
app.post('/posts/:postid/:userid/downvote', async (req, res) => {
    const { postid,userid } = req.params;
    const post = await Post.findById(postid);
    if (post) {
        post.downvotes += 1;
        await post.save();
    }
    res.redirect(`/posts?userId=${userid}`); // Redirect to the same page
});

// Add a comment to a post
app.post('/posts/:postid/:userid/comment', async (req, res) => {
    const { postid,userid } = req.params;
    const { text } = req.body;
    const author = await User.findById(userid); 
    const post = await Post.findById(postid);
    if (post) {
        post.comments.push({ text, author: author.name });
        await post.save();
    }
    res.redirect(`/posts?userId=${userid}`); // Redirect to the same page
});

//delete a comment
app.delete('/posts/:postid/:userid/comment/:commentid', async (req, res) => {
    const { postid, userid, commentid } = req.params;
    const post = await Post.findById(postid);
    if (post) {
        post.comments = post.comments.filter(comment => comment._id.toString() !== commentid);
        await post.save();
    }
    res.redirect(`/posts?userId=${userid}`); // Redirect to the same page
});

// Edit a comment
app.put('/posts/:postid/:userid/comment/:commentid', async (req, res) => {
    const { postid, userid, commentid } = req.params;
    const { text } = req.body; // Get the updated comment text from the request body
    const post = await Post.findById(postid);

    if (post) {
        // Find the comment by ID and update its text
        const comment = post.comments.id(commentid);
        if (comment) {
            comment.text = text; // Update the comment text
            await post.save(); // Save the updated post
        }
    }

    res.redirect(`/posts?userId=${userid}`); // Redirect back to the posts page
});

//reacting to comment
app.post('/posts/:postid/comments/:commentid/react/:userid', async (req, res) => {
    const { postid, commentid, userid } = req.params;
    const { emoji } = req.body; // Get the emoji from the request body

    try {
        const post = await Post.findById(postid);
        if (post) {
            // Find the specific comment by its ID
            const comment = post.comments.id(commentid);
            if (comment) {
                // Initialize reactions if not already present
                if (!comment.reactions.length) {
                    comment.reactions.push({ love: 0, laugh: 0, wow: 0, like: 0 });
                }

                // Increment the count for the specified emoji
                comment.reactions[0][emoji] += 1;

                // Save the updated post
                await post.save();
            }
        }
        res.redirect(`/posts?userId=${userid}`); // Redirect back to the posts page
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while reacting to the comment");
    }
});

// Reply to a comment
app.post('/posts/:postid/comments/:commentid/reply/:userid', async (req, res) => {
    const { postid, commentid ,userid} = req.params;
    const { text } = req.body;
    const user = await User.findById(userid); 

    try {
        const post = await Post.findById(postid);
        if (post) {
            const comment = post.comments.id(commentid);
            if (comment) {
                // Add the reply to the comment
                comment.replies.push({
                    text,
                    author: user.name,
                    createdAt: new Date()
                });
                await post.save();
            }
        }
        res.redirect(`/posts?userId=${user._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while replying to the comment");
    }
});

// Add a post to favourites
app.post('/users/:userId/favourites/:postId', async (req, res) => {
    const { userId, postId } = req.params;

    try {
        const user = await User.findById(userId);
        if (user) {
            // Add the postId to the favourites array if it's not already there
            if (!user.favourites.includes(postId)) {
                user.favourites.push(postId);
                await user.save();
            }
        }
        res.redirect(`/posts?userId=${user._id}`);; // Redirect back to the same page
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while adding the post to favourites");
    }
});

// Show favourite posts
app.get('/users/:userId/favourites', async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findById(userId).populate('favourites'); // Populate favourite posts
        if (!user) {
            return res.status(404).send("User not found");
        }

        res.render('favourites.ejs', { user, favourites: user.favourites });
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while fetching favourite posts");
    }
});

app.listen(3000,()=>{
    console.log("Server started on port 3000")
})


