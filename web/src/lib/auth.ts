import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import { MongoClient } from "mongodb"

const client = new MongoClient(process.env.MONGODB_URI!)
const clientPromise = client.connect()

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async session({ session, user }) {
      // Enviar propiedades al cliente
      if (session?.user) {
        session.user.id = user.id
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // Permitir solo usuarios con email verificado
      if (account?.provider === "google") {
        return profile?.email_verified === true
      }
      return true
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: "database",
  },
}
