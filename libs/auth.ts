import { NextAuthOptions, Session } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import dbConnect from '@libs/db';
import SignupUser from '@models/SignupUser';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      position?: string;
      userType?: string[];
      status?: string;
    }
  }
  
  interface JWT {
    id?: string;
    position?: string;
    userType?: string[];
    status?: string;
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
        try {
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
          
          if (isValid) {
            return {
              id: (user._id as any).toString(),
              email: user.email,
              name: user.name,
              position: user.position,
              userType: user.userType,
              status: user.status,
            };
          }
          
          return null;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
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
        try {
          await dbConnect();
          const existing = await SignupUser.findOne({ email: user.email });

          if (!existing) {
            // 사용자가 존재하지 않으면 signIn을 거부하고 register 페이지로 리다이렉트
            return `/authentication/register?email=${encodeURIComponent(user.email || '')}&name=${encodeURIComponent(user.name || '')}`;
          }
          
          // 사용자가 존재하면 로그인 허용
          return true;
        } catch (error) {
          console.error('SignIn error:', error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      // 사용자가 로그인할 때 토큰에 추가 정보 저장
      if (user) {
        token.id = user.id;
        token.position = (user as any).position;
        token.userType = (user as any).userType;
        token.status = (user as any).status;
      }
      return token;
    },
    async session({ session, token }) {
      try {
        // JWT 토큰에서 세션으로 정보 전달
        if (token) {
          session.user.id = token.id as string;
          session.user.position = token.position as string;
          session.user.userType = token.userType as string[];
          session.user.status = token.status as string;
        }

        // Google OAuth의 경우 DB에서 최신 정보 가져오기
        if (session.user?.email && !token.id) {
          await dbConnect();
          const user = await SignupUser.findOne({ email: session.user.email });
          if (user) {
            session.user.id = (user._id as any).toString();
            session.user.position = user.position;
            session.user.userType = user.userType;
            session.user.status = user.status;
          }
        }
        
        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        return session;
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
};
