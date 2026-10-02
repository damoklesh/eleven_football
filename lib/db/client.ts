import {drizzle} from 'drizzle-orm/node-postgres';
import {Pool} from 'pg';
import * as schema from './schema';
const connectionString=process.env.DATABASE_URL;
const pool=connectionString?new Pool({connectionString,max:3}):undefined;
export const db=pool?drizzle(pool,{schema}):undefined;
