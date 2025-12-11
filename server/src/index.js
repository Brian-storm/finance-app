const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const session = require('express-session');

const PORT = process.env.PORT || 5000;  // Use Railway's PORT
const app = express();
const debug = 1;

async function connectMongoDB() {
  try {
    // ✅ CORRECT - Let Railway handle MongoDB connection
    // Railway automatically provides these environment variables
    const mongoURI = process.env.MONGO_URL || 
                     process.env.MONGODB_URI ||
                     process.env.DATABASE_URL;
    
    console.log('Connecting to MongoDB...');
    console.log('URI exists:', !!mongoURI);
    
    if (!mongoURI) {
      throw new Error('MongoDB connection string not found in environment variables');
    }
    
    // Add database name if not present
    // let connectionString = mongoURI;
    // if (!connectionString.includes('?') && !connectionString.endsWith('/')) {
    //   connectionString += '/';
    // }
    // if (!connectionString.includes('financeData')) {
    //   connectionString += 'financeData'; // Your database name
    // }
    
    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 10000,  // Increased timeout
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ MongoDB connected successfully');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    // Don't crash the app - retry logic can be added
  }
}
connectMongoDB();

// Optional: Add event listeners
mongoose.connection.on('error', err => console.error('MongoDB error:', err));
mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));


// CORS Configuration - ALWAYS ENABLE
const cors = require('cors');

// Configure CORS for both development and production
const corsOptions = {
  origin: function (origin, callback) {
    // Get allowed origins from environment variable
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : 
      [
        'http://localhost:3000',
        'https://financedatahk.netlify.app',
        'http://localhost:5000',  // Allow local backend testing
      ];
    
    // Also allow any Railway subdomain for testing
    const railwayPattern = /\.railway\.app$/;
    const netlifyPattern = /\.netlify\.app$/;
    
    // Allow: no origin, allowed origins, Railway domains, Netlify domains
    if (!origin || 
        allowedOrigins.includes(origin) || 
        railwayPattern.test(origin) || 
        netlifyPattern.test(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
// Handle preflight requests
app.options('/*paths', cors(corsOptions));


app.use(express.json());
app.use(cookieParser());

// Mongoose Models
// Model 1: Event
const EventSchema = mongoose.Schema({
    eventID: {
        type: Number,
        required: [true, "Name is required"],
    },
    location: {
        type: String,
        required: true,
    },
    quota: {
        type: Number,
        validate: {
            validator: function (value) {
                return value > 0;
            },
            message: () => "Please enter a valid quota",
        },
    },
});
const Event = mongoose.model("Event", EventSchema);

// Model 2: Location
const LocationSchema = mongoose.Schema({
    namee: {
        type: String,
    },
    namec: {
        type: String
    },
    latitude: {
        type: Number,
    },
    longitude: {
        type: Number,
    }
})
const Location = mongoose.model("Location", LocationSchema);

// Model 3: User
const UserSchema = mongoose.Schema({
    username: {
        type: String,
        required: [true, "Username is required"]
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    role: {
        type: String
    }
})
const User = mongoose.model("User", UserSchema);



// Upon Successful Opening of the database
db.once('open', function () {
    console.log("Connection is open...");

    // listen to port
    const server = app.listen(PORT);

})

// Static file
app.use(express.static(path.resolve(__dirname, '../public')));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 5,
        httpOnly: true,
    }
}));

// Keep your checkSession middleware as-is
const checkSession = (req, res, next) => {
    if (req.session && req.session.userId) {
        req.user = {
            userId: req.session.userId,
            username: req.session.username,
            role: req.session.role
        };
    }
    next();
};
app.use(checkSession);

// app.use(session({
//     secret: 'abc123',
//     resave: false,
//     rolling: true,
//     saveUninitialized: false,
//     cookie: { 
//         maxAge: 1000 * 60 * 5,  // 5 minutes
//         httpOnly: true,
//     }
// }));

// // Check Session
// const checkSession = (req, res, next) => {
//     if (req.session && req.session.userId) {
//         req.user = {
//             userId: req.session.userId,
//             username: req.session.username,
//             role: req.session.role
//         };
//     }
//     next();
// };
// app.use(checkSession);

// FetchXML - Fetch data from gov dataset XML link
async function FetchXML(req, res, next) {
    const eventUrl = "https://www.lcsd.gov.hk/datagovhk/event/events.xml";
    const venueUrl = "https://www.lcsd.gov.hk/datagovhk/event/venues.xml";

    try {
        console.log("Fetching data...");
        const venueResponse = await fetch(venueUrl);
        if (!venueResponse.ok) {
            throw new Error(`HTTP error! status: ${venueResponse.status}`);
        }
        console.log("Successfully fetched venue data");

        const eventResponse = await fetch(eventUrl);
        if (!eventResponse.ok) {
            throw new Error(`HTTP error! status: ${eventResponse.status}`);
        }
        console.log("Successfully fetched event data");

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });

        console.log("Parsing venue data...");
        const venueText = await venueResponse.text();
        const venueData = parser.parse(venueText);
        req.venueData = venueData.venues?.venue || [];

        console.log("Parsing event data...");
        const eventText = await eventResponse.text();
        const eventData = parser.parse(eventText);
        req.eventData = eventData.events?.event || [];

        // DEBUG: check what data we actually have
        if (debug) {
            console.log('Total venues:', req.venueData.length);
            console.log('First venue:', req.venueData[0]);
            console.log('First venue.id:', req.venueData[0]?.['@_id']);
            console.log('First event:', req.eventData[0]);
            console.log('First event.venueid:', req.eventData[0]?.venueid);
        }

        let venueEventsPairs = [];
        for (let venue of req.venueData) {
            let filteredEvents = req.eventData.filter((item) => venue['@_id'] === String(item.venueid));
            console.log(venue?.['@_id'], filteredEvents);
            if (filteredEvents.length >= 3) {
                venueEventsPairs.push({
                    venueID: venue['@_id'],
                    venueNameC: venue.venuec || "Unknown",
                    venueNameE: venue.venuee || "Unknown",
                    latitude: venue.latitude || null,
                    longitude: venue.longitude || null,

                    events: filteredEvents
                })
            }
        }
        req.venueEventsPairs = venueEventsPairs;
        console.log(`Found ${venueEventsPairs.length} venues with 3+ events`);
        next();

    } catch (error) {
        console.error('Error fetching XML:', error);
        res.status(500).json({ error: 'Failed to fetch events data' });
    }
}
app.use('/api/fetchEvents', FetchXML);  // use FetchXML to send the gov data to fronend for rendering



