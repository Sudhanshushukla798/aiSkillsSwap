// aiSkillSwap - MVP v2 Codebase (Supabase + Auth + GPT-4 + Email Matching)

// 1. Initialize Next.js App with Tailwind CSS
// Run in terminal:
// npx create-next-app@latest aiSkillSwap --typescript --tailwind

// 2. Install Supabase client, OpenAI SDK & EmailJS (optional for emails)
// npm install @supabase/supabase-js openai emailjs-com

// 3. lib/supabaseClient.ts - Supabase client setup
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 4. pages/index.tsx - Landing Page
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <h1 className="text-5xl font-bold text-blue-700 mb-4">aiSkillSwap</h1>
      <p className="text-xl text-gray-600 mb-8 text-center">
        Learn any skill by teaching one. AI-powered matchmaking for skill sharing.
      </p>
      <Link href="/join">
        <button className="bg-blue-600 text-white px-6 py-3 rounded-xl text-lg hover:bg-blue-700">
          Join Now
        </button>
      </Link>
    </main>
  );
}

// 5. pages/join.tsx - Skill Input Form Page
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Configuration, OpenAIApi } from 'openai';
import emailjs from 'emailjs-com';

const openai = new OpenAIApi(
  new Configuration({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY })
);

export default function Join() {
  const [teach, setTeach] = useState('');
  const [learn, setLearn] = useState('');
  const [email, setEmail] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert('Login error');
    else alert('Check your email for login link');
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const { data, error } = await supabase.from('users').insert([
      { email, teach_skill: teach, learn_skill: learn }
    ]);

    if (error) {
      alert('Error saving data.');
      console.error(error);
    } else {
      const { data: allUsers } = await supabase.from('users').select('*');
      const matches = await matchSkills(allUsers, teach, learn);

      // Send Email to user
      await emailjs.send(
        'Sudhanshu123$$',
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
        {
          user_email: email,
          matches: matches
        },
        process.env.NEXT_PUBLIC_EMAILJS_USER_ID!
      );

      alert('Match suggestions sent to your email!');
    }
  };

  const matchSkills = async (users: any[], teach: string, learn: string) => {
    const prompt = `You are a skill matcher. Given a user who can teach '${teach}' and wants to learn '${learn}', suggest matches from this list: ${JSON.stringify(users)}. Suggest top 3.`;
    const res = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    return res.data.choices[0].message?.content;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      <h2 className="text-3xl font-semibold mb-6">Tell us your skills</h2>
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        {!user ? (
          <>
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-xl"
              required
            />
            <button
              type="button"
              onClick={handleLogin}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl text-lg hover:bg-blue-700 w-full"
            >
              Login
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Skill you can teach"
              value={teach}
              onChange={(e) => setTeach(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-xl"
              required
            />
            <input
              type="text"
              placeholder="Skill you want to learn"
              value={learn}
              onChange={(e) => setLearn(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-xl"
              required
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-3 rounded-xl text-lg hover:bg-blue-700 w-full"
            >
              Submit
            </button>
          </>
        )}
      </form>
    </div>
  );
}
