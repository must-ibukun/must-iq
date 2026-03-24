import 'dotenv/config';
import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: 'libs/db/src/prisma/schema.prisma'
});
