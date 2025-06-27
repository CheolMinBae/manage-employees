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

        console.log('Raw user from DB:', user);
        console.log('user.userType:', user.userType);
        console.log('typeof user.userType:', typeof user.userType);
        console.log('Array.isArray(user.userType):', Array.isArray(user.userType));

        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Invalid password');
        }

        console.log('User from DB:', {
          id: (user._id as any).toString(),
          email: user.email,
          name: user.name,
          position: user.position,
          userType: user.userType,
          corp: user.corp,
          eid: user.eid,
        });

        // 임시 테스트용: userType이 없으면 position에 따라 기본값 설정
        let defaultUserType: string[] = [];
        if (!user.userType || user.userType.length === 0) {
          if (user.position === 'admin') {
            defaultUserType = ['admin', 'manager'];
          } else {
            defaultUserType = ['employee'];
          }
        }
        console.log('Default userType:', user.userType);
        return {
          id: (user._id as any).toString(),
          email: user.email,
          name: user.name,
          position: user.position,
          userType: user.userType && user.userType.length > 0 ? user.userType : defaultUserType,
          corp: user.corp,
          eid: user.eid,
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 60, // 1분으로 설정하여 강제 갱신
  },
  jwt: {
    maxAge: 60, // 1분으로 설정하여 강제 갱신
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        console.log('JWT callback - user:', user);
        token.position = user.position;
        token.userType = user.userType;
        token.corp = user.corp;
        token.eid = user.eid;
        token.timestamp = Date.now();
        console.log('JWT callback - token after update:', token);
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      console.log('Session callback - token:', token);
      if (token && session.user) {
        session.user.position = token.position as string | undefined;
        session.user.userType = token.userType as string[] | undefined;
        session.user.corp = token.corp as string | undefined;
        session.user.eid = token.eid as string | undefined;
        session.user.id = token.sub as string | undefined;
        console.log('Session callback - session.user after update:', session.user);
      }
      return session;
    }
  }
}; 