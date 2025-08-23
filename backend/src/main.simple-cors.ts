// TEMPORARY FIX: Simple CORS configuration for debugging
// Replace the CORS section in main.ts with this if needed:

app.enableCors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
});

// NOTE: This is NOT secure for production! 
// Only use this temporarily to verify CORS is the issue.
// Then update with your actual frontend URLs.