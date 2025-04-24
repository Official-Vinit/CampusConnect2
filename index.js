const express = require('express')
const app = express();
const engine = require('ejs-mate')

const path = require("path");
app.set("views",path.join(__dirname,"views"));
app.set("view engine","ejs");
app.engine('ejs', engine);


app.use(express.static(path.join(__dirname,"public")))
app.use(express.urlencoded({ extended: true }));

const methodOverride = require('method-override');
app.use(methodOverride('_method'));

const mongoose = require('mongoose');
const Post = require('./models/post.js')
const User = require('./models/user.js')
const Poll = require('./models/poll.js')
const session = require('express-session');
const flash = require('connect-flash');


const sessionOptions = {
    secret: "mysupersecretstring",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 1000 * 60 * 60 * 24, // 1 day
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}

app.use(session(sessionOptions));
app.use(flash());

app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});


main()
.then(()=>{
    console.log("Connected to MongoDB successfully");
})
.catch(err=>{
    console.log(err)
});

async function main() {
    await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
}
// async function main() {
//     await mongoose.connect("mongodb://127.0.0.1:27017/campusconnect2");
// }

const multer = require('multer');

// Set up storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });





//home route
app.get('/',(req,res)=>{
res.render("home.ejs",{msg:res.locals.success})
});

//login route
app.get('/login',(req,res)=>{
    res.render("login.ejs")
});



//register route
app.get('/register',(req,res)=>{
    res.render("register.ejs")
});

// Register route
app.post('/register', upload.single('photo'), async (req, res) => {
    const { role, name, email, password } = req.body;

    try {
        // Check if a photo was uploaded
        let photoPath = '/images/default-profile.png'; // Default placeholder image
        if (req.file) {
            photoPath = `/uploads/${req.file.filename}`; // Path to the uploaded photo
        }

        // Create a new user
        const user = new User({
            role,
            name,
            email,
            password,
            photo: photoPath
        });

        await user.save();
        console.log(user);
        res.redirect(`/posts?user=${user._id}`);  // Pass user ID via query param
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred during registration");
    }
});

// Login route
app.post('/login', async (req, res) => {
    let { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.send("User not found");
    }
    if (user.password !== password) {
        return res.send("Incorrect password");
    }
    req.flash("success", "Login successful!");
    res.redirect(`/posts?user=${user._id}`);  // Pass user ID via query param
});

//posts route
app.get('/posts', async (req, res) => {
    //console.log(req.flash("success"))
    const userId = req.query.user;

    if (!userId) {
        return res.send("User ID not provided");
    }

    const user = await User.findById(userId);

    if (!user) {
        return res.send("User not found");
    }

    try {
        // Fetch posts and polls
        const posts = await Post.find({}).lean();
        const polls = await Poll.find({}).lean();

        // Add a type field to distinguish between posts and polls
        posts.forEach(post => post.type = 'post');
        polls.forEach(poll => poll.type = 'poll');

        // Merge and sort by creation date
        const combined = [...posts, ...polls].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.render("posts.ejs", { combined, user ,msg:res.locals.success});
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while fetching posts and polls");
    }
});

app.get('/posts', async (req, res) => {
    // Sort posts in descending order by createdAt date
    const posts = await Post.find({}).sort({ createdAt: -1 });
    const userId = req.query.user;
    
    if (!userId) {
        return res.send("User ID not provided");
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
        return res.send("User not found");
    }
    
    res.render("posts.ejs", { posts, user });
});


//new get
app.get('/posts/:id/new', async(req, res) => {
    let{id} = req.params;
    const user = await User.findById(id);
    res.render("newpost.ejs",{user})
});

app.get('/polls/:id/new',async(req,res)=>{
    let{id} = req.params;
    const user = await User.findById(id);
    res.render("newPoll.ejs",{user});
} )

app.post('/polls/:userId/new', async (req, res) => {
    const { userId } = req.params;
    const { question, options } = req.body;

    try {
        const poll = new Poll({
            question,
            options: options.map(option => ({ text: option })), // Map options to the schema format
            createdBy: userId
        });
        await poll.save();
        res.redirect(`/posts?user=${userId}`); // Redirect to the polls page
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while creating the poll");
    }
});

// Vote on a poll
app.post('/polls/:userId/vote/:pollId', async (req, res) => {
    const { userId,pollId } = req.params;
    const { vote } = req.body; // Get the selected option from the request body

    try {
        const poll = await Poll.findById(pollId);

        if (poll) {
            // Check if the user has already voted
            if (poll.votedBy.includes(userId)) {
                req.flash("success", "You have already voted.");
                return res.redirect(`/posts?user=${userId}`); // Redirect back to the posts page
            }

            // Find the selected option and increment its vote count
            const option = poll.options.find(opt => opt.text === vote);
            if (option) {
                option.votes += 1;
                poll.votedBy.push(userId); // Add the user ID to the votedBy array
                await poll.save();
            }
        }
        res.redirect(`/posts?user=${userId}`); // Redirect back to the posts page
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while voting on the poll");
    }
});



