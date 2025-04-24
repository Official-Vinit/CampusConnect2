const mongoose = require("mongoose");
const Post = require("../models/post.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/campusconnect2";

main()
  .then(() => {
    console.log("Connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);

  const samplePosts = [
    {
      caption: "Sunset views after a long hike 🌄",
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
      upvotes: 42,
      downvotes: 3,
      comments: [
        {
          text: "Wow, this looks like a painting!",
          author: "alex_m",
          reactions: [
            {
              love: 5,
              laugh: 1,
              wow: 4,
              like: 8
            }
          ],
          replies: [
            {
              text: "Right? It’s unreal!",
              author: "jessica22"
            },
            {
              text: "Nature at its best.",
              author: "dev_traveler"
            }
          ]
        },
        {
          text: "Which trail is this?",
          author: "wanderer_x",
          reactions: [
            {
              love: 2,
              laugh: 0,
              wow: 1,
              like: 3
            }
          ],
          replies: [
            {
              text: "This is Bear Lake Trail in Colorado!",
              author: "alex_m"
            }
          ]
        }
      ]
    },
    {
      caption: "Throwback to our coding bootcamp 👩‍💻👨‍💻",
      image: "", // will fallback to default
      upvotes: 17,
      downvotes: 1,
      comments: [
        {
          text: "Miss those intense sessions 😅",
          author: "code_cruncher",
          reactions: [
            {
              love: 3,
              laugh: 2,
              wow: 0,
              like: 4
            }
          ],
          replies: [
            {
              text: "And all the caffeine 😂",
              author: "debug_dude"
            }
          ]
        }
      ]
    },
    {
      caption: "Launched my first portfolio website 🎉",
      image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
      upvotes: 53,
      downvotes: 0,
      comments: [
        {
          text: "Congrats! Drop the link 🔗",
          author: "frontend_girl",
          reactions: [
            {
              love: 4,
              laugh: 0,
              wow: 2,
              like: 6
            }
          ],
          replies: [
            {
              text: "Thanks! Here it is: www.myportfolio.com",
              author: "web_dev_max"
            }
          ]
        }
      ]
    }
  ];

  await Post.deleteMany({})
  
  await Post.insertMany(samplePosts);
  console.log("Data inserted successfully");
}