// Routes
app.get('/', (req, res) => {
    // Set Cookie
    res.cookie('visits', '0', {
        maxAge: '1000' + "0000000",
        expires: new Date(Date.now() + '3600000')
    });

    // Send index.html as response to render web page
    res.sendFile(path.resolve(__dirname, '../public/index.html'));
});

// Check Authentication
app.get('/api/check-auth', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            userId: req.session.userId,
            username: req.session.username,
            role: req.session.role
        });
    } else {
        res.status(401).json({
            success: false,
            message: "Not authenticated"
        });
    }
})

// Signup
app.post('/api/signup', async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;

        // Check for valid username
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists'
            });
        }

        // Create new user
        const newUser = new User({
            username: username,
            password: password,
            role: 'user'
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                userId: newUser._id,
                username: newUser.username,
                role: newUser.role,
                permission: newUser.role === "admin" ? 7 : 1
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user'
        });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check for password
        if (user.password !== password) {
            return res.status(401).json({
                success: false,
                message: 'Wrong password'
            });
        }

        req.session.userId = user._id;
        req.session.username = user.username;
        req.session.role = user.role;

        console.log('Session created successfully for user:', username);

        res.status(200).json({
            success: true,
            user: {
                userId: user._id,
                username,
                role: user.role,
                permission: user.role === 'admin' ? 7 : 1
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    // Destroy session
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        }

        // Clear session cookie
        res.clearCookie('connect.sid', {
            path: '/'
        });

        res.json({
            success: true,
            message: 'Logged out'
        });
    });
});



// CRUD on data - Events and Locations
// Fetch data
app.get('/api/fetchEvents', (req, res) => {
    console.log("Returning venue event pairs...");
    console.log(JSON.stringify(req.venueEventsPairs));

    res.setHeader('Content-Type', 'application/json');
    res.json(req.venueEventsPairs);
})


app.post('/api/updateLocation', async (req, res) => {
    console.log("Trying to write 10 random venues to db...")

    try {
        for (const loc of req.body.selectedVenues) {
            console.log(loc);
            const newLocation = new Location({
                namee: loc.venueNameE,
                namec: loc.venueNameC || '',
                latitude: loc.latitude || '',
                longitude: loc.longitude || ''
            });
            await newLocation.save();
        }

        res.status(201).send("Successfully updated venues");

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Failed to update venues");
    }
});

