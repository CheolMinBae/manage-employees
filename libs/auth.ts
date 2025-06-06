import NextAuth, { NextAuthOptions, Session } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import dbConnect from '@libs/db';
import SignupUser from '@models/SignupUser';
import { redirect } from 'next/navigation';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      position?: string;
      status?: string;
    }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        await dbConnect();
        const user = await SignupUser.findOne({ email: credentials?.email });
        if (!user || !user.password) return null;

        let isValid = false;
        
        // 해시된 비밀번호인지 확인 (bcrypt 해시는 $2a$ 또는 $2b$로 시작)
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
          // 해시된 비밀번호와 비교
          isValid = await compare(credentials!.password, user.password);
        } else {
          // 평문 비밀번호와 직접 비교
          isValid = credentials!.password === user.password;
        }
        
        return isValid ? user : null;
      },
    }),
  ],
  pages: {
  signIn: '/authentication/login',
    newUser: '/authentication/register',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        await dbConnect();
        const existing = await SignupUser.findOne({ email: user.email });

        if (!existing) {
          // 사용자가 존재하지 않으면 signIn을 거부하고 register 페이지로 리다이렉트
          return `/authentication/register?email=${encodeURIComponent(user.email || '')}&name=${encodeURIComponent(user.name || '')}`;
        }
        
        // 사용자가 존재하면 로그인 허용
        return true;
      }

      return true;
    },
    async session({ session }) {
      await dbConnect();
      if (!session.user?.email) return session;
      
      const user = await SignupUser.findOne({ email: session.user.email });
      if (user) {
        session.user.id = user._id.toString();
        session.user.position = user.position;
        session.user.status = user.status;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt' as const,
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