app.post('/posts/:id/new', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { caption } = req.body;
    const user = await User.findById(id);
  
    let imagePath = '';
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`; // relative to public folder
    }
  
    const post = new Post({
      caption,
      image: imagePath,
      author: user.name,
      authorId: id
    });
  
    await post.save();
    user.posts.push(post._id);
    await user.save();
  
    res.redirect(`/posts?user=${user._id}`);
  });
  


//my post route
app.get('/posts/:id/mypost',async(req,res)=>{
    let {id} = req.params;
    const user = await User.findById(id).populate("posts");
    console.log(user.posts)
     res.render("myPosts.ejs",{user});
});

app.delete('/posts/:userId/:postId', async (req, res) => {
    const { userId, postId } = req.params;

    // 1. Delete the post
    await Post.findByIdAndDelete(postId);

    // 2. Remove post reference from user
    await User.findByIdAndUpdate(userId, { $pull: { posts: postId } });

    res.redirect(`/posts/${userId}/mypost`);
});

//edit post route
app.get('/posts/:userid/:postid/edit',async (req,res)=>{
    const {userid,postid} = req.params;
    const user = await User.findById(userid);
    const post = await Post.findById(postid);
    res.render("editPost.ejs",{user,post})
})

    // Update post route
app.put('/posts/:userid/:postid', async (req, res) => {
    const { userid, postid } = req.params;
    const { caption, image } = req.body;

    await Post.findByIdAndUpdate(postid, { caption, image });
    res.redirect(`/posts?user=${userid}`);
});

//logout route
app.get('/logout', (req, res) => {
    // If you're using sessions, destroy it like this:
    // req.session.destroy();

    // For now, just redirect to home or login page
    res.redirect('/'); // or '/' based on your app structure
});


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
    const { postid, userid } = req.params;

    try {
        const post = await Post.findById(postid);

        if (post) {
            // Check if the user has already upvoted
            if (post.votedBy.includes(userid)) {
                req.flash("success", "You have already voted this post.");
                return res.redirect(`/posts?user=${userid}`); // Redirect back to the posts page
            }

            // Increment the upvote count and add the user to the votedBy array
            post.upvotes += 1;
            post.votedBy.push(userid);
            await post.save();
        }

        res.redirect(`/posts?user=${userid}`); // Redirect back to the posts page
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while upvoting the post");
    }
});

// Downvote a post
app.post('/posts/:postid/:userid/downvote', async (req, res) => {
    const { postid, userid } = req.params;

    try {
        const post = await Post.findById(postid);

        if (post) {
            // Check if the user has already upvoted
            if (post.votedBy.includes(userid)) {
                req.flash("success", "You have already voted this post.");
                return res.redirect(`/posts?user=${userid}`); // Redirect back to the posts page
            }

            // Increment the upvote count and add the user to the votedBy array
            post.downvotes += 1;
            post.votedBy.push(userid);
            await post.save();
        }

        res.redirect(`/posts?user=${userid}`); // Redirect back to the posts page
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while upvoting the post");
    }
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
    res.redirect(`/posts?user=${userid}`); // Redirect to the same page
});


//delete a comment
app.delete('/posts/:postid/:userid/comment/:commentid', async (req, res) => {
    const { postid, userid, commentid } = req.params;
    const post = await Post.findById(postid);
    if (post) {
        post.comments = post.comments.filter(comment => comment._id.toString() !== commentid);
        await post.save();
    }
    res.redirect(`/posts?user=${userid}`); // Redirect to the same page
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

    res.redirect(`/posts?user=${userid}`); // Redirect back to the posts page
});


// Add a reaction to a comment

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
        res.redirect(`/posts?user=${userid}`); // Redirect back to the posts page
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
        res.redirect(`/posts?user=${user._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while replying to the comment");
    }
});





// Follow a user

app.post('/users/:userId/follow/:authorId', async (req, res) => {
    const { userId, authorId } = req.params;

    try {
        // Find the author (user to be followed)
        const author = await User.findById(authorId);
        if (author) {
            author.followers += 1; // Increment the follower count
            await author.save();
        }
        res.redirect(`/posts?user=${userId}`); // Redirect back to the posts page
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while following the user");
    }
});


//favorites route
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
        res.redirect(`/posts?user=${user._id}`);; // Redirect back to the same page
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
});