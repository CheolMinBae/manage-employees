import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import SignupUser from '@models/SignupUser';
import dbConnect from '@libs/db';
import { compare } from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }

        await dbConnect();

        const user = await SignupUser.findOne({ email: credentials.email });

        if (!user) {
          throw new Error('No user found');
        }

        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          position: user.position,
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.position = user.position;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.position = token.position;
      }
      return session;
    }
  }
}; 