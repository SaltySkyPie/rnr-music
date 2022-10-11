import NextAuth from "next-auth"
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import InstagramProvider from "next-auth/providers/instagram"
import { NextAuthOptions } from "next-auth/core/types";

export const authOptions = {
    secret: process.env.SECRET,
    session: {
        maxAge: 30 * 24 * 60 * 60,
        updateAge: 60 * 60
    },
    theme: {
        colorScheme: "light", // "auto" | "dark" | "light"
        logo: "/logo.png" // Absolute URL to image
    },
    providers: [
        FacebookProvider({
            clientId: process.env.FB_CLIENT_ID as string,
            clientSecret: process.env.FB_SECRET as string
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_SECRET as string,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),
        InstagramProvider({
            clientId: process.env.IG_CLIENT_ID as string,
            clientSecret: process.env.IG_SECRET as string
        })
    ],
} as NextAuthOptions;
export default NextAuth(authOptions)