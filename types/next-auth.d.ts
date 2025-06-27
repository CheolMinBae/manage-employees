import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
      position?: string
      userType?: string[]
      corp?: string
      eid?: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    position: string
    userType?: string[]
    corp?: string
    eid?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    position?: string
    userType?: string[]
    corp?: string
    eid?: string
  }
} 