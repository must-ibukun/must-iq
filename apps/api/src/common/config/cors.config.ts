const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://beamish-snickerdoodle-c0ed6e.netlify.app"
];

export const corsConfig = {
  origin: ALLOWED_ORIGINS,
  credentials: true,
};
