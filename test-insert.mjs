import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('users').insert({
    id: 'test-id',
    email: 'test@test.com',
    password_hash: 'test',
    name: 'test',
    district: 'test'
  });
  if (error) {
    console.error('Error inserting user:', JSON.stringify(error, null, 2));
  } else {
    console.log('Successfully inserted user.');
  }
}

test();
