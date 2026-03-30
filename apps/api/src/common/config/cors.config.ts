const ALLOWED_ORIGINS = [
  // Local development
  "http://localhost:3000",

  // Production — add your deployed frontend URLs here
  "https://beamish-snickerdoodle-c0ed6e.netlify.app"
];

export const corsConfig = {
  origin: ALLOWED_ORIGINS,
  credentials: true,
};
